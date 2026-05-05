#!/usr/bin/env node
/**
 * Writes static/data/vivacity-sensor-manifest.json — sensor_id → countline_ids for offline snapshot jobs.
 *
 *   VIVACITY_API=... node scripts/export-vivacity-sensor-manifest.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	normalizeVivacityHardwareMetadataRoot,
	extractCountlinesFromSensorMetadata,
	pickSensorHardwareRecord
} from '../src/lib/server/vivacity-metadata-merge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MARKERS_PATH = join(ROOT, 'static/vivacity_markers.json');
const OUT_PATH = join(ROOT, 'static/data/vivacity-sensor-manifest.json');

async function readVivacityJson(response, label) {
	const text = await response.text();
	if (!response.ok) {
		throw new Error(`${label} HTTP ${response.status}: ${text.slice(0, 400)}`);
	}
	return JSON.parse(text);
}

async function main() {
	const apiKey = process.env.VIVACITY_API;
	if (!apiKey) {
		console.error('Set VIVACITY_API in the environment.');
		process.exit(1);
	}

	const markers = JSON.parse(await readFile(MARKERS_PATH, 'utf8'));
	if (!Array.isArray(markers) || markers.length === 0) {
		console.error('No markers at', MARKERS_PATH);
		process.exit(1);
	}

	const metaRes = await fetch('https://api.vivacitylabs.com/hardware/metadata', {
		headers: { Accept: 'application/json', 'x-vivacity-api-key': apiKey }
	});
	const metadataRaw = await readVivacityJson(metaRes, 'hardware/metadata');
	const root = normalizeVivacityHardwareMetadataRoot(metadataRaw);
	if (!root) {
		console.error('Could not normalize hardware/metadata — no manifest written.');
		process.exit(1);
	}

	/** @type {{ sensor_id: string, countline_ids: string[] }[]} */
	const sensors = [];
	for (const marker of markers) {
		const sid = marker?.sensor_id;
		if (sid == null) continue;
		const rec = pickSensorHardwareRecord(root, sid);
		const countlines = extractCountlinesFromSensorMetadata(rec);
		const countline_ids = countlines.map((c) => String(c.id)).filter(Boolean);
		if (countline_ids.length === 0) continue;
		sensors.push({ sensor_id: String(sid), countline_ids });
	}

	const out = {
		exportedAt: new Date().toISOString(),
		sensors
	};

	await writeFile(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
	console.info('Wrote', OUT_PATH, { sensorCount: sensors.length });
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
