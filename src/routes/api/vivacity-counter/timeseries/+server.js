import { json } from '@sveltejs/kit';
import { VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';
import {
	aggregateVivacityData,
	mergeCountlineResponseObjects
} from '$lib/services/vivacity-counter/vivacity-countline-utils.js';
import {
	readVivacitySensorTimeseriesSnapshot,
	sameCountlineSet,
	trimDailyToLastDays
} from '$lib/server/vivacity-snapshot-merge.js';

const DAILY_COUNTLINE_CHUNK = 3;
const DAILY_CHUNK_FETCH_CONCURRENCY = 3;
const DAILY_SPAN_DAYS = 365;
/** Full fetch when no snapshot */
const HOURLY_SPAN_FULL_DAYS = 30;
/** With snapshot: hourly chart from Vivacity for this many days; daily stays on static JSON */
const HOURLY_SPAN_SNAPSHOT_DAYS = 30;
const TRAFFIC_SHARE_WINDOW_DAYS = 30;

function chunkArray(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) {
		out.push(arr.slice(i, i + size));
	}
	return out;
}

export async function POST({ request }) {
	try {
		const origin = new URL(request.url).origin;
		const body = await request.json();
		const { siteId, sensorId: sensorIdRaw } = body;

		if (!siteId) {
			return json({ error: 'Site ID (countline ID or array of IDs) is required' }, { status: 400 });
		}

		const countlineIds = Array.isArray(siteId) ? siteId : [siteId];
		const sensorId =
			sensorIdRaw != null && sensorIdRaw !== '' && String(sensorIdRaw) !== 'undefined'
				? String(sensorIdRaw)
				: null;

		const vivacityApiKey = VIVACITY_API || env.VIVACITY_API || process.env.VIVACITY_API;

		if (!vivacityApiKey) {
			return json({ error: 'VIVACITY_API not configured' }, { status: 500 });
		}

		function formatDateForVivacity(date) {
			return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
		}

		function vivacityFetchOptions(timeoutMs) {
			const base = {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'x-vivacity-api-key': vivacityApiKey
				}
			};
			if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
				return { ...base, signal: AbortSignal.timeout(timeoutMs) };
			}
			return base;
		}

		const snapshot = await readVivacitySensorTimeseriesSnapshot(process.cwd(), fetch, origin);
		const snapBlock = sensorId && snapshot?.sensors?.[sensorId] ? snapshot.sensors[sensorId] : null;
		const useSnapshot =
			Boolean(snapBlock) &&
			sameCountlineSet(snapBlock.countlineIds || [], countlineIds) &&
			Array.isArray(snapBlock.dailyAggregated) &&
			snapBlock.dailyAggregated.length > 0;

		if (sensorId && snapshot && !snapBlock) {
			console.info('[vivacity-timeseries] no snapshot block for sensor', sensorId);
		} else if (sensorId && snapBlock && !useSnapshot) {
			console.info('[vivacity-timeseries] snapshot skipped (countline mismatch or empty daily)', {
				sensorId
			});
		}

		const hourlySpanDays = useSnapshot ? HOURLY_SPAN_SNAPSHOT_DAYS : HOURLY_SPAN_FULL_DAYS;

		const to = new Date();
		to.setMinutes(0, 0, 0, 0);

		const fromHourly = new Date(to.getTime() - hourlySpanDays * 24 * 60 * 60 * 1000);
		fromHourly.setMinutes(0, 0, 0, 0);

		const to_today = new Date();
		to_today.setUTCHours(0, 0, 0, 0);

		const fromDaily = new Date(to.getTime() - DAILY_SPAN_DAYS * 24 * 60 * 60 * 1000);
		fromDaily.setUTCHours(0, 0, 0, 0);

		const fromHourlyISO = formatDateForVivacity(fromHourly);
		const fromDailyISO = formatDateForVivacity(fromDaily);
		const toISO = formatDateForVivacity(to);
		const to_todayISO = formatDateForVivacity(to_today);
		const fromShareISO = formatDateForVivacity(new Date(to.getTime() - TRAFFIC_SHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000));
		const toShareISO = toISO;

		const countlineIdsParam = countlineIds.join(',');
		const urlHourly = `https://api.vivacitylabs.com/countline/counts?countline_ids=${countlineIdsParam}&from=${fromHourlyISO}&to=${toISO}&time_bucket=1h&fill_zeros=true`;

		console.info('[vivacity-timeseries] POST', {
			sensorId,
			useSnapshot,
			countlines: countlineIds.length,
			idsSample: countlineIds.slice(0, 4),
			urlHourlyLen: urlHourly.length,
			hourlySpanDays,
			dailyMode: useSnapshot ? 'snapshot-only' : 'full365',
			fromHourlyISO,
			fromDailyISO,
			toISO,
			to_todayISO
		});

		/**
		 * @param {string} url
		 * @param {string} label
		 * @param {RequestInit} fetchOpts
		 */
		async function fetchVivacityJson(url, label, fetchOpts) {
			const response = await fetch(url, fetchOpts);
			const text = await response.text();
			if (!response.ok) {
				console.error(`[vivacity-timeseries] ${label} HTTP ${response.status}`, {
					urlLen: url.length,
					bodyPreview: text.slice(0, 600)
				});
				throw new Error(`${label}: Vivacity HTTP ${response.status} — ${text.slice(0, 180)}`);
			}
			try {
				return JSON.parse(text);
			} catch (e) {
				console.error(`[vivacity-timeseries] ${label} JSON parse error`, text.slice(0, 400));
				throw e;
			}
		}

		/**
		 * @param {string[]} ids
		 * @param {string} fromIso
		 * @param {string} toIso
		 */
		async function fetchDailyMergedByChunks(ids, fromIso, toIso, label = 'daily(24h)') {
			const chunks = chunkArray(ids, DAILY_COUNTLINE_CHUNK);
			if (chunks.length === 1) {
				const param = chunks[0].join(',');
				const url = `https://api.vivacitylabs.com/countline/counts?countline_ids=${param}&from=${fromIso}&to=${toIso}&time_bucket=24h`;
				console.info(`[vivacity-timeseries] ${label} single chunk`, {
					countlines: ids.length,
					urlLen: url.length,
					fromIso,
					toIso
				});
				return fetchVivacityJson(url, label, vivacityFetchOptions(240_000));
			}

			console.info(`[vivacity-timeseries] ${label} chunked`, {
				countlines: ids.length,
				chunks: chunks.length,
				concurrency: DAILY_CHUNK_FETCH_CONCURRENCY,
				fromIso,
				toIso
			});

			const chunkResults = [];
			for (let b = 0; b < chunks.length; b += DAILY_CHUNK_FETCH_CONCURRENCY) {
				const slice = chunks.slice(b, b + DAILY_CHUNK_FETCH_CONCURRENCY);
				const batch = await Promise.all(
					slice.map(async (idChunk, k) => {
						const idx = b + k + 1;
						const param = idChunk.join(',');
						const url = `https://api.vivacitylabs.com/countline/counts?countline_ids=${param}&from=${fromIso}&to=${toIso}&time_bucket=24h`;
						return fetchVivacityJson(
							url,
							`${label} chunk ${idx}/${chunks.length}`,
							vivacityFetchOptions(240_000)
						);
					})
				);
				chunkResults.push(...batch);
			}
			return mergeCountlineResponseObjects(chunkResults);
		}

		/**
		 * @param {Record<string, unknown>} rawByCountline
		 */
		function summarizeTrafficShare30d(rawByCountline) {
			let pedestrian = 0;
			let cyclist = 0;
			let totalTraffic = 0;
			for (const rows of Object.values(rawByCountline || {})) {
				if (!Array.isArray(rows)) continue;
				for (const row of rows) {
					for (const direction of ['clockwise', 'anti_clockwise']) {
						const d = row?.[direction];
						if (!d || typeof d !== 'object') continue;
						for (const [k, v] of Object.entries(d)) {
							const n = Number(v) || 0;
							totalTraffic += n;
							if (k === 'pedestrian' || k === 'jogger') pedestrian += n;
							if (k === 'cyclist' || k === 'cargo_bicycle' || k === 'rental_bicycle') cyclist += n;
						}
					}
				}
			}
			return {
				pedestrian: Math.round(pedestrian),
				cyclist: Math.round(cyclist),
				totalTraffic: Math.round(totalTraffic)
			};
		}

		try {
			const hourlyRaw = await fetchVivacityJson(
				urlHourly,
				'hourly(1h)',
				vivacityFetchOptions(useSnapshot ? 90_000 : 120_000)
			);

			/** @type {unknown[]} */
			let aggregatedDaily;
			let trafficShare30d = summarizeTrafficShare30d(hourlyRaw);

			if (useSnapshot && snapBlock) {
				const snapRows = snapBlock.dailyAggregated;
				aggregatedDaily = trimDailyToLastDays([...snapRows], DAILY_SPAN_DAYS + 14);
				console.info('[vivacity-timeseries] daily from static snapshot only (no Vivacity 24h)', {
					rows: Array.isArray(aggregatedDaily) ? aggregatedDaily.length : 0
				});
			} else {
				let dailyRaw = {};
				try {
					dailyRaw = await fetchDailyMergedByChunks(countlineIds, fromDailyISO, to_todayISO);
					console.info('[vivacity-timeseries] daily OK', {
						mergedKeys:
							dailyRaw && typeof dailyRaw === 'object' && !Array.isArray(dailyRaw)
								? Object.keys(dailyRaw).length
								: 0
					});
				} catch (dailyErr) {
					console.warn(
						'[vivacity-timeseries] daily failed; returning hourly-only (weekly/monthly empty)',
						dailyErr?.message || dailyErr
					);
				}
				aggregatedDaily = aggregateVivacityData(dailyRaw);
			}

			if (!trafficShare30d?.totalTraffic) {
				try {
					const shareRawDaily = await fetchDailyMergedByChunks(
						countlineIds,
						fromShareISO,
						toShareISO,
						'daily(24h) share-all-classes'
					);
					trafficShare30d = summarizeTrafficShare30d(shareRawDaily);
				} catch (shareErr) {
					console.warn(
						'[vivacity-timeseries] share-all-classes daily fallback failed; using client fallback',
						shareErr?.message || shareErr
					);
				}
			}

			const aggregatedHourly = aggregateVivacityData(hourlyRaw);

			const dailyFromForMeta =
				Array.isArray(aggregatedDaily) && aggregatedDaily.length > 0
					? /** @type {{from?:string}} */ (aggregatedDaily[0]).from
					: fromDailyISO;

			console.info('[vivacity-timeseries] OK', {
				useSnapshot,
				hourlyRows: Array.isArray(aggregatedHourly) ? aggregatedHourly.length : null,
				dailyRows: Array.isArray(aggregatedDaily) ? aggregatedDaily.length : null
			});

			const timeSeriesData = {
				hourly_7days: aggregatedHourly,
				daily_3months: aggregatedDaily,
				weekly_year: null,
				monthly_3years: null,
				countlineIds: countlineIds,
				trafficShare30d,
				dateRange: {
					hourly: {
						from: fromHourlyISO,
						to: toISO
					},
					daily: {
						from: dailyFromForMeta || fromDailyISO,
						to: toISO
					}
				}
			};

			return json(timeSeriesData);
		} catch (error) {
			console.error('[vivacity-timeseries] fatal', error?.message || error);
			return json(
				{
					error: 'Failed to fetch Vivacity data',
					message: error?.message || String(error)
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('[vivacity-timeseries] bad request / parse', error?.message || error);
		return json({ error: error.message }, { status: 500 });
	}
}
