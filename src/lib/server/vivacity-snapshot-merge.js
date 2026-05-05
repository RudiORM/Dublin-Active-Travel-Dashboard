/**
 * Offline `vivacity-sensor-timeseries-snapshot.json` + incremental Vivacity fetches.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** @param {string[]} a @param {string[]} b */
export function sameCountlineSet(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
	const sa = [...new Set(a.map(String))].sort();
	const sb = [...new Set(b.map(String))].sort();
	if (sa.length !== sb.length) return false;
	return sa.every((v, i) => v === sb[i]);
}

/**
 * Dedupe by `from` (ISO); later rows win (newer API data overwrites snapshot day).
 * @param {unknown[]} existing
 * @param {unknown[]} incoming
 */
export function mergeDailyAggregatedRows(existing, incoming) {
	/** @type {Map<string, object>} */
	const map = new Map();
	for (const r of existing || []) {
		if (r && typeof r === 'object' && r.from) map.set(String(r.from), r);
	}
	for (const r of incoming || []) {
		if (r && typeof r === 'object' && r.from) map.set(String(r.from), r);
	}
	return [...map.values()].sort((a, b) => new Date(a.from) - new Date(b.from));
}

/**
 * @param {unknown[]} sortedRows chronologically sorted
 * @param {number} days
 */
export function trimDailyToLastDays(sortedRows, days) {
	if (!Array.isArray(sortedRows) || sortedRows.length === 0) return sortedRows;
	const last = new Date(/** @type {{from:string}} */ (sortedRows[sortedRows.length - 1]).from);
	const start = new Date(last.getTime() - days * 86400000);
	return sortedRows.filter((r) => r && r.from && new Date(r.from) >= start);
}

/**
 * @param {string} lastFromIso last `from` in snapshot daily rows
 * @param {(d: Date) => string} formatDateForVivacity
 */
export function nextUtcDayStartIso(lastFromIso, formatDateForVivacity) {
	const d = new Date(lastFromIso);
	if (Number.isNaN(d.getTime())) return null;
	d.setUTCDate(d.getUTCDate() + 1);
	d.setUTCHours(0, 0, 0, 0);
	return formatDateForVivacity(d);
}

/**
 * @param {string} [cwd]
 * @returns {Promise<{ schemaVersion?: number, generatedAt?: string, sensors?: Record<string, { countlineIds?: string[], dailyAggregated?: unknown[] }> } | null>}
 */
export async function readVivacitySensorTimeseriesSnapshot(cwd = process.cwd()) {
	try {
		const p = join(cwd, 'static/data/vivacity-sensor-timeseries-snapshot.json');
		const raw = await readFile(p, 'utf8');
		const j = JSON.parse(raw);
		if (j && typeof j === 'object' && j.sensors && typeof j.sensors === 'object') return j;
	} catch {
		// missing or invalid
	}
	return null;
}
