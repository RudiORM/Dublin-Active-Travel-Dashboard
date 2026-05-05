#!/usr/bin/env node
/**
 * Compare Vivacity `hardware/metadata` to `static/vivacity_markers.json` and print
 * sensors that exist in the API but are not in your markers file, with lat/long when found.
 *
 * Uses the same coordinate + countline parsing as `processVivacityCounterLocations`.
 *
 *   VIVACITY_API=... node scripts/list-vivacity-sensors-not-in-markers.mjs
 *
 * Options:
 *   --json-out=path     Write suggested marker objects (JSON array) for copy/paste
 *   --all               List every metadata sensor with coords (not only missing from markers)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { processVivacityCounterLocations } from '../src/lib/services/vivacity-counter/vivacity-counter-processor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function resolveFromRoot(p, fallback) {
	const raw = p || fallback;
	return raw.startsWith('/') ? raw : join(ROOT, raw);
}

const MARKERS_PATH = resolveFromRoot(process.env.VIVACITY_MARKERS_PATH, 'static/vivacity_markers.json');

/** Try view_points when top-level coords are missing (metadata shape varies). */
function fillCoordsFromViewPoints(loc) {
	if (loc.latitude != null && loc.longitude != null) return loc;
	const vpObj = loc.originalData?.view_points;
	if (!vpObj || typeof vpObj !== 'object') return loc;
	for (const vp of Object.values(vpObj)) {
		if (!vp || typeof vp !== 'object') continue;
		const lat = vp.lat ?? vp.latitude ?? vp.location?.lat ?? vp.location?.latitude;
		const lon = vp.lon ?? vp.long ?? vp.longitude ?? vp.location?.lon ?? vp.location?.long ?? vp.location?.longitude;
		if (lat != null && lon != null) {
			return { ...loc, latitude: lat, longitude: lon };
		}
		if (Array.isArray(vp.coordinates) && vp.coordinates.length >= 2) {
			return { ...loc, latitude: vp.coordinates[1], longitude: vp.coordinates[0] };
		}
	}
	return loc;
}

async function main() {
	const apiKey = process.env.VIVACITY_API;
	if (!apiKey) {
		console.error('Set VIVACITY_API in the environment.');
		process.exit(1);
	}

	const jsonOutArg = process.argv.find((a) => a.startsWith('--json-out='));
	const jsonOutPath = jsonOutArg ? jsonOutArg.split('=')[1] : null;
	const listAll = process.argv.includes('--all');

	const markers = JSON.parse(await readFile(MARKERS_PATH, 'utf8'));
	const known = new Set((Array.isArray(markers) ? markers : []).map((m) => String(m.sensor_id)));

	const res = await fetch('https://api.vivacitylabs.com/hardware/metadata', {
		headers: { Accept: 'application/json', 'x-vivacity-api-key': apiKey }
	});
	const text = await res.text();
	if (!res.ok) {
		console.error('metadata HTTP', res.status, text.slice(0, 500));
		process.exit(1);
	}
	let raw = JSON.parse(text);
	if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
		raw = raw.data;
	}

	const locations = processVivacityCounterLocations(raw).map(fillCoordsFromViewPoints);

	const filtered = listAll
		? locations
		: locations.filter((loc) => loc?.id != null && !known.has(String(loc.id)));

	filtered.sort((a, b) => String(a.id).localeCompare(String(b.id)));

	console.info(
		listAll
			? `Vivacity metadata sensors: ${locations.length} (showing all with --all)`
			: `Sensors in metadata but NOT in ${MARKERS_PATH}: ${filtered.length} (of ${locations.length} total parsed)`
	);
	console.info('');

	const rows = [];
	for (const loc of filtered) {
		const id = String(loc.id);
		const name = loc.name || `Sensor ${id}`;
		const lat = loc.latitude;
		const lon = loc.longitude;
		const nCl = Array.isArray(loc.countlines) ? loc.countlines.length : 0;
		const coordOk = lat != null && lon != null;
		rows.push({ id, name, lat, lon, nCl, coordOk });
		console.info(
			`${id.padEnd(8)}  ${coordOk ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}` : '(no coords)'.padEnd(24)}  countlines:${String(nCl).padStart(3)}  ${name.slice(0, 60)}`
		);
	}

	if (!listAll && filtered.length === 0) {
		console.info('\nNo new sensor IDs vs markers file. Use --all to inspect every parsed sensor.');
	}

	if (jsonOutPath) {
		const outPath = jsonOutPath.startsWith('/') ? jsonOutPath : join(ROOT, jsonOutPath);
		const suggested = rows
			.filter((r) => r.coordOk)
			.map((r) => ({
				name: r.name,
				sensor_id: r.id,
				lat: r.lat,
				long: r.lon,
				pedestrian_total: 0,
				cyclist_total: 0
			}));
		await writeFile(outPath, `${JSON.stringify(suggested, null, 2)}\n`, 'utf8');
		console.info(`\nWrote ${suggested.length} marker-shaped rows to ${outPath}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
