/**
 * Shared citywide Vivacity fetch: warm from +page on load, dedupe when provider mounts.
 */

import { fetchVivacityCitywide } from './vivacity-counter-api.js';

/**
 * @param {Array<{ sensor_id?: string|number, name?: string, countlines?: Array<{ id: string }> }>} markersData
 * @returns {Array<{ id: string, name: string, countlineIds: string[] }>}
 */
export function buildSensorsFromMarkers(markersData) {
	if (!markersData || !Array.isArray(markersData) || markersData.length === 0) {
		return [];
	}
	return markersData
		.map((m) => ({
			id: String(m.sensor_id),
			name: m.name || `Sensor ${m.sensor_id}`,
			countlineIds: (m.countlines || [])
				.map((c) => String(c?.id ?? c?.countline_id ?? c?.countlineId ?? '').trim())
				.filter((id) => id.length > 0 && id !== 'undefined')
		}))
		.filter((s) => s.countlineIds.length > 0);
}

function computeKey(sensors) {
	return sensors
		.map((s) => `${s.id}:${[...s.countlineIds].sort().join(',')}`)
		.sort()
		.join(';');
}

let cachedResponse = null;
let cacheKey = '';
let inflightPromise = null;
let inflightKey = '';

/**
 * @param {Array<{ id: string, name: string, countlineIds: string[] }>} sensors
 */
export function peekCitywideCache(sensors) {
	if (!sensors?.length) return null;
	const k = computeKey(sensors);
	if (k === cacheKey && cachedResponse) return cachedResponse;
	return null;
}

/**
 * @param {Array<{ id: string, name: string, countlineIds: string[] }>} sensors
 */
export async function loadCitywideData(sensors) {
	if (!sensors?.length) return null;
	const k = computeKey(sensors);
	if (k === cacheKey && cachedResponse) return cachedResponse;
	if (inflightKey === k && inflightPromise) return inflightPromise;

	inflightKey = k;
	inflightPromise = fetchVivacityCitywide(sensors)
		.then((json) => {
			cachedResponse = json;
			cacheKey = k;
			inflightPromise = null;
			inflightKey = '';
			return json;
		})
		.catch((err) => {
			inflightPromise = null;
			inflightKey = '';
			throw err;
		});

	return inflightPromise;
}

/** Start citywide fetch as soon as markers exist (browser only). */
export function warmCitywideFromMarkers(markersData) {
	if (typeof window === 'undefined') return;
	const sensors = buildSensorsFromMarkers(markersData);
	if (sensors.length === 0) return;
	void loadCitywideData(sensors);
}
