import { json } from '@sveltejs/kit';
import { VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { aggregateVivacityData } from '$lib/services/vivacity-counter/vivacity-countline-utils.js';
import {
	readVivacityWeeklySnapshot,
	getVivacitySnapshotSensorBlock
} from '$lib/server/vivacity-weekly-snapshot.js';
import { sameCountlineSet } from '$lib/server/vivacity-snapshot-merge.js';

const HOURLY_SPAN_DAYS = 30;

/**
 * POST { siteId: countlineId[], sensorId }
 * - Live API: hourly chart + traffic-share KPIs only
 * - Static snapshot: weekly rows for weekly/monthly charts
 */
export async function POST({ request }) {
	try {
		const origin = new URL(request.url).origin;
		const body = await request.json();
		const { siteId, sensorId: sensorIdRaw } = body;

		if (!siteId) {
			return json({ error: 'Site ID (countline ID or array of IDs) is required' }, { status: 400 });
		}

		const countlineIds = Array.isArray(siteId) ? siteId.map(String) : [String(siteId)];
		const sensorId =
			sensorIdRaw != null && sensorIdRaw !== '' && String(sensorIdRaw) !== 'undefined'
				? String(sensorIdRaw)
				: null;

		const vivacityApiKey = VIVACITY_API || env.VIVACITY_API || process.env.VIVACITY_API;
		if (!vivacityApiKey) {
			return json({ error: 'VIVACITY_API not configured' }, { status: 500 });
		}

		const weeklySnapshot = await readVivacityWeeklySnapshot(process.cwd(), fetch, origin);
		const snapBlock = sensorId ? getVivacitySnapshotSensorBlock(weeklySnapshot, sensorId) : null;
		const snapshotSensorWeekly =
			snapBlock &&
			sameCountlineSet(snapBlock.countlineIds || [], countlineIds) &&
			Array.isArray(snapBlock.weekly)
				? snapBlock.weekly
				: [];

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

		const to = new Date();
		to.setMinutes(0, 0, 0, 0);
		const fromHourly = new Date(to.getTime() - HOURLY_SPAN_DAYS * 24 * 60 * 60 * 1000);
		fromHourly.setMinutes(0, 0, 0, 0);

		const fromHourlyISO = formatDateForVivacity(fromHourly);
		const toISO = formatDateForVivacity(to);
		const countlineIdsParam = countlineIds.join(',');
		const urlHourly = `https://api.vivacitylabs.com/countline/counts?countline_ids=${countlineIdsParam}&from=${fromHourlyISO}&to=${toISO}&time_bucket=1h&fill_zeros=true`;

		async function fetchVivacityJson(url, label, fetchOpts) {
			const response = await fetch(url, fetchOpts);
			const text = await response.text();
			if (!response.ok) {
				throw new Error(`${label}: Vivacity HTTP ${response.status} — ${text.slice(0, 180)}`);
			}
			return JSON.parse(text);
		}

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

		const hourlyRaw = await fetchVivacityJson(urlHourly, 'hourly(1h)', vivacityFetchOptions(120_000));
		const aggregatedHourly = aggregateVivacityData(hourlyRaw);
		const trafficShare30d = summarizeTrafficShare30d(hourlyRaw);

		return json({
			hourly_7days: aggregatedHourly,
			snapshotSensorWeekly,
			trafficShare30d,
			countlineIds,
			source: 'weekly-snapshot',
			dateRange: {
				hourly: { from: fromHourlyISO, to: toISO }
			}
		});
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
}
