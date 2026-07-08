import { json } from '@sveltejs/kit';
import {
	readVivacityWeeklySnapshot,
	vivacityNetworkMonthlyTotalsFromWeeklySnapshot,
	vivacityPerSensorLast30dFromWeeklySnapshot,
	vivacityNetworkRecentWeeksFromSnapshot,
	vivacityPerSensorWeeklyFromSnapshot
} from '$lib/server/vivacity-weekly-snapshot.js';
import { ECO_CITYWIDE_RECENT_WEEKS } from '$lib/services/eco-counter/eco-counter-processor.js';

const MAX_SENSORS = 120;
const CACHE_TTL_MS = 8 * 60 * 1000;
const MAX_CACHE_ENTRIES = 8;

/** @type {Map<string, { expires: number, networkWeeklyRecent: Array<{ weekKey: string, pedestrian: number, bike: number }>, networkMonthlyTotals: Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>, perSiteLast30d: Array<{ siteId: string, pedestrian: number, bike: number }>, perSiteWeekly: Array<{ siteId: string, weekly: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }>, source?: string }>} */
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
 * POST { sensors: [{ id, name, countlineIds }] } — citywide overview from weekly snapshot only (no Vivacity API).
 */
export async function POST({ request }) {
	const origin = new URL(request.url).origin;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const rawSensors = Array.isArray(body?.sensors) ? body.sensors : [];
	const sensors = rawSensors
		.map((s) => ({
			id: String(s?.id ?? ''),
			name: s?.name || `Sensor ${s?.id}`,
			countlineIds: Array.isArray(s?.countlineIds)
				? s.countlineIds.map(String).filter(Boolean)
				: []
		}))
		.filter((s) => s.id && s.countlineIds.length > 0)
		.slice(0, MAX_SENSORS);

	const sensorIds = sensors.map((s) => s.id);

	if (sensorIds.length === 0) {
		return json({
			networkWeeklyRecent: [],
			networkMonthlyTotals: [],
			perSiteLast30d: [],
			perSiteWeekly: [],
			source: 'weekly-snapshot'
		});
	}

	const cacheKey = `${sensorIds.slice().sort().join(',')}|weekly-v2`;
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

	const snapshot = await readVivacityWeeklySnapshot(process.cwd(), fetch, origin);
	const networkWeeklyRecent = snapshot
		? vivacityNetworkRecentWeeksFromSnapshot(snapshot, sensorIds, ECO_CITYWIDE_RECENT_WEEKS)
		: [];
	const networkMonthlyTotals = snapshot
		? vivacityNetworkMonthlyTotalsFromWeeklySnapshot(snapshot, sensorIds)
		: [];
	const perSiteLast30d = snapshot
		? vivacityPerSensorLast30dFromWeeklySnapshot(snapshot, sensorIds)
		: [];
	const perSiteWeekly = snapshot ? vivacityPerSensorWeeklyFromSnapshot(snapshot, sensorIds) : [];

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
