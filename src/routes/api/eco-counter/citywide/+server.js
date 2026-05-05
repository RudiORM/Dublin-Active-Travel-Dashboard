import { json } from '@sveltejs/kit';
import { ECO_COUNTER_API } from '$env/static/private';
import {
	accumulateEcoDailyFromRawFlows,
	accumulateEcoMonthlyFromAggregatedP1M,
	mergeEcoDailyByDayMaps,
	mergeEcoMonthlyByMonthKeyMaps,
	ecoDailyMapToAggregatedRows,
	ecoNetworkMonthlyTotalsFromDailyMap,
	ecoNetworkMonthlyTotalsLast12FromMerged
} from '$lib/services/eco-counter/eco-counter-processor.js';

const MAX_SITES = 120;
/** Eco API round-trips dominate; higher concurrency cuts wall time (tune if rate-limited). */
const FETCH_CONCURRENCY = 28;
/** Merged network totals change slowly; avoids repeating ~N remote calls per session. */
const CACHE_TTL_MS = 8 * 60 * 1000;
const MAX_CACHE_ENTRIES = 8;

/** @type {Map<string, { expires: number, dailyAggregated: Array<{ from: string, pedestrian: number, bike: number }>, networkMonthlyTotals: Array<{ monthKey: string, label: string, pedestrian: number, bike: number }> }>} */
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
	return { dailyAggregated: row.dailyAggregated, networkMonthlyTotals: row.networkMonthlyTotals };
}

function cacheSet(key, dailyAggregated, networkMonthlyTotals) {
	responseCache.set(key, {
		expires: Date.now() + CACHE_TTL_MS,
		dailyAggregated,
		networkMonthlyTotals
	});
	cachePrune();
}

function formatDate(d) {
	const date = ('0' + d.getDate()).slice(-2);
	const month = ('0' + (d.getMonth() + 1)).slice(-2);
	const year = d.getFullYear();
	return `${year}-${month}-${date}`;
}

/**
 * Run async tasks with a fixed concurrency limit (pool).
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapPool(items, limit, fn) {
	const results = /** @type {R[]} */ (new Array(items.length));
	let index = 0;

	async function worker() {
		for (;;) {
			const i = index++;
			if (i >= items.length) return;
			results[i] = await fn(items[i], i);
		}
	}

	const n = Math.min(limit, items.length);
	await Promise.all(Array.from({ length: n }, () => worker()));
	return results;
}

/**
 * POST { siteIds: number[] } — merge last-30d P1D raw traffic across sites, and last-12 calendar months
 * from merged `P1M` aggregated history (~3y window per site). If that yields no months, falls back to
 * summing merged **P1D raw** over a longer window (~420d) and bucketing by calendar month.
 */
export async function POST({ request }) {
	if (!ECO_COUNTER_API) {
		return json({ error: 'Eco-Counter API not configured' }, { status: 500 });
	}

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
		return json({ dailyAggregated: [], networkMonthlyTotals: [] });
	}

	const end = new Date();
	const dd = formatDate(end);
	const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
	const dd2 = formatDate(start);

	const sortedKey = siteIds.slice().sort((a, b) => a - b).join(',');
	const cacheKey = `${dd2}|${dd}|${sortedKey}`;

	const cached = cacheGet(cacheKey);
	if (cached) {
		return json({
			dailyAggregated: cached.dailyAggregated,
			networkMonthlyTotals: cached.networkMonthlyTotals,
			cached: true
		});
	}

	const options = {
		method: 'GET',
		headers: {
			accept: 'application/json',
			'X-API-KEY': ECO_COUNTER_API
		}
	};

	const urlFor = (siteId) =>
		`https://api.eco-counter.com/api/v2/history/traffic/raw?siteId=${siteId}&include=&startDate=${dd2}&endDate=${dd}&startTime=00%3A00&endTime=00%3A00&granularity=P1D&gapFilling=false&travelModes=bike&travelModes=pedestrian`;

	const monthlyEnd = new Date();
	const ddMonthly = formatDate(monthlyEnd);
	const monthlyStart = new Date(monthlyEnd.getTime() - 364 * 3 * 24 * 60 * 60 * 1000);
	const ddMonthlyStart = formatDate(monthlyStart);
	const urlMonthlyFor = (siteId) =>
		`https://api.eco-counter.com/api/v2/history/traffic/aggregated?siteId=${siteId}&include=&startDate=${ddMonthlyStart}&endDate=${ddMonthly}&startTime=00%3A00&endTime=00%3A00&granularity=P1M&groupBy=travelMode&gapFilling=false&travelModes=pedestrian&travelModes=bike`;

	const [dayMaps, monthMaps] = await Promise.all([
		mapPool(siteIds, FETCH_CONCURRENCY, async (siteId) => {
			try {
				const res = await fetch(urlFor(siteId), options);
				if (!res.ok) return null;
				const j = await res.json();
				return accumulateEcoDailyFromRawFlows(j);
			} catch {
				return null;
			}
		}),
		mapPool(siteIds, FETCH_CONCURRENCY, async (siteId) => {
			try {
				const res = await fetch(urlMonthlyFor(siteId), options);
				if (!res.ok) return null;
				const j = await res.json();
				return accumulateEcoMonthlyFromAggregatedP1M(j);
			} catch {
				return null;
			}
		})
	]);

	const merged = mergeEcoDailyByDayMaps(dayMaps.filter(Boolean));
	const dailyAggregated = ecoDailyMapToAggregatedRows(merged);

	const mergedMonths = mergeEcoMonthlyByMonthKeyMaps(monthMaps.filter(Boolean));
	let networkMonthlyTotals = ecoNetworkMonthlyTotalsLast12FromMerged(mergedMonths);

	if (networkMonthlyTotals.length < 12 && siteIds.length > 0) {
		const lookbackDays = 420;
		const longStart = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
		const ddLong = formatDate(longStart);
		const urlLongDaily = (siteId) =>
			`https://api.eco-counter.com/api/v2/history/traffic/raw?siteId=${siteId}&include=&startDate=${ddLong}&endDate=${dd}&startTime=00%3A00&endTime=00%3A00&granularity=P1D&gapFilling=false&travelModes=bike&travelModes=pedestrian`;

		const longDayMaps = await mapPool(siteIds, FETCH_CONCURRENCY, async (siteId) => {
			try {
				const res = await fetch(urlLongDaily(siteId), options);
				if (!res.ok) return null;
				const j = await res.json();
				return accumulateEcoDailyFromRawFlows(j);
			} catch {
				return null;
			}
		});
		const mergedLong = mergeEcoDailyByDayMaps(longDayMaps.filter(Boolean));
		const fromDailyFallback = ecoNetworkMonthlyTotalsFromDailyMap(mergedLong);
		if (networkMonthlyTotals.length === 0) {
			networkMonthlyTotals = fromDailyFallback;
		} else {
			// Merge by monthKey and keep the most complete last-12 month window.
			const byKey = new Map();
			for (const m of fromDailyFallback) byKey.set(m.monthKey, m);
			for (const m of networkMonthlyTotals) byKey.set(m.monthKey, m);
			networkMonthlyTotals = [...byKey.values()]
				.sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)))
				.slice(-12);
		}
	}

	cacheSet(cacheKey, dailyAggregated, networkMonthlyTotals);

	return json({ dailyAggregated, networkMonthlyTotals, cached: false });
}
