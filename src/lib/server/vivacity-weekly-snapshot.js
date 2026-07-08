/**
 * Offline `vivacity-weekly-snapshot.json` reader and aggregation helpers.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	ecoNetworkMonthlyTotalsLast12FromMerged,
	rollupEcoWeeklyRowsToMonthlyMap,
	excludeEcoIncompleteWeeklyRows,
	ECO_CITYWIDE_RECENT_WEEKS
} from '$lib/services/eco-counter/eco-counter-processor.js';

export { ECO_CITYWIDE_RECENT_WEEKS as VIVACITY_CITYWIDE_RECENT_WEEKS };

/**
 * @param {string} [cwd]
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} [fetcher]
 * @param {string} [origin]
 */
export async function readVivacityWeeklySnapshot(cwd = process.cwd(), fetcher = undefined, origin = '') {
	try {
		const p = join(cwd, 'static/data/vivacity-weekly-snapshot.json');
		const raw = await readFile(p, 'utf8');
		const j = JSON.parse(raw);
		if (j && typeof j === 'object' && j.sensors && typeof j.sensors === 'object') return j;
	} catch {
		// try HTTP fallback below
	}

	if (fetcher && origin) {
		try {
			const res = await fetcher(`${origin}/data/vivacity-weekly-snapshot.json`);
			if (!res.ok) return null;
			const j = await res.json();
			if (j && typeof j === 'object' && j.sensors && typeof j.sensors === 'object') return j;
		} catch {
			// missing or invalid
		}
	}
	return null;
}

/**
 * @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot
 * @param {string} sensorId
 */
export function getVivacitySnapshotSensorBlock(snapshot, sensorId) {
	if (!snapshot?.sensors) return null;
	return snapshot.sensors[String(sensorId)] ?? null;
}

/**
 * @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot
 * @param {string[]} sensorIds
 * @returns {Array<{ weekKey: string, pedestrian: number, bike: number }>}
 */
export function vivacityNetworkWeeklyTotalsFromSnapshot(snapshot, sensorIds) {
	if (!snapshot?.sensors) return [];

	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byWeek = new Map();
	for (const sensorId of sensorIds) {
		const sensor = getVivacitySnapshotSensorBlock(snapshot, sensorId);
		if (!sensor?.weekly?.length) continue;
		for (const row of sensor.weekly) {
			if (!row?.weekKey) continue;
			if (!byWeek.has(row.weekKey)) {
				byWeek.set(row.weekKey, { pedestrian: 0, bike: 0 });
			}
			const t = byWeek.get(row.weekKey);
			t.pedestrian += Number(row.pedestrian) || 0;
			t.bike += Number(row.bike) || 0;
		}
	}

	return [...byWeek.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([weekKey, v]) => ({
			weekKey,
			pedestrian: Math.round(v.pedestrian || 0),
			bike: Math.round(v.bike || 0)
		}));
}

/** @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot @param {string[]} sensorIds @param {number} [weeks] */
export function vivacityNetworkRecentWeeksFromSnapshot(snapshot, sensorIds, weeks = ECO_CITYWIDE_RECENT_WEEKS) {
	const complete = excludeEcoIncompleteWeeklyRows(
		vivacityNetworkWeeklyTotalsFromSnapshot(snapshot, sensorIds)
	);
	return complete.slice(-weeks);
}

/** @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot @param {string[]} sensorIds */
export function vivacityNetworkMonthlyTotalsFromWeeklySnapshot(snapshot, sensorIds) {
	const networkWeekly = excludeEcoIncompleteWeeklyRows(
		vivacityNetworkWeeklyTotalsFromSnapshot(snapshot, sensorIds)
	);
	return ecoNetworkMonthlyTotalsLast12FromMerged(rollupEcoWeeklyRowsToMonthlyMap(networkWeekly));
}

/**
 * @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot
 * @param {string[]} sensorIds
 * @returns {Array<{ siteId: string, pedestrian: number, bike: number }>}
 */
export function vivacityPerSensorLast30dFromWeeklySnapshot(snapshot, sensorIds) {
	if (!snapshot?.sensors) return [];

	return sensorIds.map((sensorId) => {
		const sensor = getVivacitySnapshotSensorBlock(snapshot, sensorId);
		if (!sensor?.weekly?.length) {
			return { siteId: String(sensorId), pedestrian: 0, bike: 0 };
		}
		const tail = excludeEcoIncompleteWeeklyRows(sensor.weekly)
			.sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)))
			.slice(-ECO_CITYWIDE_RECENT_WEEKS);
		return {
			siteId: String(sensorId),
			pedestrian: tail.reduce((s, w) => s + (Number(w.pedestrian) || 0), 0),
			bike: tail.reduce((s, w) => s + (Number(w.bike) || 0), 0)
		};
	});
}

/**
 * @param {Awaited<ReturnType<typeof readVivacityWeeklySnapshot>>} snapshot
 * @param {string[]} sensorIds
 */
export function vivacityPerSensorWeeklyFromSnapshot(snapshot, sensorIds) {
	if (!snapshot?.sensors) return [];
	return sensorIds.map((sensorId) => {
		const sensor = getVivacitySnapshotSensorBlock(snapshot, sensorId);
		return {
			siteId: String(sensorId),
			weekly: Array.isArray(sensor?.weekly) ? sensor.weekly : []
		};
	});
}
