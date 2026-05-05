import { json } from '@sveltejs/kit';
import { VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';
import {
	aggregateVivacityData,
	mergeCountlineResponseObjects,
	sumModeFromAggregatedDailyRows,
	sumModeFromCountlineHourlyRows
} from '$lib/services/vivacity-counter/vivacity-countline-utils.js';
import {
	getLastMonthKeyInStore,
	listMissingCompleteMonthsAfter,
	mergeMonthsIntoStore,
	networkMonthlyTotalsLast12FromStore,
	readMonthlyHistoricalStore,
	writeMonthlyHistoricalStore
} from '$lib/server/vivacity-monthly-historical-store.js';
import {
	logVivacityCitywideRequest,
	logVivacityCitywideResult
} from '$lib/server/vivacity-load-diagnostics.js';
import { withVivacityCountsClasses } from '$lib/server/vivacity-counts-classes.js';
import { tryBuildCitywideFromSnapshot } from '$lib/server/vivacity-citywide-from-snapshot.js';

/**
 * Citywide: short 24h window for daily chart + KPIs; monthly network chart reads
 * static/data/vivacity-citywide-monthly-historical.json and only calls Vivacity for missing **complete** UTC months.
 */
const CHUNK_SIZE = 55;
/** Stay under typical proxy limits; single round-trip when possible */
const MAX_COUNTS_URL_CHARS = 7800;
/** Parallel chunk fetches per batch (not all-at-once — avoids undici "terminated") */
const CHUNK_FETCH_CONCURRENCY = 4;
/** Daily series + KPI window — small payload */
const DAILY_CHART_LOOKBACK_DAYS = 35;
/** When catching up historical months, fetch this many month-ranges in parallel */
const MONTHLY_CATCHUP_PARALLEL = 3;

const LOG_PREFIX = '[vivacity-citywide]';

function formatDateForVivacity(date) {
	return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function chunkArray(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) {
		out.push(arr.slice(i, i + size));
	}
	return out;
}

function filterDailyRowsLast30Utc(rows, end0UtcMs) {
	if (!Array.isArray(rows)) return [];
	const dayMs = 86400000;
	const start30 = end0UtcMs - 30 * dayMs;
	return rows.filter((r) => {
		if (!r?.from) return false;
		const t = new Date(r.from).getTime();
		return t >= start30 && t < end0UtcMs;
	});
}

function buildCountsBySensor(mergedDailyRecent, sensors, end0UtcMs) {
	const pedByCl = {};
	const bikeByCl = {};
	for (const [clid, rows] of Object.entries(mergedDailyRecent || {})) {
		if (!Array.isArray(rows)) continue;
		const filtered = filterDailyRowsLast30Utc(rows, end0UtcMs);
		pedByCl[clid] = sumModeFromCountlineHourlyRows(filtered, 'pedestrian');
		bikeByCl[clid] = sumModeFromCountlineHourlyRows(filtered, 'bike');
	}

	const list = sensors.map((s) => {
		let pedestrian = 0;
		let bike = 0;
		for (const clid of s.countlineIds || []) {
			pedestrian += pedByCl[clid] || 0;
			bike += bikeByCl[clid] || 0;
		}
		return {
			id: s.id,
			name: s.name,
			pedestrian: Math.round(pedestrian),
			bike: Math.round(bike)
		};
	});

	return list
		.filter((x) => x.pedestrian > 0 || x.bike > 0)
		.sort((a, b) => b.pedestrian + b.bike - (a.pedestrian + a.bike));
}

function bodySnippet(text, max = 600) {
	return text.replace(/\s+/g, ' ').slice(0, max);
}

async function readVivacityJson(response, label, urlLogged = '') {
	const text = await response.text();
	const status = response.status;
	const ct = response.headers.get('content-type') || '(no content-type)';
	const len = text.length;
	const logCtx = { label, status, contentType: ct, bodyLength: len };

	if (!response.ok) {
		console.error(LOG_PREFIX, 'response not ok', logCtx, urlLogged.slice(0, 120));
		console.error(LOG_PREFIX, 'body snippet:', bodySnippet(text));
		throw new Error(`${label} HTTP ${status}: ${bodySnippet(text, 280)}`);
	}

	const trimmed = text.trim();
	if (!trimmed) {
		console.error(LOG_PREFIX, 'empty body', logCtx);
		throw new Error(`${label}: empty response body`);
	}

	try {
		return JSON.parse(text);
	} catch (err) {
		console.error(LOG_PREFIX, 'JSON.parse failed', logCtx, err?.message);
		console.error(LOG_PREFIX, 'body snippet:', bodySnippet(text));
		throw new Error(`${label}: invalid JSON — ${bodySnippet(text, 280)}`);
	}
}

export async function POST({ request }) {
	try {
		const body = await request.json();
		const sensors = body?.sensors;

		if (!Array.isArray(sensors) || sensors.length === 0) {
			return json({ error: 'sensors array is required' }, { status: 400 });
		}

		const normalizedSensors = sensors.map((s) => ({
			id: String(s.id),
			name: s.name || `Sensor ${s.id}`,
			countlineIds: Array.isArray(s.countlineIds) ? s.countlineIds.map(String).filter(Boolean) : []
		}));

		const emptyCl = normalizedSensors.filter((s) => !s.countlineIds.length).length;
		logVivacityCitywideRequest({
			incomingSensorCount: sensors.length,
			normalizedSensorCount: normalizedSensors.length,
			sensorsWithZeroCountlines: emptyCl,
			sample: normalizedSensors.slice(0, 4).map((s) => ({
				id: s.id,
				countlineN: s.countlineIds.length,
				firstIds: s.countlineIds.slice(0, 4)
			}))
		});

		const allIds = [...new Set(normalizedSensors.flatMap((s) => s.countlineIds))];
		if (allIds.length === 0) {
			console.warn(LOG_PREFIX, 'rejecting citywide: zero countline IDs after normalize', {
				sensorCount: normalizedSensors.length
			});
			return json({ error: 'No countline IDs in sensors payload' }, { status: 400 });
		}

		const fromSnapshot = await tryBuildCitywideFromSnapshot(normalizedSensors);
		if (fromSnapshot) {
			console.info(LOG_PREFIX, 'serving citywide from static snapshot + monthly JSON (no Vivacity counts)');
			logVivacityCitywideResult({
				dataSource: 'snapshot',
				distinctCountlineIds: allIds.length,
				mergedResponseCountlineKeys: 0,
				dailyAggregatedRowCount: fromSnapshot.dailyAggregated?.length ?? 0,
				countsBySensorRows: fromSnapshot.countsBySensor?.length ?? 0,
				monthlyChartMonths: fromSnapshot.networkMonthlyTotals?.length ?? 0,
				monthlyCatchUpQueried: 0
			});
			return json(fromSnapshot);
		}

		const vivacityApiKey = VIVACITY_API || env.VIVACITY_API || process.env.VIVACITY_API;
		if (!vivacityApiKey) {
			return json({ error: 'VIVACITY_API not configured' }, { status: 500 });
		}

		const options = {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'x-vivacity-api-key': vivacityApiKey
			}
		};

		const toDay = new Date();
		toDay.setUTCHours(0, 0, 0, 0);
		const dayMs = 86400000;
		const fromDaily = new Date(toDay.getTime() - DAILY_CHART_LOOKBACK_DAYS * dayMs);

		const fromDailyISO = formatDateForVivacity(fromDaily);
		const toDayISO = formatDateForVivacity(toDay);

		function countsUrl(idsParam, fromISO, toISO, timeBucket) {
			return withVivacityCountsClasses(
				`https://api.vivacitylabs.com/countline/counts?countline_ids=${idsParam}&from=${fromISO}&to=${toISO}&time_bucket=${timeBucket}`
			);
		}

		async function fetchMergedCountlines(fromISO, toISO, timeBucket, logTag) {
			const buildUrl = (idsParam) => countsUrl(idsParam, fromISO, toISO, timeBucket);
			const allIdsParam = allIds.join(',');
			const singleUrl = buildUrl(allIdsParam);

			if (singleUrl.length <= MAX_COUNTS_URL_CHARS) {
				console.info(LOG_PREFIX, `${logTag} single`, {
					countlines: allIds.length,
					urlLen: singleUrl.length,
					timeBucket,
					from: fromISO,
					to: toISO
				});
				const res = await fetch(singleUrl, options);
				return readVivacityJson(res, `Vivacity ${logTag} (single)`, singleUrl);
			}

			const chunks = chunkArray(allIds, CHUNK_SIZE);
			console.info(LOG_PREFIX, `${logTag} chunked`, {
				countlines: allIds.length,
				chunks: chunks.length,
				chunkSize: CHUNK_SIZE,
				concurrency: CHUNK_FETCH_CONCURRENCY,
				timeBucket,
				from: fromISO,
				to: toISO
			});

			const chunkResults = [];
			for (let b = 0; b < chunks.length; b += CHUNK_FETCH_CONCURRENCY) {
				const slice = chunks.slice(b, b + CHUNK_FETCH_CONCURRENCY);
				const batch = await Promise.all(
					slice.map(async (ids, k) => {
						const idx = b + k + 1;
						const param = ids.join(',');
						const url = buildUrl(param);
						const res = await fetch(url, options);
						return readVivacityJson(res, `Vivacity ${logTag} chunk ${idx}/${chunks.length}`, url);
					})
				);
				chunkResults.push(...batch);
			}
			return mergeCountlineResponseObjects(chunkResults);
		}

		const mergedDailyRecent = await fetchMergedCountlines(
			fromDailyISO,
			toDayISO,
			'24h',
			'daily citywide'
		);

		const mergedKeyCount =
			mergedDailyRecent && typeof mergedDailyRecent === 'object' && !Array.isArray(mergedDailyRecent)
				? Object.keys(mergedDailyRecent).length
				: 0;
		if (mergedKeyCount === 0) {
			console.warn(LOG_PREFIX, 'Vivacity daily merge object has zero countline keys — upstream counts may be empty for this window', {
				distinctCountlineIdsRequested: allIds.length,
				from: fromDailyISO,
				to: toDayISO
			});
		}

		let historicalMonthlyStore = await readMonthlyHistoricalStore();
		const lastMonthKeyBefore = getLastMonthKeyInStore(historicalMonthlyStore.months);
		const missingMonths = listMissingCompleteMonthsAfter(lastMonthKeyBefore, toDay);

		if (missingMonths.length > 0) {
			console.info(LOG_PREFIX, 'monthly historical catch-up', {
				lastMonthKeyBefore,
				fetching: missingMonths.map((m) => m.monthKey)
			});
			/** @type {Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>} */
			const appended = [];
			for (let i = 0; i < missingMonths.length; i += MONTHLY_CATCHUP_PARALLEL) {
				const slice = missingMonths.slice(i, i + MONTHLY_CATCHUP_PARALLEL);
				const batch = await Promise.all(
					slice.map(async (spec) => {
						try {
							const merged = await fetchMergedCountlines(
								spec.fromISO,
								spec.toISO,
								'24h',
								`catch-up month ${spec.monthKey}`
							);
							const agg = aggregateVivacityData(merged);
							return {
								monthKey: spec.monthKey,
								label: spec.label,
								pedestrian: Math.round(sumModeFromAggregatedDailyRows(agg, 'pedestrian')),
								bike: Math.round(sumModeFromAggregatedDailyRows(agg, 'bike'))
							};
						} catch (err) {
							console.warn(LOG_PREFIX, `catch-up ${spec.monthKey} failed`, err?.message);
							return null;
						}
					})
				);
				for (const row of batch) {
					if (row) appended.push(row);
				}
			}
			if (appended.length > 0) {
				historicalMonthlyStore = mergeMonthsIntoStore(historicalMonthlyStore, appended);
				try {
					await writeMonthlyHistoricalStore(historicalMonthlyStore);
				} catch (werr) {
					console.warn(LOG_PREFIX, 'could not write monthly historical JSON', werr?.message);
				}
			}
		}

		const networkMonthlyTotals = networkMonthlyTotalsLast12FromStore(historicalMonthlyStore);
		const lastMonthKeyAfter = getLastMonthKeyInStore(historicalMonthlyStore.months);

		const aggregatedDaily = aggregateVivacityData(mergedDailyRecent);
		/** Empty `{}` or other non-array shapes happen when Vivacity returns no countline buckets — UI needs `[]` for KPI/chart code. */
		const dailyAggregated = Array.isArray(aggregatedDaily) ? aggregatedDaily : [];

		const end0UtcMs = toDay.getTime();
		const countsBySensor = buildCountsBySensor(mergedDailyRecent, normalizedSensors, end0UtcMs);

		logVivacityCitywideResult({
			distinctCountlineIds: allIds.length,
			mergedResponseCountlineKeys: mergedKeyCount,
			dailyAggregatedRowCount: dailyAggregated.length,
			countsBySensorRows: countsBySensor.length,
			monthlyChartMonths: networkMonthlyTotals?.length ?? 0,
			monthlyCatchUpQueried: missingMonths.length
		});

		console.info(LOG_PREFIX, 'done', {
			countlines: allIds.length,
			monthlyChartMonths: networkMonthlyTotals?.length ?? 0,
			monthlyCatchUpFetched: missingMonths.length
		});

		return json({
			dailyAggregated,
			networkMonthlyTotals,
			countsBySensor,
			sensors: normalizedSensors,
			dateRange: {
				daily: { from: fromDailyISO, to: toDayISO, timeBucket: '24h' },
				monthly: {
					source: 'static-json',
					lastMonthKey: lastMonthKeyAfter,
					catchUpMonthsQueried: missingMonths.length
				}
			}
		});
	} catch (error) {
		console.error(LOG_PREFIX, 'handler error', error?.message || error, error?.stack);
		return json(
			{
				error: 'Failed to fetch citywide Vivacity data',
				message: error.message
			},
			{ status: 500 }
		);
	}
}
