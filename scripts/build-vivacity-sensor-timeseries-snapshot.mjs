#!/usr/bin/env node
/**
 * Build static/data/vivacity-sensor-timeseries-snapshot.json (same output shape as the Python builder).
 *
 * Uses **one countline per request** and **~60d UTC windows** per request to avoid Vivacity/nginx 504s
 * on "3 countlines × 365 days" single URLs.
 *
 * Prefer verbose logging + same strategy:
 *   VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py
 *
 * Prerequisite:
 *   VIVACITY_API=... npm run export:vivacity-manifest
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateVivacityData } from '../src/lib/services/vivacity-counter/vivacity-countline-utils.js';
import { withVivacityCountsClasses } from '../src/lib/server/vivacity-counts-classes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANIFEST_PATH = join(ROOT, 'static/data/vivacity-sensor-manifest.json');
const OUT_PATH = join(ROOT, 'static/data/vivacity-sensor-timeseries-snapshot.json');

const DAILY_SPAN_DAYS = 365;
const TIME_WINDOW_DAYS = 60;
const PAUSE_MS = 800;

function formatDateForVivacity(date) {
	return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/** @param {unknown[]} a @param {unknown[]} b */
function mergeRowsByFrom(a, b) {
	/** @type {Map<string, object>} */
	const m = new Map();
	for (const r of a || []) {
		if (r && typeof r === 'object' && r.from) m.set(String(r.from), r);
	}
	for (const r of b || []) {
		if (r && typeof r === 'object' && r.from) m.set(String(r.from), r);
	}
	return [...m.values()].sort((x, y) => String(x.from).localeCompare(String(y.from)));
}

/**
 * @param {Date} fromDay UTC midnight
 * @param {Date} toDay UTC midnight (exclusive end for last bucket alignment with Vivacity)
 */
function* iterTimeWindows(fromDay, toDay, maxDays) {
	let cur = new Date(fromDay.getTime());
	const end = new Date(toDay.getTime());
	while (cur < end) {
		const nxt = new Date(Math.min(cur.getTime() + maxDays * 86400000, end.getTime()));
		yield [new Date(cur.getTime()), nxt];
		cur = nxt;
	}
}

async function readVivacityJson(response, label) {
	const text = await response.text();
	if (!response.ok) {
		throw new Error(`${label} HTTP ${response.status}: ${text.slice(0, 400)}`);
	}
	return JSON.parse(text);
}

/**
 * @param {string} clid
 * @param {Date} fromDay
 * @param {Date} toDay
 * @param {string} apiKey
 * @param {string} logTag
 */
async function fetchOneCountlineDailyWindows(clid, fromDay, toDay, apiKey, logTag) {
	const options = {
		method: 'GET',
		headers: { Accept: 'application/json', 'x-vivacity-api-key': apiKey }
	};

	const windows = [...iterTimeWindows(fromDay, toDay, TIME_WINDOW_DAYS)];
	console.info(logTag, 'countline', clid, 'windows', windows.length, 'maxDays', TIME_WINDOW_DAYS);

	/** @type {unknown[]} */
	let mergedRows = [];
	let wi = 0;
	for (const [wFrom, wTo] of windows) {
		if (wFrom >= wTo) continue;
		const fromISO = formatDateForVivacity(wFrom);
		const toISO = formatDateForVivacity(wTo);
		const url = withVivacityCountsClasses(
			`https://api.vivacitylabs.com/countline/counts?countline_ids=${clid}&from=${fromISO}&to=${toISO}&time_bucket=24h`
		);
		const t0 = Date.now();
		console.info(logTag, `window ${++wi}/${windows.length}`, { urlLen: url.length, fromISO, toISO });
		const res = await fetch(url, options);
		const part = await readVivacityJson(res, `${logTag} w${wi}`);
		const rows = part[clid] || part[String(clid)] || [];
		mergedRows = mergeRowsByFrom(mergedRows, rows);
		console.info(logTag, `window ok rows=${rows.length} total=${mergedRows.length} ms=${Date.now() - t0}`);
		if (wi < windows.length) await sleep(PAUSE_MS);
	}
	return mergedRows;
}

/**
 * @param {string[]} ids
 * @param {string} fromDailyISO
 * @param {string} toDayISO
 * @param {string} apiKey
 * @param {string} logTag
 */
async function fetchSensorMergedSlow(ids, fromDailyISO, toDayISO, apiKey, logTag) {
	const fromDay = new Date(fromDailyISO);
	const toDay = new Date(toDayISO);
	/** @type {Record<string, unknown[]>} */
	const merged = {};
	for (let i = 0; i < ids.length; i++) {
		const clid = ids[i];
		console.info(logTag, `countline ${i + 1}/${ids.length}`, clid);
		merged[clid] = await fetchOneCountlineDailyWindows(clid, fromDay, toDay, apiKey, `${logTag} cl${i + 1}`);
		if (i < ids.length - 1) await sleep(PAUSE_MS);
	}
	return merged;
}

async function main() {
	const apiKey = process.env.VIVACITY_API;
	if (!apiKey) {
		console.error('Set VIVACITY_API in the environment.');
		process.exit(1);
	}

	const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
	if (!manifest?.sensors?.length) {
		console.error('No sensors in', MANIFEST_PATH, '— run export-vivacity-sensor-manifest.mjs first.');
		process.exit(1);
	}

	const toDay = new Date();
	toDay.setUTCHours(0, 0, 0, 0);
	const fromDaily = new Date(toDay.getTime() - DAILY_SPAN_DAYS * 86400000);
	const fromDailyISO = formatDateForVivacity(fromDaily);
	const toDayISO = formatDateForVivacity(toDay);

	console.info('[snapshot] range', { fromDailyISO, toDayISO, TIME_WINDOW_DAYS, PAUSE_MS });

	/** @type {Record<string, { countlineIds: string[], dailyAggregated: unknown[] }>} */
	const sensors = {};

	for (const s of manifest.sensors) {
		const sensorId = String(s.sensor_id);
		const ids = (s.countline_ids || []).map(String).filter(Boolean);
		if (ids.length === 0) {
			console.warn('skip sensor', sensorId, '(no countlines)');
			continue;
		}
		console.info('=== snapshot sensor', sensorId, { countlines: ids.length }, '===');
		try {
			const merged = await fetchSensorMergedSlow(ids, fromDailyISO, toDayISO, apiKey, `sensor ${sensorId}`);
			const dailyAggregated = aggregateVivacityData(merged);
			sensors[sensorId] = {
				countlineIds: ids,
				dailyAggregated: Array.isArray(dailyAggregated) ? dailyAggregated : []
			};
			console.info('sensor OK', sensorId, { aggregatedRows: sensors[sensorId].dailyAggregated.length });
		} catch (e) {
			console.error('sensor failed', sensorId, e?.message || e);
		}
	}

	const out = {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		sensors
	};

	await writeFile(OUT_PATH, JSON.stringify(out), 'utf8');
	console.info('Wrote', OUT_PATH, { sensorKeys: Object.keys(sensors).length });
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
