import { json } from '@sveltejs/kit';
import { createResponseCache } from '$lib/server/response-cache.js';
import {
	readEcoCounterWeeklySnapshot,
	ecoNetworkMonthlyTotalsFromWeeklySnapshot,
	ecoPerSiteLast30dFromWeeklySnapshot,
	ecoNetworkRecentWeeksFromSnapshot,
	ecoPerSiteWeeklyFromSnapshot
} from '$lib/server/eco-counter-weekly-snapshot.js';
import { ECO_CITYWIDE_RECENT_WEEKS } from '$lib/services/eco-counter/eco-counter-processor.js';

const MAX_SITES = 120;
const responseCache = createResponseCache({ ttlMs: 8 * 60 * 1000, maxEntries: 8 });

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

	const cached = responseCache.get(cacheKey);
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
	responseCache.set(cacheKey, payload);

	return json({ ...payload, cached: false });
}
