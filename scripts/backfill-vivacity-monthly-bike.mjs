#!/usr/bin/env node
/**
 * One-off: fill `bike` on each month in static/data/vivacity-citywide-monthly-historical.json
 * using the same Vivacity aggregation as the citywide API (24h buckets, all countlines).
 *
 * Requires: VIVACITY_API in the environment.
 *
 * Usage (from repo root):
 *   VIVACITY_API=your_key node scripts/backfill-vivacity-monthly-bike.mjs
 *
 * Optional: only months with null/ missing bike:
 *   VIVACITY_API=... node scripts/backfill-vivacity-monthly-bike.mjs --only-missing
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	aggregateVivacityData,
	mergeCountlineResponseObjects,
	sumModeFromAggregatedDailyRows
} from '../src/lib/services/vivacity-counter/vivacity-countline-utils.js';
import { withVivacityCountsClasses } from '../src/lib/server/vivacity-counts-classes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function resolveFromRoot(p, fallback) {
	const raw = p || fallback;
	return raw.startsWith('/') ? raw : join(ROOT, raw);
}

/** Must match the marker set used for citywide (sensor_id + countlines after metadata merge). */
const MARKERS_PATH = resolveFromRoot(process.env.VIVACITY_MARKERS_PATH, 'static/vivacity_markers.json');
const HISTORICAL_PATH = resolveFromRoot(
	process.env.VIVACITY_HISTORICAL_PATH,
	'static/data/vivacity-citywide-monthly-historical.json'
);

const CHUNK_SIZE = 55;
const MAX_COUNTS_URL_CHARS = 7800;
const CHUNK_FETCH_CONCURRENCY = 4;

function formatDateForVivacity(date) {
	return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function chunkArray(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function monthRangeFromKey(monthKey) {
	const [ys, ms] = String(monthKey).split('-').map(Number);
	const fromD = new Date(Date.UTC(ys, ms - 1, 1, 0, 0, 0, 0));
	const toD = new Date(Date.UTC(ys, ms, 1, 0, 0, 0, 0));
	return { fromISO: formatDateForVivacity(fromD), toISO: formatDateForVivacity(toD) };
}

function attachCountlinesFromMetadata(markers, metadata) {
	return markers.map((marker) => {
		const sensorId = String(marker.sensor_id);
		const sensorMetadata = metadata?.[sensorId];
		const countlines = [];
		if (sensorMetadata?.view_points) {
			for (const viewPoint of Object.values(sensorMetadata.view_points)) {
				if (!viewPoint?.countlines) continue;
				for (const [countlineId, countlineData] of Object.entries(viewPoint.countlines)) {
					countlines.push({
						id: countlineId,
						name: countlineData?.name,
						description: countlineData?.description,
						direction: countlineData?.direction
					});
				}
			}
		}
		return { ...marker, countlines };
	});
}

function buildSensorsFromMarkers(markersData) {
	if (!Array.isArray(markersData) || markersData.length === 0) return [];
	return markersData
		.map((m) => ({
			id: String(m.sensor_id),
			name: m.name || `Sensor ${m.sensor_id}`,
			countlineIds: (m.countlines || []).map((c) => String(c.id)).filter(Boolean)
		}))
		.filter((s) => s.countlineIds.length > 0);
}

async function readVivacityJson(response, label) {
	const text = await response.text();
	if (!response.ok) {
		throw new Error(`${label} HTTP ${response.status}: ${text.slice(0, 400)}`);
	}
	return JSON.parse(text);
}

async function fetchMergedCountlines(allIds, fromISO, toISO, apiKey, logTag) {
	const options = {
		method: 'GET',
		headers: { Accept: 'application/json', 'x-vivacity-api-key': apiKey }
	};

	function countsUrl(idsParam) {
		return withVivacityCountsClasses(
			`https://api.vivacitylabs.com/countline/counts?countline_ids=${idsParam}&from=${fromISO}&to=${toISO}&time_bucket=24h`
		);
	}

	const allIdsParam = allIds.join(',');
	const singleUrl = countsUrl(allIdsParam);

	if (singleUrl.length <= MAX_COUNTS_URL_CHARS) {
		const res = await fetch(singleUrl, options);
		return readVivacityJson(res, `${logTag} single`);
	}

	const chunks = chunkArray(allIds, CHUNK_SIZE);
	const chunkResults = [];
	for (let b = 0; b < chunks.length; b += CHUNK_FETCH_CONCURRENCY) {
		const slice = chunks.slice(b, b + CHUNK_FETCH_CONCURRENCY);
		const batch = await Promise.all(
			slice.map(async (ids, k) => {
				const idx = b + k + 1;
				const param = ids.join(',');
				const url = countsUrl(param);
				const res = await fetch(url, options);
				return readVivacityJson(res, `${logTag} chunk ${idx}/${chunks.length}`);
			})
		);
		chunkResults.push(...batch);
	}
	return mergeCountlineResponseObjects(chunkResults);
}

async function bikeTotalForMonth(allIds, monthKey, apiKey) {
	const { fromISO, toISO } = monthRangeFromKey(monthKey);
	const merged = await fetchMergedCountlines(allIds, fromISO, toISO, apiKey, `month ${monthKey}`);
	const agg = aggregateVivacityData(merged);
	return Math.round(sumModeFromAggregatedDailyRows(agg, 'bike'));
}

async function main() {
	const onlyMissing = process.argv.includes('--only-missing');
	const apiKey = process.env.VIVACITY_API;
	if (!apiKey) {
		console.error('Set VIVACITY_API in the environment.');
		process.exit(1);
	}

	const [markersRaw, historicalRaw] = await Promise.all([
		readFile(MARKERS_PATH, 'utf8'),
		readFile(HISTORICAL_PATH, 'utf8')
	]);

	const markers = JSON.parse(markersRaw);
	const metaRes = await fetch('https://api.vivacitylabs.com/hardware/metadata', {
		headers: { Accept: 'application/json', 'x-vivacity-api-key': apiKey }
	});
	const metadata = await readVivacityJson(metaRes, 'hardware/metadata');

	const processed = attachCountlinesFromMetadata(markers, metadata);
	const sensors = buildSensorsFromMarkers(processed);
	const allIds = [...new Set(sensors.flatMap((s) => s.countlineIds))];

	if (allIds.length === 0) {
		console.error('No countline IDs after merging markers + metadata.');
		process.exit(1);
	}

	console.info('Countlines:', allIds.length);

	const store = JSON.parse(historicalRaw);
	if (!store.months || !Array.isArray(store.months)) {
		console.error('Invalid historical JSON: missing months[]');
		process.exit(1);
	}

	const sorted = [...store.months].sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));

	for (const row of sorted) {
		const mk = row.monthKey;
		if (!mk) continue;
		if (onlyMissing && row.bike != null && Number(row.bike) > 0) {
			console.info('skip (has bike)', mk, row.bike);
			continue;
		}
		process.stdout.write(`Fetching bike ${mk}… `);
		try {
			const bike = await bikeTotalForMonth(allIds, mk, apiKey);
			row.bike = bike;
			console.info(bike.toLocaleString());
		} catch (e) {
			console.error('FAILED', e?.message || e);
			process.exit(1);
		}
		// gentle pacing
		await new Promise((r) => setTimeout(r, 200));
	}

	store.notes =
		'Network totals (all Dublin Vivacity countlines, UTC calendar months). pedestrian + bike populated; missing complete months appended on citywide API when needed.';

	await writeFile(HISTORICAL_PATH, `${JSON.stringify(store, null, '\t')}\n`, 'utf8');
	console.info('Wrote', HISTORICAL_PATH);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
