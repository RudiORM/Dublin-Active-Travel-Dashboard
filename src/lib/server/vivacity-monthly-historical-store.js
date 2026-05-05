/**
 * Static on-disk store for citywide network monthly totals (see static/data/…json).
 * Server-only — uses Node fs (not available in browser bundles for client).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** @returns {string} */
export function getMonthlyHistoricalJsonPath() {
	return join(process.cwd(), 'static', 'data', 'vivacity-citywide-monthly-historical.json');
}

/** @param {string} monthKey "YYYY-MM" */
export function addOneUtcMonthKey(monthKey) {
	const [ys, ms] = monthKey.split('-').map(Number);
	if (!Number.isFinite(ys) || !Number.isFinite(ms)) return monthKey;
	const d = new Date(Date.UTC(ys, ms - 1 + 1, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Every full UTC calendar month strictly before the current month and after `lastMonthKeyInFile`.
 * @param {string | null} lastMonthKeyInFile max YYYY-MM present in store, or null if empty
 * @param {Date} toDayUtcMidnight "today" at 00:00 UTC (same as citywide handler)
 * @returns {Array<{ monthKey: string, label: string, fromISO: string, toISO: string }>}
 */
export function listMissingCompleteMonthsAfter(lastMonthKeyInFile, toDayUtcMidnight) {
	const curY = toDayUtcMidnight.getUTCFullYear();
	const curM = toDayUtcMidnight.getUTCMonth();
	const currentMonthStartMs = Date.UTC(curY, curM, 1);

	if (!lastMonthKeyInFile) return [];

	const out = [];
	let cursor = addOneUtcMonthKey(lastMonthKeyInFile);
	for (;;) {
		const [cy, cm] = cursor.split('-').map(Number);
		if (!Number.isFinite(cy) || !Number.isFinite(cm)) break;
		const monthStartMs = Date.UTC(cy, cm - 1, 1);
		if (monthStartMs >= currentMonthStartMs) break;

		const fromD = new Date(Date.UTC(cy, cm - 1, 1, 0, 0, 0, 0));
		const toD = new Date(Date.UTC(cy, cm, 1, 0, 0, 0, 0));
		const label = fromD.toLocaleDateString('en-IE', {
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
		out.push({
			monthKey: cursor,
			label,
			fromISO: fromD.toISOString().replace(/\.\d{3}Z$/, '.000Z'),
			toISO: toD.toISOString().replace(/\.\d{3}Z$/, '.000Z')
		});
		cursor = addOneUtcMonthKey(cursor);
	}
	return out;
}

/** @param {Array<{ monthKey: string }>} months */
export function getLastMonthKeyInStore(months) {
	if (!Array.isArray(months) || months.length === 0) return null;
	const keys = months.map((m) => m.monthKey).filter(Boolean);
	if (keys.length === 0) return null;
	return [...keys].sort((a, b) => a.localeCompare(b)).pop() ?? null;
}

/**
 * @param {object} store
 * @returns {Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>}
 */
export function networkMonthlyTotalsLast12FromStore(store) {
	const months = Array.isArray(store?.months) ? store.months : [];
	const sorted = [...months].sort((a, b) => String(a.monthKey).localeCompare(String(b.monthKey)));
	const tail = sorted.slice(-12);
	return tail.map((m) => ({
		monthKey: m.monthKey,
		label: m.label || m.monthKey,
		pedestrian: Math.round(Number(m.pedestrian) || 0),
		bike: Math.round(Number(m.bike) || 0)
	}));
}

/**
 * Merge new rows into store.months by monthKey (replace if exists).
 * @param {object} store
 * @param {Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>} newRows
 */
export function mergeMonthsIntoStore(store, newRows) {
	const map = new Map();
	for (const m of store.months || []) {
		if (m?.monthKey) map.set(m.monthKey, { ...m });
	}
	for (const n of newRows) {
		if (!n?.monthKey) continue;
		map.set(n.monthKey, {
			monthKey: n.monthKey,
			label: n.label,
			pedestrian: n.pedestrian,
			bike: n.bike
		});
	}
	const merged = [...map.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
	return { ...store, months: merged };
}

/**
 * @param {string} [jsonPath]
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} [fetcher]
 * @param {string} [origin]
 * @returns {Promise<object>}
 */
export async function readMonthlyHistoricalStore(
	jsonPath = getMonthlyHistoricalJsonPath(),
	fetcher = undefined,
	origin = ''
) {
	try {
		const raw = await readFile(jsonPath, 'utf8');
		const data = JSON.parse(raw);
		if (!data || typeof data !== 'object') return { version: 1, months: [] };
		if (!Array.isArray(data.months)) data.months = [];
		return data;
	} catch {
		// Try deployed static asset path on serverless hosts.
		if (fetcher && origin) {
			try {
				const res = await fetcher(`${origin}/data/vivacity-citywide-monthly-historical.json`);
				if (res.ok) {
					const data = await res.json();
					if (!data || typeof data !== 'object') return { version: 1, months: [] };
					if (!Array.isArray(data.months)) data.months = [];
					return data;
				}
			} catch {
				// ignore and return empty store below
			}
		}
		return { version: 1, months: [] };
	}
}

/** @param {object} store */
export async function writeMonthlyHistoricalStore(store, jsonPath = getMonthlyHistoricalJsonPath()) {
	await mkdir(dirname(jsonPath), { recursive: true });
	const body = `${JSON.stringify(store, null, '\t')}\n`;
	await writeFile(jsonPath, body, 'utf8');
}
