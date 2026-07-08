/**
 * Offline `eco-counter-weekly-snapshot.json` reader and aggregation helpers.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	ecoNetworkMonthlyTotalsLast12FromMerged,
	rollupEcoWeeklyRowsToMonthlyMap,
	excludeEcoIncompleteWeeklyRows,
	ECO_CITYWIDE_RECENT_WEEKS
} from '$lib/services/eco-counter/eco-counter-processor.js';

/**
 * @param {string} [cwd]
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} [fetcher]
 * @param {string} [origin]
 * @returns {Promise<{ schemaVersion?: number, sites?: Record<string, { siteId?: number, name?: string, travelModes?: string[], weekly?: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }> } | null>}
 */
export async function readEcoCounterWeeklySnapshot(cwd = process.cwd(), fetcher = undefined, origin = '') {
	try {
		const p = join(cwd, 'static/data/eco-counter-weekly-snapshot.json');
		const raw = await readFile(p, 'utf8');
		const j = JSON.parse(raw);
		if (j && typeof j === 'object' && j.sites && typeof j.sites === 'object') return j;
	} catch {
		// try HTTP fallback below
	}

	if (fetcher && origin) {
		try {
			const res = await fetcher(`${origin}/data/eco-counter-weekly-snapshot.json`);
			if (!res.ok) return null;
			const j = await res.json();
			if (j && typeof j === 'object' && j.sites && typeof j.sites === 'object') return j;
		} catch {
			// missing or invalid
		}
	}
	return null;
}

/**
 * @param {ReturnType<typeof readEcoCounterWeeklySnapshot> extends Promise<infer T> ? T : never} snapshot
 * @param {number[]} siteIds
 */
export function getEcoSnapshotSiteBlock(snapshot, siteId) {
	if (!snapshot?.sites) return null;
	return snapshot.sites[String(siteId)] ?? null;
}

/**
 * Merged network weekly totals across sites.
 * @param {Awaited<ReturnType<typeof readEcoCounterWeeklySnapshot>>} snapshot
 * @param {number[]} siteIds
 * @returns {Array<{ weekKey: string, pedestrian: number, bike: number }>}
 */
export function ecoNetworkWeeklyTotalsFromSnapshot(snapshot, siteIds) {
	if (!snapshot?.sites) return [];

	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byWeek = new Map();
	for (const siteId of siteIds) {
		const site = getEcoSnapshotSiteBlock(snapshot, siteId);
		if (!site?.weekly?.length) continue;
		for (const row of site.weekly) {
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

/** @param {Awaited<ReturnType<typeof readEcoCounterWeeklySnapshot>>} snapshot @param {number[]} siteIds @param {number} [weeks] */
export function ecoNetworkRecentWeeksFromSnapshot(snapshot, siteIds, weeks = 4) {
	const complete = excludeEcoIncompleteWeeklyRows(
		ecoNetworkWeeklyTotalsFromSnapshot(snapshot, siteIds)
	);
	return complete.slice(-weeks);
}

/**
 * Sum weekly rows across sites, then roll up to calendar months (Monday week → month of weekKey).
 * @param {Awaited<ReturnType<typeof readEcoCounterWeeklySnapshot>>} snapshot
 * @param {number[]} siteIds
 */
export function ecoNetworkMonthlyTotalsFromWeeklySnapshot(snapshot, siteIds) {
	const networkWeekly = excludeEcoIncompleteWeeklyRows(
		ecoNetworkWeeklyTotalsFromSnapshot(snapshot, siteIds)
	);
	return ecoNetworkMonthlyTotalsLast12FromMerged(rollupEcoWeeklyRowsToMonthlyMap(networkWeekly));
}

/**
 * Per-site totals from the last four weekly buckets (~28 days).
 * @param {Awaited<ReturnType<typeof readEcoCounterWeeklySnapshot>>} snapshot
 * @param {number[]} siteIds
 * @returns {Array<{ siteId: number, pedestrian: number, bike: number }>}
 */
export function ecoPerSiteLast30dFromWeeklySnapshot(snapshot, siteIds) {
	if (!snapshot?.sites) return [];

	return siteIds.map((siteId) => {
		const site = getEcoSnapshotSiteBlock(snapshot, siteId);
		if (!site?.weekly?.length) {
			return { siteId, pedestrian: 0, bike: 0 };
		}
		const tail = excludeEcoIncompleteWeeklyRows(site.weekly)
			.sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)))
			.slice(-ECO_CITYWIDE_RECENT_WEEKS);
		return {
			siteId,
			pedestrian: tail.reduce((s, w) => s + (Number(w.pedestrian) || 0), 0),
			bike: tail.reduce((s, w) => s + (Number(w.bike) || 0), 0)
		};
	});
}

/**
 * Per-site weekly rows from snapshot (for network YoY KPI).
 * @param {Awaited<ReturnType<typeof readEcoCounterWeeklySnapshot>>} snapshot
 * @param {number[]} siteIds
 */
export function ecoPerSiteWeeklyFromSnapshot(snapshot, siteIds) {
	if (!snapshot?.sites) return [];
	return siteIds.map((siteId) => {
		const site = getEcoSnapshotSiteBlock(snapshot, siteId);
		return {
			siteId,
			weekly: Array.isArray(site?.weekly) ? site.weekly : []
		};
	});
}
