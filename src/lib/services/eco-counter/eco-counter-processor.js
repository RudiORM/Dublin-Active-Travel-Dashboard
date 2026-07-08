/**
 * Eco-Counter Data Processor
 * Processes raw API data into usable format for components
 */

/**
 * Process eco-counter locations data from API response
 * Transforms sites data into format suitable for map markers
 */
export function processEcoCounterLocations(sitesData) {
	
	// Handle both direct array and wrapped data formats
	let sites;
	if (Array.isArray(sitesData)) {
		sites = sitesData;
	} else if (sitesData && sitesData.data && Array.isArray(sitesData.data)) {
		sites = sitesData.data;
	} else {
		return [];
	}

	// Transform sites into marker format
	const locations = sites.map(site => ({
		id: site.id,
		name: site.name,
		latitude: site.location.lat,  // Note: location is an object with lat/lon
		longitude: site.location.lon,
		description: site.description || '',
		// Additional properties that might be useful
		travelModes: site.travelModes || [],
		directional: site.directional || false,
		firstData: site.firstData,
		lastData: site.lastData,
		// Store original data for reference
		originalData: site
	}));

	return locations;
}

/**
 * Raw ADT API rows use `value` (Eco v2); older code expected `averageDailyTraffic`.
 */
function averageDailyFromTrafficRow(row) {
	if (row == null || typeof row !== 'object') return 0;
	const n =
		row.averageDailyTraffic ??
		row.value ??
		row.average_daily_traffic ??
		row.adt ??
		row.count;
	if (typeof n === 'number' && Number.isFinite(n)) return n;
	const p = parseFloat(n);
	return Number.isFinite(p) ? p : 0;
}

/**
 * Unwrap server `{ data: payload }` and/or API list vs nested `data` arrays.
 * @returns {Array<Object>}
 */
function extractEcoTrafficRowArray(trafficPayload) {
	if (trafficPayload == null) return [];
	let root = trafficPayload;
	if (root && typeof root === 'object' && !Array.isArray(root) && 'data' in root) {
		root = root.data;
	}
	if (Array.isArray(root)) {
		return root;
	}
	if (root && typeof root === 'object' && Array.isArray(root.data)) {
		return root.data;
	}
	if (root && typeof root === 'object' && Array.isArray(root.content)) {
		return root.content;
	}
	return [];
}

/**
 * Process eco-counter traffic data from API response
 * Combines traffic data with site information
 */
export function processEcoCounterTraffic(trafficData, sitesData) {
	const rows = extractEcoTrafficRowArray(trafficData);
	if (rows.length === 0) {
		return [];
	}

	const sitesMap = {};
	if (sitesData && sitesData.data && Array.isArray(sitesData.data)) {
		sitesData.data.forEach((site) => {
			sitesMap[site.id] = site;
		});
	}

	const processedTraffic = [];
	for (const traffic of rows) {
		if (!traffic || typeof traffic !== 'object') continue;
		const siteIdRaw = traffic.siteId ?? traffic.site_id ?? traffic.id;
		if (siteIdRaw == null) continue;
		const siteId = Number(siteIdRaw);
		const travelMode = traffic.travelMode ?? traffic.travel_mode ?? traffic.mode;
		if (travelMode == null) continue;

		processedTraffic.push({
			siteId,
			siteName: sitesMap[siteId]?.name || sitesMap[siteIdRaw]?.name || `Site ${siteId}`,
			travelMode,
			averageDailyTraffic: averageDailyFromTrafficRow(traffic),
			originalData: traffic
		});
	}

	return processedTraffic;
}

/**
 * Combine locations and traffic data for easy access
 */
export function combineEcoCounterData(locations, traffic) {
	const trafficMap = {};
	traffic.forEach((t) => {
		const sid = Number(t.siteId);
		if (!Number.isFinite(sid)) return;
		if (!trafficMap[sid]) {
			trafficMap[sid] = {};
		}
		trafficMap[sid][t.travelMode] = t;
	});

	const combinedData = locations.map((location) => {
		const lid = Number(location.id);
		const bySite = Number.isFinite(lid) ? trafficMap[lid] : {};
		return {
			...location,
			traffic: bySite || {},
			totalTraffic: Object.values(bySite || {}).reduce(
				(sum, row) => sum + (row.averageDailyTraffic || 0),
				0
			)
		};
	});

	return combinedData;
}

/** Eco `history/traffic/raw` payload may be a bare flow list or wrapped. */
function unwrapEcoRawFlows(payload) {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload;
	if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
		return payload.data;
	}
	return [];
}

/**
 * Per calendar day (UTC date) totals for pedestrian / bike from one site’s P1D raw response.
 * @returns {Map<string, { pedestrian: number, bike: number }>} keys `YYYY-MM-DD`
 */
export function accumulateEcoDailyFromRawFlows(hourly30Payload) {
	const flows = unwrapEcoRawFlows(hourly30Payload);
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byDay = new Map();

	for (const flow of flows) {
		const travelMode = normalizeEcoTravelMode(
			flow.travelMode ?? flow.travel_mode ?? flow.mode ?? flow.userType
		);
		if (!travelMode) continue;
		const data = flow.data;
		if (!Array.isArray(data)) continue;
		for (const interval of data) {
			const ts = interval.timestamp;
			if (!ts) continue;
			const c = Number(interval.counts ?? interval.value ?? 0) || 0;
			const d = new Date(ts);
			if (Number.isNaN(d.getTime())) continue;
			const key = d.toISOString().slice(0, 10);
			if (!byDay.has(key)) {
				byDay.set(key, { pedestrian: 0, bike: 0 });
			}
			byDay.get(key)[travelMode] += c;
		}
	}
	return byDay;
}

/** Sum per-day maps from many sites (network total per UTC day). */
export function mergeEcoDailyByDayMaps(dayMaps) {
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const merged = new Map();
	for (const m of dayMaps) {
		if (!m || typeof m.entries !== 'function') continue;
		for (const [k, v] of m.entries()) {
			if (!merged.has(k)) {
				merged.set(k, { pedestrian: 0, bike: 0 });
			}
			const t = merged.get(k);
			t.pedestrian += v.pedestrian || 0;
			t.bike += v.bike || 0;
		}
	}
	return merged;
}

/**
 * Per-site sums over the same P1D window as `dayMaps[i]` for `siteIds[i]` (before merge).
 * Used so overview “counts by sensor” matches merged raw history, not statistical ADT×30.
 * @param {(Map<string, { pedestrian: number, bike: number }>|null|undefined)[]} dayMaps
 * @param {number[]} siteIds
 * @returns {Array<{ siteId: number, pedestrian: number, bike: number }>}
 */
export function ecoPerSiteTotalsFromDayMaps(dayMaps, siteIds) {
	if (!Array.isArray(siteIds) || !Array.isArray(dayMaps)) return [];
	return siteIds.map((siteId, i) => {
		const m = dayMaps[i];
		let pedestrian = 0;
		let bike = 0;
		if (m && typeof m.entries === 'function') {
			for (const [, v] of m.entries()) {
				pedestrian += v.pedestrian || 0;
				bike += v.bike || 0;
			}
		}
		return {
			siteId: Number(siteId),
			pedestrian: Math.round(pedestrian),
			bike: Math.round(bike)
		};
	});
}

/**
 * @param {Map<string, { pedestrian: number, bike: number }>} map
 * @returns {Array<{ from: string, pedestrian: number, bike: number }>}
 */
export function ecoDailyMapToAggregatedRows(map) {
	return [...map.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, v]) => ({
			from: `${key}T00:00:00.000Z`,
			pedestrian: v.pedestrian,
			bike: v.bike
		}));
}

/**
 * Eco v2 `userType` style ints: 1 pedestrian, 2 bicycle (see Eco-Visio docs).
 * @returns {'pedestrian'|'bike'|null}
 */
function normalizeEcoTravelMode(raw) {
	if (raw == null) return null;
	if (typeof raw === 'number') {
		if (raw === 1) return 'pedestrian';
		if (raw === 2) return 'bike';
		return null;
	}
	const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
	if (s === 'pedestrian' || s === 'walker' || s === 'walking' || s === 'foot') return 'pedestrian';
	if (s === 'bike' || s === 'bicycle' || s === 'cyclist' || s === 'cycling' || s === 'cycle') return 'bike';
	return null;
}

/**
 * Collect `{ travelMode, data }[]` from Eco `history/traffic/aggregated` payloads (shape varies by domain/API version).
 * @returns {Array<{ travelMode: 'pedestrian'|'bike', data: object[] }>}
 */
function extractEcoAggregatedTravelModeSeries(payload) {
	/** @type {Array<{ travelMode: 'pedestrian'|'bike', data: object[] }>} */
	const out = [];

	function pushSeries(tmRaw, data) {
		const mode = normalizeEcoTravelMode(tmRaw);
		if (!mode || !Array.isArray(data) || data.length === 0) return;
		out.push({ travelMode: mode, data });
	}

	function consumeFlowArray(flows) {
		if (!Array.isArray(flows)) return;
		for (const flow of flows) {
			if (!flow || typeof flow !== 'object') continue;
			const tm = flow.travelMode ?? flow.travel_mode ?? flow.mode ?? flow.userType;
			const data =
				flow.data ?? flow.points ?? flow.values ?? flow.records ?? flow.items ?? flow.intervals;
			pushSeries(tm, data);
		}
	}

	if (!payload) return out;

	if (Array.isArray(payload)) {
		const first = payload[0];
		if (
			first &&
			typeof first === 'object' &&
			Array.isArray(first.data) &&
			(first.travelMode != null || first.travel_mode != null || first.mode != null || first.userType != null)
		) {
			consumeFlowArray(payload);
			if (out.length) return out;
		}
		const rowMode = normalizeEcoTravelMode(
			first?.travelMode ?? first?.travel_mode ?? first?.mode ?? first?.userType
		);
		if (
			first &&
			rowMode &&
			(first.timestamp != null ||
				first.isoDate != null ||
				first.counts != null ||
				first.count != null ||
				first.period != null ||
				first.date != null)
		) {
			const byMode = new Map();
			for (const row of payload) {
				const tm = normalizeEcoTravelMode(
					row.travelMode ?? row.travel_mode ?? row.mode ?? row.userType
				);
				if (!tm) continue;
				if (!byMode.has(tm)) byMode.set(tm, []);
				byMode.get(tm).push(row);
			}
			for (const [tm, rows] of byMode) {
				out.push({ travelMode: tm, data: rows });
			}
			return out;
		}
	}

	if (typeof payload === 'object' && !Array.isArray(payload)) {
		/** Prefer one series per mode: some domains expose both `bike` and `bicycle` (same counts), which would double monthly totals. */
		function pullModeKeyedArrays(obj) {
			if (!obj || typeof obj !== 'object') return;
			const pedKeys = ['pedestrian', 'walker', 'walking'];
			const bikeKeys = ['bike', 'bicycle', 'cyclist'];
			for (const key of pedKeys) {
				const arr = obj[key];
				if (Array.isArray(arr) && arr.length) {
					pushSeries(key, arr);
					break;
				}
			}
			for (const key of bikeKeys) {
				const arr = obj[key];
				if (Array.isArray(arr) && arr.length) {
					pushSeries(key, arr);
					break;
				}
			}
		}

		pullModeKeyedArrays(payload);
		if (out.length) return out;

		const nested = [
			payload.data,
			payload.content,
			payload.items,
			payload.results,
			payload.records,
			payload.hits,
			payload.value,
			payload.body,
			payload.flows,
			payload.series,
			payload.traffic
		];
		if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
			pullModeKeyedArrays(payload.data);
			if (out.length) return out;
			nested.push(payload.data.data, payload.data.content, payload.data.items, payload.data.flows);
		}
		for (const block of nested) {
			if (Array.isArray(block)) {
				consumeFlowArray(block);
				if (out.length) return out;
			}
		}

		const dataMaybe = payload.data;
		if (Array.isArray(dataMaybe)) {
			consumeFlowArray(dataMaybe);
			if (out.length) return out;
		}

		consumeFlowArray(payload.flows);
		if (out.length) return out;
	}

	return out;
}

/**
 * @param {object} interval - one bucket from aggregated P1M series
 * @returns {{ monthKey: string, count: number } | null} monthKey is `YYYY-MM` (UTC from timestamp when applicable)
 */
function ecoP1MIntervalToMonthCount(interval) {
	if (!interval || typeof interval !== 'object') return null;

	if (interval.period != null) {
		const p = String(interval.period).trim();
		if (/^\d{4}-\d{2}$/.test(p)) {
			const count = Number(
				interval.counts ?? interval.count ?? interval.value ?? interval.total ?? interval.volume
			);
			return { monthKey: p, count: Number.isFinite(count) ? count : 0 };
		}
	}

	const dateStr =
		interval.timestamp ??
		interval.isoDate ??
		interval.iso_date ??
		interval.from ??
		interval.startDate ??
		interval.start ??
		interval.date ??
		interval.day;

	if (dateStr == null) return null;

	let counts;
	const tr = interval.traffic;
	if (tr != null && typeof tr === 'object') {
		counts = tr.counts ?? tr.value ?? tr.total ?? tr.amount;
	} else if (tr != null && typeof tr !== 'object') {
		counts = tr;
	} else {
		counts =
			interval.counts ??
			interval.count ??
			interval.value ??
			interval.total ??
			interval.volume;
	}

	const count = Number(counts);
	const c = Number.isFinite(count) ? count : 0;

	let monthKey;
	if (typeof dateStr === 'string') {
		const trimmed = dateStr.trim();
		if (/^\d{4}-\d{2}$/.test(trimmed)) {
			monthKey = trimmed;
		} else {
			const d = new Date(trimmed);
			if (Number.isNaN(d.getTime())) return null;
			monthKey = d.toISOString().slice(0, 7);
		}
	} else {
		return null;
	}
	return { monthKey, count: c };
}

/**
 * Per calendar month totals (pedestrian / bike) from one site’s `granularity=P1M` aggregated response.
 * @returns {Map<string, { pedestrian: number, bike: number }>} keys `YYYY-MM`
 */
export function accumulateEcoMonthlyFromAggregatedP1M(payload) {
	const seriesList = extractEcoAggregatedTravelModeSeries(payload);
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byMonth = new Map();

	for (const { travelMode, data } of seriesList) {
		/** Drop repeated month rows within the same flow (some payloads duplicate buckets). */
		const seenMonth = new Set();
		for (const interval of data) {
			const parsed = ecoP1MIntervalToMonthCount(interval);
			if (!parsed) continue;
			const { monthKey, count } = parsed;
			const dedupeKey = `${travelMode}:${monthKey}`;
			if (seenMonth.has(dedupeKey)) continue;
			seenMonth.add(dedupeKey);
			if (!byMonth.has(monthKey)) {
				byMonth.set(monthKey, { pedestrian: 0, bike: 0 });
			}
			byMonth.get(monthKey)[travelMode] += count;
		}
	}
	return byMonth;
}

/** Sum monthly maps from many sites (network total per `YYYY-MM`). */
export function mergeEcoMonthlyByMonthKeyMaps(monthMaps) {
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const merged = new Map();
	for (const m of monthMaps) {
		if (!m || typeof m.entries !== 'function') continue;
		for (const [k, v] of m.entries()) {
			if (!merged.has(k)) {
				merged.set(k, { pedestrian: 0, bike: 0 });
			}
			const t = merged.get(k);
			t.pedestrian += v.pedestrian || 0;
			t.bike += v.bike || 0;
		}
	}
	return merged;
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
 * Last twelve `YYYY-MM` buckets from merged network totals (for citywide chart).
 * @param {Map<string, { pedestrian: number, bike: number }>} mergedMap
 * @returns {Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>}
 */
export function ecoNetworkMonthlyTotalsLast12FromMerged(mergedMap) {
	if (!mergedMap || typeof mergedMap.entries !== 'function') return [];
	const currentMonth = ecoCurrentMonthKeyUtc();
	const sorted = [...mergedMap.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([monthKey]) => monthKey !== currentMonth);
	const tail = sorted.slice(-12);
	return tail.map(([monthKey, v]) => ({
		monthKey,
		label: formatEcoMonthLabelUtc(monthKey),
		pedestrian: Math.round(v.pedestrian || 0),
		bike: Math.round(v.bike || 0)
	}));
}

/**
 * Roll merged P1D daily counts into calendar months, then last 12 months for the network chart.
 * Used when `P1M` aggregated responses are empty or unparsable.
 * @param {Map<string, { pedestrian: number, bike: number }>} byDay keys `YYYY-MM-DD`
 * @returns {Array<{ monthKey: string, label: string, pedestrian: number, bike: number }>}
 */
export function ecoNetworkMonthlyTotalsFromDailyMap(byDay) {
	if (!byDay || typeof byDay.entries !== 'function') return [];
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byMonth = new Map();
	for (const [dayKey, v] of byDay.entries()) {
		if (typeof dayKey !== 'string' || dayKey.length < 7) continue;
		const monthKey = dayKey.slice(0, 7);
		if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
		if (!byMonth.has(monthKey)) {
			byMonth.set(monthKey, { pedestrian: 0, bike: 0 });
		}
		const t = byMonth.get(monthKey);
		t.pedestrian += v.pedestrian || 0;
		t.bike += v.bike || 0;
	}
	return ecoNetworkMonthlyTotalsLast12FromMerged(byMonth);
}

/** Recent weekly buckets used for citywide KPIs and per-site bar totals. */
export const ECO_CITYWIDE_RECENT_WEEKS = 4;

/** Monday of the current ISO week in UTC (`YYYY-MM-DD`). */
export function ecoCurrentWeekKeyUtc(now = new Date()) {
	const d = new Date(now);
	d.setUTCHours(0, 0, 0, 0);
	const weekday = d.getUTCDay();
	const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
	d.setUTCDate(d.getUTCDate() - daysFromMonday);
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Current calendar month in UTC (`YYYY-MM`). */
export function ecoCurrentMonthKeyUtc(now = new Date()) {
	const d = new Date(now);
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

/**
 * Drop the in-progress current week (incomplete bucket).
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 */
export function excludeEcoIncompleteWeeklyRows(weeklyRows, now = new Date()) {
	if (!Array.isArray(weeklyRows)) return [];
	const currentWeek = ecoCurrentWeekKeyUtc(now);
	return weeklyRows.filter((r) => r?.weekKey && r.weekKey !== currentWeek);
}

/**
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @param {'pedestrian'|'bike'} mode
 * @param {number} [approxDays]
 */
export function ecoNetworkKpisFromWeeklyTotals(weeklyRows, mode, approxDays = ECO_CITYWIDE_RECENT_WEEKS * 7) {
	const modeKey = mode === 'pedestrian' ? 'pedestrian' : 'bike';
	const tail = Array.isArray(weeklyRows) ? weeklyRows : [];
	const sum = tail.reduce((s, w) => s + (Number(w[modeKey]) || 0), 0);
	const avgDailyCount = approxDays > 0 ? sum / approxDays : 0;
	return { avgDailyCount };
}

/** e.g. `2026-06` → `Jun '26` */
export function formatEcoMonthShortYearLabel(monthKey) {
	const parts = String(monthKey).split('-');
	if (parts.length !== 2) return String(monthKey);
	const y = Number(parts[0]);
	const mo = Number(parts[1]);
	if (!Number.isFinite(y) || !Number.isFinite(mo)) return String(monthKey);
	const monthShort = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IE', {
		month: 'short',
		timeZone: 'UTC'
	});
	return `${monthShort} '${String(y).slice(-2)}`;
}

/** e.g. `Jun '26 vs '25` */
export function formatEcoYoyPeriodLabel(currentMonthKey, priorMonthKey) {
	const monthShort = formatEcoMonthShortYearLabel(currentMonthKey).split(' ')[0];
	const currentYy = String(currentMonthKey).slice(2, 4);
	const priorYy = String(priorMonthKey).slice(2, 4);
	return `${monthShort} '${currentYy} vs '${priorYy}`;
}

/** Last completed calendar month and the same month one year earlier (`YYYY-MM`). */
export function ecoLastCompletedMonthKeys(now = new Date()) {
	const d = new Date(now);
	if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
		d.setUTCHours(0, 0, 0, 0);
	}
	const firstOfCurrent = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
	const lastCompleted = new Date(firstOfCurrent.getTime() - 86400000);
	const currentMonthKey = `${lastCompleted.getUTCFullYear()}-${String(lastCompleted.getUTCMonth() + 1).padStart(2, '0')}`;
	const priorMonthKey = `${lastCompleted.getUTCFullYear() - 1}-${String(lastCompleted.getUTCMonth() + 1).padStart(2, '0')}`;
	return {
		currentMonthKey,
		priorMonthKey,
		periodLabel: formatEcoYoyPeriodLabel(currentMonthKey, priorMonthKey)
	};
}

/**
 * Network YoY for last completed month vs same month prior year.
 * Only sites with mode totals > 0 in both months are included.
 * @param {Array<{ siteId?: string|number, weekly?: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }>} perSiteWeekly
 * @param {'pedestrian'|'bike'} mode
 */
export function ecoNetworkYoyFromSiteWeekly(perSiteWeekly, mode, now = new Date()) {
	const modeKey = mode === 'pedestrian' ? 'pedestrian' : 'bike';
	const { currentMonthKey, priorMonthKey, periodLabel } = ecoLastCompletedMonthKeys(now);

	let sumPrior = 0;
	let sumCurrent = 0;
	let eligibleCount = 0;

	for (const block of perSiteWeekly || []) {
		const weekly = excludeEcoIncompleteWeeklyRows(block?.weekly || []);
		const byMonth = rollupEcoWeeklyRowsToMonthlyMap(weekly);
		const prior = byMonth.get(priorMonthKey);
		const current = byMonth.get(currentMonthKey);
		if (!prior || !current) continue;
		const priorVal = Number(prior[modeKey]) || 0;
		const currentVal = Number(current[modeKey]) || 0;
		if (priorVal <= 0 || currentVal <= 0) continue;
		sumPrior += priorVal;
		sumCurrent += currentVal;
		eligibleCount += 1;
	}

	if (eligibleCount === 0 || sumPrior <= 0) {
		return {
			percentChange: null,
			formatted: 'N/A',
			periodLabel,
			eligibleCount,
			sumPrior: 0,
			sumCurrent: 0
		};
	}

	const percentChange = ((sumCurrent - sumPrior) / sumPrior) * 100;
	const formatted =
		percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;

	return {
		percentChange,
		formatted,
		periodLabel,
		eligibleCount,
		sumPrior: Math.round(sumPrior),
		sumCurrent: Math.round(sumCurrent)
	};
}

/** @param {string} weekKey `YYYY-MM-DD` Monday */
export function formatEcoWeekKeyLabel(weekKey) {
	if (!weekKey) return '—';
	const d = new Date(`${weekKey}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-IE', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/**
 * Network overview from combined site data and weekly snapshot aggregates.
 * @param {Array<Object>} combinedLocations - output of combineEcoCounterData
 * @param {'pedestrian'|'bike'} mode
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>|null|undefined} networkWeeklyRecent - merged network weekly buckets (last ~4 weeks)
 * @param {Array<{ monthKey: string, label?: string, pedestrian?: number, bike?: number }>|null|undefined} networkMonthlyTotals - network monthly chart
 * @param {Array<{ siteId: number, pedestrian?: number, bike?: number }>|null|undefined} perSiteLast30d - per-site sums from recent weekly buckets
 * @param {Array<{ siteId?: string|number, weekly?: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }>|null|undefined} perSiteWeekly - per-site weekly rows for YoY KPI
 */
export function processEcoCounterNetworkView(
	combinedLocations,
	mode,
	networkWeeklyRecent,
	networkMonthlyTotals,
	perSiteLast30d,
	perSiteWeekly
) {
	if (!Array.isArray(combinedLocations) || combinedLocations.length === 0) {
		return null;
	}

	const withMode = combinedLocations.filter(
		(l) => l.travelModes && l.travelModes.includes(mode)
	);
	if (withMode.length === 0) return null;

	const kpis = ecoNetworkKpisFromWeeklyTotals(networkWeeklyRecent, mode);
	const eligibleIds = new Set(withMode.map((l) => String(l.id)));
	const weeklyForYoy = (perSiteWeekly || []).filter((b) => eligibleIds.has(String(b.siteId)));
	const yoy = ecoNetworkYoyFromSiteWeekly(weeklyForYoy, mode);

	/** @type {Map<number, { pedestrian: number, bike: number }>} */
	const perSiteMap = new Map();
	if (Array.isArray(perSiteLast30d)) {
		for (const row of perSiteLast30d) {
			const sid = Number(row.siteId);
			if (!Number.isFinite(sid)) continue;
			perSiteMap.set(sid, {
				pedestrian: Number(row.pedestrian) || 0,
				bike: Number(row.bike) || 0
			});
		}
	}
	const modeKey = mode === 'pedestrian' ? 'pedestrian' : 'bike';

	const countsBySensorBars = withMode
		.map((loc) => {
			const id = Number(loc.id);
			const raw = Number.isFinite(id) ? perSiteMap.get(id) : undefined;
			const total = raw != null ? Math.round(raw[modeKey] ?? 0) : 0;
			return {
				id: loc.id,
				name: loc.name || `Site ${loc.id}`,
				total
			};
		})
		.filter((b) => b.total > 0)
		.sort((a, b) => b.total - a.total);

	/** @type {Array<{ monthKey: string, label: string, total: number }>} */
	let monthlyNetworkBars = [];
	if (Array.isArray(networkMonthlyTotals) && networkMonthlyTotals.length > 0) {
		monthlyNetworkBars = networkMonthlyTotals.map((x) => ({
			monthKey: x.monthKey,
			label: x.label || x.monthKey,
			total: Math.round(Number(x[modeKey]) || 0)
		}));
	}

	return {
		kpis: {
			avgDailyCount: kpis.avgDailyCount,
			yoyFormatted: yoy.formatted,
			yoyPeriodLabel: yoy.periodLabel,
			yoyEligibleCount: yoy.eligibleCount
		},
		countsBySensorBars,
		monthlyNetworkBars
	};
}

/**
 * Process eco-counter readings data for time series
 * TODO: Implement when we have specific readings API
 */
export function processEcoCounterReadings(rawData) {
	// TODO: Transform API response into time series format
	return rawData || [];
}

/**
 * Reshape readings data for time series visualization
 * TODO: Implement reshaping logic based on component needs
 */
export function reshapeEcoCounterData(processedData) {
	// TODO: Format data for SingleItemTimeSeries component
	return {
		data: processedData || [],
		totals: {}
	};
}

/**
 * Process eco-counter time series data to create hourly averages
 * @param {Object} timeSeriesData - Raw time series data from API
 * @returns {Object} Processed data with hourly averages for pedestrian and bike
 */
export function processEcoCounterTimeSeriesData(timeSeriesData) {
	
	if (!timeSeriesData || !timeSeriesData.hourly_30days) {
		return null;
	}
	
	const hourlyData = timeSeriesData.hourly_30days;
	
	// Initialize hourly totals for each travel mode (0-23 hours)
	const hourlyTotals = {
		pedestrian: new Array(24).fill(0).map(() => ({ total: 0, count: 0 })),
		bike: new Array(24).fill(0).map(() => ({ total: 0, count: 0 }))
	};
	
	// Process each flow (pedestrian in/out, bike in/out)
	hourlyData.forEach(flow => {
		const { travelMode, direction, data } = flow;
		
		// Skip empty data arrays
		if (!data || data.length === 0) {
			return;
		}
		
		
		// Process each 15-minute interval
		data.forEach(interval => {
			const { timestamp, counts } = interval;
			
			// Parse the timestamp to get the hour
			const date = new Date(timestamp);
			const hour = date.getHours();
			
			// Add to the appropriate travel mode and hour
			if (hourlyTotals[travelMode]) {
				hourlyTotals[travelMode][hour].total += counts || 0;
				hourlyTotals[travelMode][hour].count += 1;
			}
		});
	});
	
	// Calculate daily averages (sum of all 4 x 15-min intervals per hour, then average over 30 days)
	const dailyAverages = {
		pedestrian: hourlyTotals.pedestrian.map((hourData, hour) => ({
			hour,
			averageDailyCount: hourData.count > 0 ? (hourData.total * 4) / 30 : 0 // 4 intervals per hour, 30 days
		})),
		bike: hourlyTotals.bike.map((hourData, hour) => ({
			hour,
			averageDailyCount: hourData.count > 0 ? (hourData.total * 4) / 30 : 0 // 4 intervals per hour, 30 days
		}))
	};
	
	// Weekly / monthly from static weekly snapshot (no API fallback)
	let monthlyData = null;
	let weeklyData = null;
	if (Array.isArray(timeSeriesData.snapshotSiteWeekly) && timeSeriesData.snapshotSiteWeekly.length > 0) {
		weeklyData = buildEcoWeeklyChartFromSnapshotRows(timeSeriesData.snapshotSiteWeekly);
		monthlyData = buildEcoMonthlyChartFromSnapshotWeekly(timeSeriesData.snapshotSiteWeekly);
	}
	
	
	return {
		hourlyAverages: dailyAverages,
		weeklyData: weeklyData,
		monthlyData: monthlyData,
		summary: {
			totalPedestrianDataPoints: hourlyTotals.pedestrian.reduce((sum, h) => sum + h.count, 0),
			totalBikeDataPoints: hourlyTotals.bike.reduce((sum, h) => sum + h.count, 0),
			daysOfData: 30
		}
	};
}

/**
 * Process weekly eco-counter data for time series visualization
 * @param {unknown} weeklyPayload - Raw weekly payload from Eco `history/traffic/aggregated` (P1W)
 * @returns {Object|null} Processed weekly data by travel mode
 */
function processWeeklyData(weeklyPayload) {
	const seriesList = extractEcoAggregatedTravelModeSeries(weeklyPayload);
	if (seriesList.length === 0) return null;

	const weeklyTotals = {
		pedestrian: [],
		bike: []
	};

	for (const { travelMode, data } of seriesList) {
		if (!weeklyTotals[travelMode]) continue;
		for (const point of data) {
			const dateStr =
				point.timestamp ??
				point.isoDate ??
				point.iso_date ??
				point.from ??
				point.startDate ??
				point.start ??
				point.date ??
				point.period;
			if (!dateStr) continue;
			const d = new Date(String(dateStr));
			if (Number.isNaN(d.getTime())) continue;
			const day = String(d.getUTCDate()).padStart(2, '0');
			const month = String(d.getUTCMonth() + 1).padStart(2, '0');
			const year = d.getUTCFullYear();
			const count = Number(
				point.counts ??
					point.count ??
					point.value ??
					point.total ??
					point.volume ??
					point.traffic?.counts ??
					point.traffic?.value ??
					0
			);
			weeklyTotals[travelMode].push({
				date: `${day}/${month}/${year}`,
				value: Number.isFinite(count) ? count : 0,
				__ts: d.getTime()
			});
		}
	}

	Object.keys(weeklyTotals).forEach((tm) => {
		weeklyTotals[tm].sort((a, b) => a.__ts - b.__ts);
		weeklyTotals[tm].forEach((row) => delete row.__ts);
	});

	const hasAny = weeklyTotals.pedestrian.length > 0 || weeklyTotals.bike.length > 0;
	return hasAny ? weeklyTotals : null;
}

/** `YYYY-MM-DD` (Monday) → `DD/MM/YYYY` for SingleItemTimeSeries */
export function ecoWeekKeyToDisplayDate(weekKey) {
	const parts = String(weekKey).split('-');
	if (parts.length !== 3) return null;
	const y = Number(parts[0]);
	const mo = Number(parts[1]);
	const d = Number(parts[2]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
	const day = String(d).padStart(2, '0');
	const month = String(mo).padStart(2, '0');
	return `${day}/${month}/${y}`;
}

/**
 * Roll weekly snapshot rows into calendar months (month of weekKey Monday).
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @returns {Map<string, { pedestrian: number, bike: number }>}
 */
export function rollupEcoWeeklyRowsToMonthlyMap(weeklyRows) {
	/** @type {Map<string, { pedestrian: number, bike: number }>} */
	const byMonth = new Map();
	if (!Array.isArray(weeklyRows)) return byMonth;
	for (const row of weeklyRows) {
		if (!row?.weekKey || row.weekKey.length < 7) continue;
		const monthKey = row.weekKey.slice(0, 7);
		if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
		if (!byMonth.has(monthKey)) {
			byMonth.set(monthKey, { pedestrian: 0, bike: 0 });
		}
		const t = byMonth.get(monthKey);
		t.pedestrian += Number(row.pedestrian) || 0;
		t.bike += Number(row.bike) || 0;
	}
	return byMonth;
}

/**
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @returns {{ pedestrian: Array<{ date: string, value: number }>, bike: Array<{ date: string, value: number }> } | null}
 */
export function buildEcoWeeklyChartFromSnapshotRows(weeklyRows) {
	const complete = excludeEcoIncompleteWeeklyRows(weeklyRows);
	if (!complete.length) return null;
	const sorted = [...complete].sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)));
	const weeklyTotals = { pedestrian: [], bike: [] };
	for (const row of sorted) {
		const date = ecoWeekKeyToDisplayDate(row.weekKey);
		if (!date) continue;
		weeklyTotals.pedestrian.push({ date, value: Math.round(Number(row.pedestrian) || 0) });
		weeklyTotals.bike.push({ date, value: Math.round(Number(row.bike) || 0) });
	}
	const hasAny = weeklyTotals.pedestrian.length > 0 || weeklyTotals.bike.length > 0;
	return hasAny ? weeklyTotals : null;
}

/**
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @returns {{ pedestrian: Array<{ date: string, value: number }>, bike: Array<{ date: string, value: number }> } | null}
 */
export function buildEcoMonthlyChartFromSnapshotWeekly(weeklyRows) {
	const completeWeeks = excludeEcoIncompleteWeeklyRows(weeklyRows);
	const byMonth = rollupEcoWeeklyRowsToMonthlyMap(completeWeeks);
	if (byMonth.size === 0) return null;
	const currentMonth = ecoCurrentMonthKeyUtc();
	const monthlyTotals = { pedestrian: [], bike: [] };
	const sorted = [...byMonth.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([monthKey]) => monthKey !== currentMonth);
	for (const [monthKey, v] of sorted) {
		const date = ecoMonthKeyToDisplayDate(monthKey);
		if (!date) continue;
		monthlyTotals.pedestrian.push({ date, value: Math.round(v.pedestrian || 0) });
		monthlyTotals.bike.push({ date, value: Math.round(v.bike || 0) });
	}
	const hasAny = monthlyTotals.pedestrian.length > 0 || monthlyTotals.bike.length > 0;
	return hasAny ? monthlyTotals : null;
}

/** `YYYY-MM` → `DD/MM/YYYY` (first day of month, UTC) for SingleItemTimeSeries */
function ecoMonthKeyToDisplayDate(monthKey) {
	const parts = String(monthKey).split('-');
	if (parts.length !== 2) return null;
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
	const d = new Date(Date.UTC(y, m - 1, 1));
	const day = String(d.getUTCDate()).padStart(2, '0');
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const year = d.getUTCFullYear();
	return `${day}/${month}/${year}`;
}

/**
 * Process monthly eco-counter data for time series visualization
 * @param {unknown} monthlyPayload - Raw monthly payload from Eco `history/traffic/aggregated` (shape varies)
 * @returns {Object|null} Processed monthly data by travel mode
 */
function processMonthlyData(monthlyPayload) {
	const seriesList = extractEcoAggregatedTravelModeSeries(monthlyPayload);
	if (seriesList.length === 0) {
		return null;
	}

	const monthlyTotals = {
		pedestrian: [],
		bike: []
	};

	for (const { travelMode, data } of seriesList) {
		if (!monthlyTotals[travelMode]) continue;
		for (const monthData of data) {
			const parsed = ecoP1MIntervalToMonthCount(monthData);
			if (!parsed) continue;
			const formattedDate = ecoMonthKeyToDisplayDate(parsed.monthKey);
			if (!formattedDate) continue;
			monthlyTotals[travelMode].push({
				date: formattedDate,
				value: parsed.count,
				__mk: parsed.monthKey
			});
		}
	}

	Object.keys(monthlyTotals).forEach((tm) => {
		monthlyTotals[tm].sort((a, b) => String(a.__mk).localeCompare(String(b.__mk)));
		monthlyTotals[tm].forEach((row) => {
			delete row.__mk;
		});
	});

	const hasAny = monthlyTotals.pedestrian.length > 0 || monthlyTotals.bike.length > 0;
	return hasAny ? monthlyTotals : null;
}
