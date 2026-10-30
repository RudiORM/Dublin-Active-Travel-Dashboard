/**
 * Safe summaries for server logs (no full API bodies).
 */

const LOG = '[DATD Vivacity]';

/**
 * @param {unknown} raw
 */
export function describeVivacityMetadataPayload(raw) {
	if (raw == null) return { shape: 'null' };
	if (Array.isArray(raw)) {
		const first = raw[0];
		return {
			shape: 'array',
			length: raw.length,
			firstItemKeys:
				first && typeof first === 'object' && !Array.isArray(first)
					? Object.keys(first).slice(0, 16)
					: []
		};
	}
	if (typeof raw === 'object') {
		const keys = Object.keys(raw);
		const firstKey = keys[0];
		const firstVal = firstKey != null ? raw[firstKey] : null;
		return {
			shape: 'object',
			keyCount: keys.length,
			keysSample: keys.slice(0, 14),
			firstKey,
			firstValueKeys:
				firstVal && typeof firstVal === 'object' && !Array.isArray(firstVal)
					? Object.keys(firstVal).slice(0, 18)
					: typeof firstVal
		};
	}
	return { shape: typeof raw };
}

export function logVivacitySsrMerge(args) {
	const {
		staticMarkerCount,
		hasVivacityApiKey,
		rawMetaDiag,
		normalizedKeyCount,
		normalizedKeysSample,
		markersWithCountlines,
		sampleMarkers
	} = args;

	console.info(LOG, 'SSR merge summary', {
		staticMarkerCount,
		hasVivacityApiKey,
		rawMetadata: rawMetaDiag,
		normalizedSensorKeyCount: normalizedKeyCount,
		normalizedKeysSample,
		markersWithAtLeastOneCountline: markersWithCountlines,
		sampleMarkers
	});

	if (hasVivacityApiKey && staticMarkerCount > 0 && markersWithCountlines === 0) {
		console.warn(
			LOG,
			'SSR merge produced ZERO countlines across all markers — citywide POST will get empty countlineIds. Compare `sensor_id` in static/vivacity_markers.json to keys in normalized metadata (see normalizedKeysSample).'
		);
	}
}

export function logVivacityCitywideRequest(args) {
	console.info(LOG, 'POST /api/vivacity-counter/citywide', args);
}

export function logVivacityCitywideResult(args) {
	console.info(LOG, 'citywide response summary', args);
}

export { LOG as VIVACITY_DIAG_LOG_PREFIX };
