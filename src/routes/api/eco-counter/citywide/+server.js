import { json } from '@sveltejs/kit';
import {
	readEcoCounterWeeklySnapshot,
	ecoNetworkMonthlyTotalsFromWeeklySnapshot,
	ecoPerSiteLast30dFromWeeklySnapshot,
	ecoNetworkRecentWeeksFromSnapshot,
	ecoPerSiteWeeklyFromSnapshot
} from '$lib/server/eco-counter-weekly-snapshot.js';
import { ECO_CITYWIDE_RECENT_WEEKS } from '$lib/services/eco-counter/eco-counter-processor.js';

const MAX_SITES = 120;
const CACHE_TTL_MS = 8 * 60 * 1000;
const MAX_CACHE_ENTRIES = 8;

/** @type {Map<string, { expires: number, networkWeeklyRecent: Array<{ weekKey: string, pedestrian: number, bike: number }>, networkMonthlyTotals: Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>, perSiteLast30d: Array<{ siteId: number, pedestrian: number, bike: number }>, perSiteWeekly: Array<{ siteId: number, weekly: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }>, source?: string }>} */
const responseCache = new Map();

function cachePrune() {
	while (responseCache.size > MAX_CACHE_ENTRIES) {
		const first = responseCache.keys().next().value;
		responseCache.delete(first);
	}
}

function cacheGet(key) {
	const row = responseCache.get(key);
	if (!row) return null;
	if (Date.now() > row.expires) {
		responseCache.delete(key);
		return null;
	}
	return row;
}

function cacheSet(key, payload) {
	responseCache.set(key, { ...payload, expires: Date.now() + CACHE_TTL_MS });
	cachePrune();
}

/**
 * POST { siteIds: number[] } — citywide overview entirely from weekly snapshot (no Eco API).
 */
export async function POST({ request }) {
	const origin = new URL(request.url).origin;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const rawIds = Array.isArray(body.siteIds) ? body.siteIds : [];
	const siteIds = [
		...new Set(
			rawIds
				.map((id) => Number(id))
				.filter((id) => Number.isFinite(id) && id > 0)
		)
	].slice(0, MAX_SITES);

	if (siteIds.length === 0) {
		return json({
			networkWeeklyRecent: [],
			networkMonthlyTotals: [],
			perSiteLast30d: [],
			perSiteWeekly: [],
			source: 'weekly-snapshot'
		});
	}

	const sortedKey = siteIds.slice().sort((a, b) => a - b).join(',');
	const cacheKey = `${sortedKey}|weekly-v3`;

	const cached = cacheGet(cacheKey);
	if (cached) {
		return json({
			networkWeeklyRecent: cached.networkWeeklyRecent,
			networkMonthlyTotals: cached.networkMonthlyTotals,
			perSiteLast30d: cached.perSiteLast30d,
			perSiteWeekly: cached.perSiteWeekly,
			source: cached.source,
			cached: true
		});
	}

	const snapshot = await readEcoCounterWeeklySnapshot(process.cwd(), fetch, origin);
	const networkWeeklyRecent = snapshot
		? ecoNetworkRecentWeeksFromSnapshot(snapshot, siteIds, ECO_CITYWIDE_RECENT_WEEKS)
		: [];
	const networkMonthlyTotals = snapshot
		? ecoNetworkMonthlyTotalsFromWeeklySnapshot(snapshot, siteIds)
		: [];
	const perSiteLast30d = snapshot ? ecoPerSiteLast30dFromWeeklySnapshot(snapshot, siteIds) : [];
	const perSiteWeekly = snapshot ? ecoPerSiteWeeklyFromSnapshot(snapshot, siteIds) : [];

	const payload = {
		networkWeeklyRecent,
		networkMonthlyTotals,
		perSiteLast30d,
		perSiteWeekly,
		source: 'weekly-snapshot'
	};
	cacheSet(cacheKey, payload);

	return json({ ...payload, cached: false });
}
