/**
 * Vivacity `GET /hardware/metadata` response shape varies by API version / tenant.
 * Static `vivacity_markers.json` has no countlines — we must merge from this payload.
 */

/**
 * @param {unknown} raw
 * @returns {Record<string, object>|null} map sensor id string → hardware record
 */
export function normalizeVivacityHardwareMetadataRoot(raw) {
	if (raw == null) return null;
	if (Array.isArray(raw)) {
		const out = {};
		for (const item of raw) {
			if (!item || typeof item !== 'object') continue;
			const sid = item.sensor_id ?? item.sensorId ?? item.site_id ?? item.siteId ?? item.id;
			if (sid != null && sid !== '') out[String(sid)] = item;
		}
		return Object.keys(out).length ? out : null;
	}
	if (typeof raw !== 'object') return null;

	if (raw.data != null && typeof raw.data === 'object') {
		const inner = normalizeVivacityHardwareMetadataRoot(raw.data);
		if (inner) return inner;
	}
	if (Array.isArray(raw.sites)) {
		return normalizeVivacityHardwareMetadataRoot(raw.sites);
	}
	if (Array.isArray(raw.hardware)) {
		return normalizeVivacityHardwareMetadataRoot(raw.hardware);
	}
	if (Array.isArray(raw.results)) {
		return normalizeVivacityHardwareMetadataRoot(raw.results);
	}
	if (raw.metadata != null && typeof raw.metadata === 'object') {
		const inner = normalizeVivacityHardwareMetadataRoot(raw.metadata);
		if (inner) return inner;
	}

	const keys = Object.keys(raw);
	for (const k of keys) {
		const v = raw[k];
		if (v && typeof v === 'object' && (v.view_points || v.viewPoints || v.viewpoints)) {
			return /** @type {Record<string, object>} */ (raw);
		}
	}
	return null;
}

/**
 * @param {object | null | undefined} sensorMetadata one sensor record from normalized map
 * @returns {Array<{ id: string, name?: string, description?: string, direction?: string }>}
 */
export function extractCountlinesFromSensorMetadata(sensorMetadata) {
	if (!sensorMetadata || typeof sensorMetadata !== 'object') return [];

	const vps =
		sensorMetadata.view_points ??
		sensorMetadata.viewPoints ??
		sensorMetadata.viewpoints;

	if (!vps) return [];

	/** @type {Array<{ id: string, name?: string, description?: string, direction?: string }>} */
	const list = [];
	const viewPointsList = Array.isArray(vps) ? vps : Object.values(vps);

	for (const viewPoint of viewPointsList) {
		if (!viewPoint || typeof viewPoint !== 'object') continue;
		const cls =
			viewPoint.countlines ?? viewPoint.countLines ?? viewPoint.count_lines ?? viewPoint.lines;

		if (!cls) continue;

		if (Array.isArray(cls)) {
			for (const cl of cls) {
				if (!cl || typeof cl !== 'object') continue;
				const id = cl.id ?? cl.countline_id ?? cl.countlineId;
				if (id == null || id === '') continue;
				list.push({
					id: String(id),
					name: cl.name,
					description: cl.description,
					direction: cl.direction
				});
			}
		} else if (typeof cls === 'object') {
			for (const [countlineKey, countlineData] of Object.entries(cls)) {
				if (!countlineData || typeof countlineData !== 'object') continue;
				const id =
					countlineData.id ?? countlineData.countline_id ?? countlineData.countlineId ?? countlineKey;
				if (id == null || id === '') continue;
				list.push({
					id: String(id),
					name: countlineData.name,
					description: countlineData.description,
					direction: countlineData.direction
				});
			}
		}
	}

	return list;
}

/**
 * @param {Record<string, object>|null} root
 * @param {string|number} sensorId from marker
 * @returns {object|undefined}
 */
export function pickSensorHardwareRecord(root, sensorId) {
	if (!root || sensorId == null || sensorId === '') return undefined;
	const sid = String(sensorId);
	let rec = root[sid] ?? root[String(Number(sensorId))];
	if (rec) return rec;
	const n = Number(sensorId);
	if (Number.isFinite(n)) rec = root[String(n)];
	if (rec) return rec;
	const lower = sid.toLowerCase();
	for (const k of Object.keys(root)) {
		if (String(k).toLowerCase() === lower) return root[k];
	}
	return undefined;
}
