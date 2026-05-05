/**
 * Build the same payload shape as POST /api/vivacity-counter/citywide (live path)
 * from static `vivacity-sensor-timeseries-snapshot.json` + monthly static JSON only.
 */

import {
	getLastMonthKeyInStore,
	networkMonthlyTotalsLast12FromStore,
	readMonthlyHistoricalStore
} from '$lib/server/vivacity-monthly-historical-store.js';
import { readVivacitySensorTimeseriesSnapshot, sameCountlineSet } from '$lib/server/vivacity-snapshot-merge.js';
import { sumModeFromAggregatedDailyRows } from '$lib/services/vivacity-counter/vivacity-countline-utils.js';

/** @param {Date} date */
function formatDateForVivacity(date) {
	return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

/** @param {unknown[]} rows @param {number} end0UtcMs */
function filterDailyRowsLast30Utc(rows, end0UtcMs) {
	if (!Array.isArray(rows)) return [];
	const dayMs = 86400000;
	const start30 = end0UtcMs - 30 * dayMs;
	return rows.filter((r) => {
		if (!r || typeof r !== 'object' || !('from' in r)) return false;
		const from = /** @type {{ from: string }} */ (r).from;
		const t = new Date(from).getTime();
		return t >= start30 && t < end0UtcMs;
	});
}

/**
 * @param {Array<{ dailyAggregated: unknown[] }>} sensorBlocks
 */
function mergeCitywideDailyFromSensorSnapshots(sensorBlocks) {
	/** @type {Map<string, Record<string, number | string>>} */
	const byFrom = new Map();
	for (const { dailyAggregated } of sensorBlocks) {
		for (const row of dailyAggregated || []) {
			if (!row || typeof row !== 'object' || !('from' in row)) continue;
			const rec = /** @type {Record<string, unknown>} */ (row);
			const k = String(rec.from);
			const cur = /** @type {Record<string, number | string>} */ (
				byFrom.get(k) || { from: rec.from, to: rec.to }
			);
			for (const [key, val] of Object.entries(rec)) {
				if (key === 'from' || key === 'to') continue;
				if (typeof val === 'number' && Number.isFinite(val)) {
					const prev = typeof cur[key] === 'number' ? cur[key] : 0;
					cur[key] = prev + val;
				}
			}
			byFrom.set(k, cur);
		}
	}
	return [...byFrom.values()].sort((a, b) => new Date(String(a.from)).getTime() - new Date(String(b.from)).getTime());
}

/**
 * @param {Array<{ id: string, name: string, countlineIds: string[] }>} normalizedSensors
 * @param {Record<string, { dailyAggregated?: unknown[], countlineIds?: string[] }>} snapSensors
 * @param {number} end0UtcMs
 */
function buildCountsBySensorFromSnapshotDaily(normalizedSensors, snapSensors, end0UtcMs) {
	const list = normalizedSensors.map((s) => {
		const block = snapSensors[s.id];
		const rows = block?.dailyAggregated;
		const filtered = filterDailyRowsLast30Utc(Array.isArray(rows) ? rows : [], end0UtcMs);
		return {
			id: s.id,
			name: s.name,
			pedestrian: Math.round(sumModeFromAggregatedDailyRows(filtered, 'pedestrian')),
			bike: Math.round(sumModeFromAggregatedDailyRows(filtered, 'bike'))
		};
	});
	return list
		.filter((x) => x.pedestrian > 0 || x.bike > 0)
		.sort((a, b) => b.pedestrian + b.bike - (a.pedestrian + a.bike));
}

/**
 * @param {Array<{ id: string, name: string, countlineIds: string[] }>} normalizedSensors
 * @returns {Promise<object | null>} citywide JSON or null to fall back to live Vivacity
 */
export async function tryBuildCitywideFromSnapshot(normalizedSensors) {
	if (!normalizedSensors?.length) return null;

	const snapshot = await readVivacitySensorTimeseriesSnapshot();
	/** @type {Record<string, { dailyAggregated?: unknown[], countlineIds?: string[] }> | null | undefined} */
	const snapMap = snapshot?.sensors;
	if (!snapMap || typeof snapMap !== 'object') return null;

	for (const s of normalizedSensors) {
		const block = snapMap[s.id];
		if (!block || typeof block !== 'object') return null;
		const daily = block.dailyAggregated;
		if (!Array.isArray(daily) || daily.length === 0) return null;
		if (!sameCountlineSet(block.countlineIds || [], s.countlineIds || [])) return null;
	}

	const blocks = normalizedSensors.map((s) => ({
		dailyAggregated: /** @type {unknown[]} */ (snapMap[s.id].dailyAggregated)
	}));
	const dailyAggregated = mergeCitywideDailyFromSensorSnapshots(blocks);
	if (!Array.isArray(dailyAggregated) || dailyAggregated.length === 0) return null;

	const toDay = new Date();
	toDay.setUTCHours(0, 0, 0, 0);
	const end0UtcMs = toDay.getTime();

	const countsBySensor = buildCountsBySensorFromSnapshotDaily(normalizedSensors, snapMap, end0UtcMs);

	const historicalMonthlyStore = /** @type {{ months?: unknown[] }} */ (await readMonthlyHistoricalStore());
	const networkMonthlyTotals = networkMonthlyTotalsLast12FromStore(historicalMonthlyStore);
	const months = Array.isArray(historicalMonthlyStore.months) ? historicalMonthlyStore.months : [];
	const lastMonthKeyAfter = getLastMonthKeyInStore(/** @type {{ monthKey: string }[]} */ (months));

	const firstFrom =
		dailyAggregated[0] && typeof dailyAggregated[0] === 'object' && 'from' in dailyAggregated[0]
			? String(/** @type {{from?:string}} */ (dailyAggregated[0]).from)
			: '';

	return {
		dailyAggregated,
		networkMonthlyTotals,
		countsBySensor,
		sensors: normalizedSensors,
		dateRange: {
			daily: {
				from: firstFrom,
				to: formatDateForVivacity(toDay),
				timeBucket: '24h'
			},
			monthly: {
				source: 'static-json',
				lastMonthKey: lastMonthKeyAfter,
				catchUpMonthsQueried: 0
			}
		}
	};
}
