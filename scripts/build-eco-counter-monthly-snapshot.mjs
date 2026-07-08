#!/usr/bin/env node
/**
 * Build `static/data/eco-counter-network-monthly-snapshot.json`:
 * merged **network** monthly totals (pedestrian + bike) and **per-site** monthly series
 * from Eco-Counter `history/traffic/aggregated` with `granularity=P1M` (same URLs as the app).
 *
 * Requires: `ECO_COUNTER_API` in the environment (same key as SvelteKit private env).
 *
 * Usage (repo root):
 *   ECO_COUNTER_API=... node scripts/build-eco-counter-monthly-snapshot.mjs
 *   ECO_COUNTER_API=... node scripts/build-eco-counter-monthly-snapshot.mjs --concurrency 12 --pause-ms 300
 *   ECO_COUNTER_API=... node scripts/build-eco-counter-monthly-snapshot.mjs --only-site 10042
 *
 * Output shape (see `schemaVersion` in JSON) is suitable for a future app read path;
 * today the dashboard still calls Eco live — this file is the offline source of truth for audits / reloads.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	accumulateEcoMonthlyFromAggregatedP1M,
	mergeEcoMonthlyByMonthKeyMaps,
	processEcoCounterLocations,
	processEcoCounterTraffic,
	combineEcoCounterData
} from '../src/lib/services/eco-counter/eco-counter-processor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_OUT = join(ROOT, 'static/data/eco-counter-network-monthly-snapshot.json');

const HISTORY_YEARS = 3;
const MAX_TAIL_MONTHS = 48;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_PAUSE_MS = 250;

function parseArgs(argv) {
	let concurrency = DEFAULT_CONCURRENCY;
	let pauseMs = DEFAULT_PAUSE_MS;
	let outPath = DEFAULT_OUT;
	/** @type {number|null} */
	let onlySite = null;
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--concurrency' && argv[i + 1]) {
			concurrency = Math.max(1, Number(argv[++i]) || DEFAULT_CONCURRENCY);
		} else if (a === '--pause-ms' && argv[i + 1]) {
			pauseMs = Math.max(0, Number(argv[++i]) || 0);
		} else if (a === '--out' && argv[i + 1]) {
			const raw = argv[++i];
			outPath = raw.startsWith('/') ? raw : join(ROOT, raw);
		} else if (a === '--only-site' && argv[i + 1]) {
			onlySite = Number(argv[++i]);
			if (!Number.isFinite(onlySite)) onlySite = null;
		}
	}
	return { concurrency, pauseMs, outPath, onlySite };
}

function formatDateUtc(d) {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function formatEcoMonthLabelUtc(monthKey) {
	const parts = String(monthKey).split('-');
	if (parts.length !== 2) return String(monthKey);
	const y = Number(parts[0]);
	const mo = Number(parts[1]);
	if (!Number.isFinite(y) || !Number.isFinite(mo)) return String(monthKey);
	return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IE', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/**
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
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

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {Map<string, { pedestrian: number, bike: number }>} m
 * @param {number} [tailMonths]
 */
function mapToMonthlyRows(m, tailMonths = MAX_TAIL_MONTHS) {
	if (!m || typeof m.entries !== 'function') return [];
	const sorted = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	const tail = tailMonths > 0 ? sorted.slice(-tailMonths) : sorted;
	return tail.map(([monthKey, v]) => ({
		monthKey,
		label: formatEcoMonthLabelUtc(monthKey),
		pedestrian: Math.round(v.pedestrian || 0),
		bike: Math.round(v.bike || 0)
	}));
}

async function main() {
	const apiKey = process.env.ECO_COUNTER_API;
	if (!apiKey) {
		console.error('Missing ECO_COUNTER_API in the environment.');
		process.exit(1);
	}

	const { concurrency, pauseMs, outPath, onlySite } = parseArgs(process.argv);

	const options = {
		method: 'GET',
		headers: {
			accept: 'application/json',
			'X-API-KEY': apiKey
		}
	};

	const end = new Date();
	const ddEnd = formatDateUtc(end);
	const start = new Date(end.getTime() - 364 * HISTORY_YEARS * 24 * 60 * 60 * 1000);
	const ddStart = formatDateUtc(start);

	const sitesUrl =
		'https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc';
	const trafficUrl =
		'https://api.eco-counter.com/api/v2/statistical/adt/by/site?dateRange=lastMonth&groupBy=siteAndTravelMode&travelModes=pedestrian&travelModes=bike';

	console.info('[eco-monthly-snapshot] sites', sitesUrl);
	const sitesRes = await fetch(sitesUrl, options);
	if (!sitesRes.ok) {
		const t = await sitesRes.text();
		throw new Error(`sites HTTP ${sitesRes.status}: ${t.slice(0, 500)}`);
	}
	const sitesJson = await sitesRes.json();

	const trafficRes = await fetch(trafficUrl, options);
	const trafficJson = trafficRes.ok ? await trafficRes.json() : null;
	if (!trafficRes.ok) {
		console.warn('[eco-monthly-snapshot] ADT fetch failed; site names/ travelModes may be incomplete');
	}

	const locations = processEcoCounterLocations(sitesJson);
	const traffic = processEcoCounterTraffic(trafficJson, sitesJson);
	const combined = combineEcoCounterData(locations, traffic);

	let siteIds = combined.map((l) => Number(l.id)).filter((id) => Number.isFinite(id) && id > 0);
	if (onlySite != null) {
		siteIds = siteIds.filter((id) => id === onlySite);
	}
	if (siteIds.length === 0) {
		console.error('[eco-monthly-snapshot] No site IDs to fetch.');
		process.exit(1);
	}

	const urlMonthlyFor = (siteId) =>
		`https://api.eco-counter.com/api/v2/history/traffic/aggregated?siteId=${siteId}&include=&startDate=${ddStart}&endDate=${ddEnd}&startTime=00%3A00&endTime=00%3A00&granularity=P1M&groupBy=travelMode&gapFilling=false&travelModes=pedestrian&travelModes=bike`;

	console.info(
		'[eco-monthly-snapshot] window',
		ddStart,
		'→',
		ddEnd,
		'sites',
		siteIds.length,
		'concurrency',
		concurrency,
		'pauseMs',
		pauseMs
	);

	let done = 0;
	const monthMaps = await mapPool(siteIds, concurrency, async (siteId) => {
		const url = urlMonthlyFor(siteId);
		try {
			const res = await fetch(url, options);
			const text = await res.text();
			if (!res.ok) {
				console.warn('[eco-monthly-snapshot]', siteId, 'HTTP', res.status, text.slice(0, 200));
				return null;
			}
			let j;
			try {
				j = JSON.parse(text);
			} catch {
				console.warn('[eco-monthly-snapshot]', siteId, 'invalid JSON');
				return null;
			}
			const map = accumulateEcoMonthlyFromAggregatedP1M(j);
			done++;
			if (done % 10 === 0 || done === siteIds.length) {
				console.info('[eco-monthly-snapshot] progress', done, '/', siteIds.length);
			}
			if (pauseMs > 0) await sleep(pauseMs);
			return map;
		} catch (e) {
			console.warn('[eco-monthly-snapshot]', siteId, String(e));
			return null;
		}
	});

	const mergedNetwork = mergeEcoMonthlyByMonthKeyMaps(monthMaps.filter(Boolean));

	const sitesOut = siteIds.map((siteId, i) => {
		const loc = combined.find((l) => Number(l.id) === siteId);
		const m = monthMaps[i];
		return {
			siteId,
			name: loc?.name || `Site ${siteId}`,
			travelModes: loc?.travelModes || [],
			monthly: mapToMonthlyRows(m || new Map())
		};
	});

	const networkMonthlyTotals = mapToMonthlyRows(mergedNetwork);

	const out = {
		schemaVersion: 1,
		generatedAtUtc: new Date().toISOString(),
		granularity: 'P1M',
		historyYears: HISTORY_YEARS,
		dateRange: { startDate: ddStart, endDate: ddEnd },
		siteCount: siteIds.length,
		networkMonthlyTotals,
		sites: sitesOut
	};

	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8');
	console.info('[eco-monthly-snapshot] wrote', outPath, 'network months', networkMonthlyTotals.length);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
