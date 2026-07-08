/**
 * Vivacity-Counter Data Processor
 * Processes raw API data into usable format for components
 */

import {
	excludeEcoIncompleteWeeklyRows,
	rollupEcoWeeklyRowsToMonthlyMap,
	ecoCurrentMonthKeyUtc
} from '$lib/services/eco-counter/eco-counter-processor.js';

/** Vivacity internal countline / hardware codes, e.g. `S2_AmiensSt_road_RHS_smdb` */
function looksLikeVivacityInternalId(s) {
	const t = String(s).trim();
	if (!t) return false;
	return /^S\d+[_-]/i.test(t);
}

/** Turn `S2_AmiensSt_road_RHS_smdb` into something closer to plain language */
function humanizeVivacityInternalId(s) {
	let t = String(s).trim();
	t = t.replace(/^S\d+[_-]?/i, '');
	t = t.replace(/_/g, ' ');
	t = t.replace(/([a-z])([A-Z])/g, '$1 $2');
	return t.replace(/\s+/g, ' ').trim() || String(s).trim();
}

/**
 * Best label from one sensor's hardware/metadata record. Prefers non-internal strings over
 * `S###_…` countline codes when both exist.
 * @param {Record<string, unknown>|null|undefined} record
 * @param {string|number|null|undefined} _sensorId reserved for call-site consistency
 * @returns {string|null}
 */
export function vivacityHardwareDisplayName(record, _sensorId) {
	if (!record || typeof record !== 'object') return null;
	/** @type {string[]} */
	const candidates = [];
	const push = (v) => {
		if (typeof v !== 'string') return;
		const t = v.trim();
		if (t) candidates.push(t);
	};

	for (const key of [
		'name',
		'hardware_name',
		'site_name',
		'label',
		'title',
		'friendly_name',
		'display_name'
	]) {
		push(record[key]);
	}

	if (record.view_points && typeof record.view_points === 'object') {
		for (const vp of Object.values(record.view_points)) {
			if (!vp || typeof vp !== 'object') continue;
			for (const key of ['name', 'label', 'title']) {
				push(vp[key]);
			}
		}
		for (const vp of Object.values(record.view_points)) {
			if (!vp?.countlines || typeof vp.countlines !== 'object') continue;
			for (const cl of Object.values(vp.countlines)) {
				push(cl?.name);
			}
		}
	}

	for (const c of candidates) {
		if (!looksLikeVivacityInternalId(c)) return c;
	}
	if (candidates.length) return humanizeVivacityInternalId(candidates[0]);
	return null;
}

/**
 * Merge static `vivacity_markers.json` `name` with metadata: keep hand-written names, use metadata
 * only for placeholders like `Site 10849`.
 * @param {{ name?: string, sensor_id?: string|number }} marker
 * @param {Record<string, unknown>|null|undefined} sensorMetadata
 */
export function resolveVivacityMarkerDisplayName(marker, sensorMetadata) {
	const raw = marker?.name;
	const staticName = typeof raw === 'string' ? raw.trim() : '';
	const sid = marker?.sensor_id;
	const placeholder =
		!staticName ||
		/^Site\s+\d+$/i.test(staticName) ||
		/^Sensor\s+\d+$/i.test(staticName);
	if (!placeholder) return staticName;
	const meta = vivacityHardwareDisplayName(sensorMetadata, sid);
	return meta || staticName || (sid != null ? `Sensor ${sid}` : 'Sensor');
}

/**
 * Process vivacity-counter locations data from API response
 * Transforms sites data into format suitable for map markers
 */
export function processVivacityCounterLocations(sitesData) {
	
	// Handle both direct array and wrapped data formats
	let sites;
	if (Array.isArray(sitesData)) {
		sites = sitesData;
	} else if (sitesData && sitesData.data && Array.isArray(sitesData.data)) {
		sites = sitesData.data;
	} else if (sitesData && typeof sitesData === 'object') {
		
		// Check for Vivacity-specific response structure
		if (sitesData.countlines && Array.isArray(sitesData.countlines)) {
			sites = sitesData.countlines;
		} else if (sitesData.sensors && Array.isArray(sitesData.sensors)) {
			sites = sitesData.sensors;
		} else {
			// Handle Vivacity metadata format where sensors are keyed by ID
			const sensorIds = Object.keys(sitesData);
			
			// Convert object to array of sensors
			sites = sensorIds.map(id => ({
				id: id,
				...sitesData[id]
			}));
			
		}
	} else {
		return [];
	}

	// Transform sites into marker format
	
	const locations = sites.map((site, index) => {
		
		// Handle different possible location formats
		let latitude, longitude;
		if (site.location) {
			if (site.location.lat !== undefined && site.location.lon !== undefined) {
				latitude = site.location.lat;
				longitude = site.location.lon;
			} else if (site.location.latitude !== undefined && site.location.longitude !== undefined) {
				latitude = site.location.latitude;
				longitude = site.location.longitude;
			}
		} else if (site.lat !== undefined && site.lon !== undefined) {
			latitude = site.lat;
			longitude = site.lon;
		} else if (site.lat !== undefined && site.long !== undefined) {
			// Vivacity uses 'long' instead of 'lon'
			latitude = site.lat;
			longitude = site.long;
		} else if (site.latitude !== undefined && site.longitude !== undefined) {
			latitude = site.latitude;
			longitude = site.longitude;
		}
		
		// Handle Vivacity-specific coordinate format
		if (!latitude && !longitude && site.coordinates) {
			if (Array.isArray(site.coordinates) && site.coordinates.length >= 2) {
				// GeoJSON format [longitude, latitude]
				longitude = site.coordinates[0];
				latitude = site.coordinates[1];
			}
		}
		
		// Extract countlines from view_points for Vivacity
		let countlines = [];
		if (site.view_points) {
			Object.values(site.view_points).forEach(viewPoint => {
				if (viewPoint.countlines) {
					Object.keys(viewPoint.countlines).forEach(countlineId => {
						const countlineData = viewPoint.countlines[countlineId];
						countlines.push({
							id: countlineId,
							name: countlineData.name || `Countline ${countlineId}`,
							description: countlineData.description || '',
							direction: countlineData.direction
						});
					});
				}
			});
		}
		
		
		return {
			id: site.id,
			name:
				vivacityHardwareDisplayName(site, site.id) ||
				site.name ||
				`Site ${site.id}`,
			latitude: latitude,
			longitude: longitude,
			description: site.description || '',
			// Additional properties that might be useful
			travelModes: site.travelModes || ['pedestrian', 'bike'], // Default to both if not specified
			directional: site.directional || false,
			firstData: site.firstData,
			lastData: site.lastData,
			countlines: countlines, // Add countlines for time series API calls
			// Store original data for reference
			originalData: site
		};
	});

	return locations;
}

/**
 * Process eco-counter traffic data from API response
 * Combines traffic data with site information
 */
export function processVivacityCounterTraffic(trafficData, sitesData) {
	
	if (!trafficData || !trafficData.data) {
		return [];
	}

	// Create a map of site IDs to site info for quick lookup
	const sitesMap = {};
	if (sitesData && sitesData.data) {
		sitesData.data.forEach(site => {
			sitesMap[site.id] = site;
		});
	}

	// Process traffic data
	const processedTraffic = trafficData.data.map(traffic => ({
		siteId: traffic.siteId,
		siteName: sitesMap[traffic.siteId]?.name || `Site ${traffic.siteId}`,
		travelMode: traffic.travelMode,
		averageDailyTraffic: traffic.averageDailyTraffic,
		// Store original data
		originalData: traffic
	}));

	return processedTraffic;
}

/**
 * Combine locations and traffic data for easy access
 */
export function combineVivacityCounterData(locations, traffic) {
	
	// Create traffic map by site ID and travel mode
	const trafficMap = {};
	traffic.forEach(t => {
		if (!trafficMap[t.siteId]) {
			trafficMap[t.siteId] = {};
		}
		trafficMap[t.siteId][t.travelMode] = t;
	});

	// Add traffic data to locations
	const combinedData = locations.map(location => ({
		...location,
		traffic: trafficMap[location.id] || {},
		// Calculate total traffic (bike + pedestrian)
		totalTraffic: Object.values(trafficMap[location.id] || {})
			.reduce((sum, t) => sum + (t.averageDailyTraffic || 0), 0)
	}));

	return combinedData;
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
 * Process vivacity-counter time series data to create hourly averages
 * @param {Object} timeSeriesData - Raw time series data from API
 * @returns {Object} Processed data with hourly averages for pedestrian and bike
 */
export function processVivacityCounterTimeSeriesData(timeSeriesData) {
	
	// API shape: hourly_7days = aggregated 1h rows (up to ~30d from Vivacity); daily_3months = aggregated 24h rows (static snapshot when available). Weekly/monthly bars group daily_3months only.
	const hasHourlyData = timeSeriesData && timeSeriesData.hourly_7days;
	const hasDailyData = timeSeriesData && timeSeriesData.daily_3months;
	
	// Fallback to old structure for backwards compatibility
	const hasLegacyData = timeSeriesData && timeSeriesData.hourly_30days;
	
	if (!hasHourlyData && !hasDailyData && !hasLegacyData) {
		return null;
	}
	
	const { countlineIds, dateRange } = timeSeriesData;
	
	// Process hourly data (now aggregated, no countline ID needed)
	let hourlyAverages = null;
	if (hasHourlyData) {
		hourlyAverages = processHourlyDataVivacityAggregated(timeSeriesData.hourly_7days);
	} else if (hasLegacyData) {
		// For legacy data, try to use first countline ID if available
		const legacyCountlineId = countlineIds && countlineIds[0];
		hourlyAverages = processHourlyDataVivacity(timeSeriesData.hourly_30days, legacyCountlineId);
	}
	
	// Process daily data for last 30 days (now aggregated)
	let dailyData = null;
	if (hasDailyData) {
		dailyData = processDailyDataVivacityAggregated(timeSeriesData.daily_3months, 30);
	} else {
		dailyData = {
			pedestrian: [],
			bike: []
		};
	}
	
	
	// Calculate percentages from the last 30 days of daily data
	let pedestrianPercentage = 0;
	let cyclistPercentage = 0;
	let totalPedestrianCount = 0;
	let totalCyclistCount = 0;
	const shareFromServer = timeSeriesData?.trafficShare30d;

	if (shareFromServer && typeof shareFromServer === 'object') {
		const ped = Number(shareFromServer.pedestrian) || 0;
		const cyc = Number(shareFromServer.cyclist) || 0;
		const all = Number(shareFromServer.totalTraffic) || 0;
		totalPedestrianCount = ped;
		totalCyclistCount = cyc;
		if (all > 0) {
			pedestrianPercentage = (ped / all) * 100;
			cyclistPercentage = (cyc / all) * 100;
		}
	}
	
	if (totalPedestrianCount === 0 && totalCyclistCount === 0 && dailyData && dailyData.pedestrian && dailyData.bike) {
		// We need to get ALL traffic types from the raw daily data
		// The daily data we have only contains pedestrian and bike, but the raw data has all types
		
		// Since we now have aggregated data, we can calculate totals directly from the processed data
		// The aggregated data already includes all vehicle types summed together
		if (hasDailyData && timeSeriesData.daily_3months && Array.isArray(timeSeriesData.daily_3months)) {
			const dailyDataArray = timeSeriesData.daily_3months;
			let totalAllTraffic = 0;
			
			// Get the last 30 days of data (matching what we processed earlier)
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - 30);
			cutoffDate.setHours(0, 0, 0, 0);
			
			const last30Days = dailyDataArray.filter(dataPoint => {
				const date = new Date(dataPoint.from);
				return date >= cutoffDate;
			});
			
			last30Days.forEach(dayData => {
				// With aggregated data, all vehicle types are already summed (clockwise + anticlockwise)
				const allTypes = ['pedestrian', 'cyclist', 'car', 'bus', 'agricultural_vehicle', 
								  'cargo_bicycle', 'dog', 'electric_hackney_cab', 'emergency_car'];
				
				// Sum all traffic types from the aggregated data
				allTypes.forEach(type => {
					totalAllTraffic += dayData[type] || 0;
				});
				
				// Track pedestrian and cyclist totals specifically from aggregated data
				totalPedestrianCount += dayData.pedestrian || 0;
				totalCyclistCount += dayData.cyclist || 0;
			});
			
			// Calculate percentages of total traffic
			if (totalAllTraffic > 0) {
				pedestrianPercentage = (totalPedestrianCount / totalAllTraffic) * 100;
				cyclistPercentage = (totalCyclistCount / totalAllTraffic) * 100;
			}
			
		} else {
			// Fallback if we don't have access to raw data - just use what we have
			totalPedestrianCount = dailyData.pedestrian.reduce((sum, day) => sum + day.value, 0);
			totalCyclistCount = dailyData.bike.reduce((sum, day) => sum + day.value, 0);
		}
	}

	let weeklyBars = { pedestrian: [], bike: [] };
	let monthlyBars = { pedestrian: [], bike: [] };
	if (Array.isArray(timeSeriesData.snapshotSensorWeekly) && timeSeriesData.snapshotSensorWeekly.length > 0) {
		weeklyBars = buildVivacityWeeklyBarsFromSnapshotRows(timeSeriesData.snapshotSensorWeekly);
		monthlyBars = buildVivacityMonthlyBarsFromSnapshotWeekly(timeSeriesData.snapshotSensorWeekly);
	} else if (hasDailyData && Array.isArray(timeSeriesData.daily_3months)) {
		const rawDaily = timeSeriesData.daily_3months;
		weeklyBars = {
			pedestrian: buildVivacityWeeklyBarsFromDaily(rawDaily, 'pedestrian'),
			bike: buildVivacityWeeklyBarsFromDaily(rawDaily, 'bike')
		};
		monthlyBars = {
			pedestrian: buildVivacityMonthlyBarsFromDaily(rawDaily, 'pedestrian'),
			bike: buildVivacityMonthlyBarsFromDaily(rawDaily, 'bike')
		};
	}
	
	const result = {
		hourlyAverages: hourlyAverages,
		dailyData: dailyData, // Changed from monthlyData to dailyData
		weeklyBars,
		monthlyBars,
		summary: {
			totalPedestrianDataPoints: hourlyAverages ? 
				hourlyAverages.pedestrian.reduce((sum, h) => sum + (h.averageDailyCount > 0 ? 1 : 0), 0) : 0,
			totalBikeDataPoints: hourlyAverages ? 
				hourlyAverages.bike.reduce((sum, h) => sum + (h.averageDailyCount > 0 ? 1 : 0), 0) : 0,
			daysOfData: dateRange?.hourly ? 
				Math.ceil((new Date(dateRange.hourly.to) - new Date(dateRange.hourly.from)) / (1000 * 60 * 60 * 24)) : 
				(dateRange ? Math.ceil((new Date(dateRange.to) - new Date(dateRange.from)) / (1000 * 60 * 60 * 24)) : 0),
			pedestrianPercentage: pedestrianPercentage,
			cyclistPercentage: cyclistPercentage,
			totalPedestrianCount: totalPedestrianCount,
			totalCyclistCount: totalCyclistCount
		}
	};
	
	return result;
}

/**
 * Process hourly vivacity data to create hourly averages
 * @param {Object} hourlyData - Raw hourly data from API
 * @param {string} countlineId - The countline ID to process
 * @returns {Object} Processed hourly averages by travel mode
 */
function processHourlyDataVivacity(hourlyData, countlineId) {
	if (!hourlyData || !hourlyData[countlineId]) {
		return null;
	}
	
	const hourlyDataArray = hourlyData[countlineId];
	
	if (!Array.isArray(hourlyDataArray)) {
		return null;
	}
	
	
	// Initialize hourly totals for each hour (0-23)
	const hourlyTotals = {
		pedestrian: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() })),
		bike: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() }))
	};
	
	// Process each hourly data point
	hourlyDataArray.forEach((dataPoint, index) => {
		const { from, to, clockwise, anti_clockwise } = dataPoint;
		
		if (!from) {
			return;
		}
		
		// Parse the timestamp to get the hour and date
		const date = new Date(from);
		const hour = date.getHours();
		const dayKey = date.toISOString().split('T')[0]; // Get YYYY-MM-DD for unique day tracking
		
		// Calculate total pedestrian counts (sum of clockwise and anti_clockwise)
		const pedestrianTotal = (clockwise?.pedestrian || 0) + (anti_clockwise?.pedestrian || 0);
		
		// Calculate total cyclist counts (sum of clockwise and anti_clockwise)
		const cyclistTotal = (clockwise?.cyclist || 0) + (anti_clockwise?.cyclist || 0);
		
		// Also include related cycling categories if you want comprehensive cycling counts
		const additionalCycling = 
			(clockwise?.cargo_bicycle || 0) + (anti_clockwise?.cargo_bicycle || 0) +
			(clockwise?.rental_bicycle || 0) + (anti_clockwise?.rental_bicycle || 0);
		
		const totalCyclistCount = cyclistTotal + additionalCycling;
		
		// Also include related pedestrian categories if needed
		const additionalPedestrian = 
			(clockwise?.jogger || 0) + (anti_clockwise?.jogger || 0);
		
		const totalPedestrianCount = pedestrianTotal + additionalPedestrian;
		
		// Add to hourly totals
		hourlyTotals.pedestrian[hour].total += totalPedestrianCount;
		hourlyTotals.pedestrian[hour].count += 1;
		hourlyTotals.pedestrian[hour].days.add(dayKey);
		
		hourlyTotals.bike[hour].total += totalCyclistCount;
		hourlyTotals.bike[hour].count += 1;
		hourlyTotals.bike[hour].days.add(dayKey);
	});
	
	// Calculate the actual number of unique days in the data
	const allDays = new Set();
	hourlyTotals.pedestrian.forEach(h => h.days.forEach(d => allDays.add(d)));
	const numDays = allDays.size || 1; // Default to 1 to avoid division by zero
	
	
	// Calculate daily averages
	const dailyAverages = {
		pedestrian: hourlyTotals.pedestrian.map((hourData, hour) => ({
			hour,
			averageDailyCount: hourData.count > 0 ? hourData.total / numDays : 0
		})),
		bike: hourlyTotals.bike.map((hourData, hour) => ({
			hour,
			averageDailyCount: hourData.count > 0 ? hourData.total / numDays : 0
		}))
	};
	
	return dailyAverages;
}

/**
 * Process daily vivacity data for the last N days
 * @param {Object} dailyData - Raw daily data from API (3 months of daily buckets)
 * @param {string} countlineId - The countline ID to process
 * @param {number} daysToShow - Number of most recent days to return (default 30)
 * @returns {Object} Processed daily data by travel mode
 */
function processDailyDataVivacity(dailyData, countlineId, daysToShow = 30) {
	if (!dailyData || !dailyData[countlineId]) {
		return { pedestrian: [], bike: [] };
	}
	
	const dailyDataArray = dailyData[countlineId];
	
	if (!Array.isArray(dailyDataArray)) {
		return { pedestrian: [], bike: [] };
	}
	
	
	// Process all daily data points
	const dailyTotals = {
		pedestrian: [],
		bike: []
	};
	
	dailyDataArray.forEach(dayData => {
		const { from, clockwise, anti_clockwise } = dayData;
		
		if (!from) return;
		
		// Sum pedestrian counts
		const pedestrianTotal = 
			(clockwise?.pedestrian || 0) + (anti_clockwise?.pedestrian || 0) +
			(clockwise?.jogger || 0) + (anti_clockwise?.jogger || 0);
		
		// Sum cyclist counts
		const cyclistTotal = 
			(clockwise?.cyclist || 0) + (anti_clockwise?.cyclist || 0) +
			(clockwise?.cargo_bicycle || 0) + (anti_clockwise?.cargo_bicycle || 0) +
			(clockwise?.rental_bicycle || 0) + (anti_clockwise?.rental_bicycle || 0);
		
		// Format date for visualization (DD/MM/YYYY format expected by SingleItemTimeSeries)
		const date = new Date(from);
		const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
		
		dailyTotals.pedestrian.push({
			date: formattedDate,
			value: pedestrianTotal,
			timestamp: date.getTime() // Add timestamp for sorting
		});
		
		dailyTotals.bike.push({
			date: formattedDate,
			value: cyclistTotal,
			timestamp: date.getTime() // Add timestamp for sorting
		});
	});
	
	// Sort by timestamp (newest first) and take the last N days
	dailyTotals.pedestrian.sort((a, b) => b.timestamp - a.timestamp);
	dailyTotals.bike.sort((a, b) => b.timestamp - a.timestamp);
	
	// Take only the last N days and remove timestamp field
	const recentPedestrian = dailyTotals.pedestrian
		.slice(0, daysToShow)
		.map(({ date, value }) => ({ date, value }))
		.reverse(); // Reverse to get chronological order
	
	const recentBike = dailyTotals.bike
		.slice(0, daysToShow)
		.map(({ date, value }) => ({ date, value }))
		.reverse(); // Reverse to get chronological order
	
	const result = {
		pedestrian: recentPedestrian,
		bike: recentBike
	};
	
	
	return result;
}

/**
 * Process monthly vivacity data
 * @param {Array} monthlyDataArray - Raw monthly data array from API
 * @returns {Object} Processed monthly data by travel mode
 */
function processMonthlyDataVivacity(monthlyDataArray) {
	if (!monthlyDataArray || !Array.isArray(monthlyDataArray)) {
		return { pedestrian: [], bike: [] };
	}
	
	
	const monthlyTotals = {
		pedestrian: [],
		bike: []
	};
	
	monthlyDataArray.forEach(month => {
		const { from, clockwise, anti_clockwise } = month;
		
		if (!from) return;
		
		// Sum pedestrian counts
		const pedestrianTotal = 
			(clockwise?.pedestrian || 0) + (anti_clockwise?.pedestrian || 0) +
			(clockwise?.jogger || 0) + (anti_clockwise?.jogger || 0);
		
		// Sum cyclist counts
		const cyclistTotal = 
			(clockwise?.cyclist || 0) + (anti_clockwise?.cyclist || 0) +
			(clockwise?.cargo_bicycle || 0) + (anti_clockwise?.cargo_bicycle || 0) +
			(clockwise?.rental_bicycle || 0) + (anti_clockwise?.rental_bicycle || 0);
		
		// Format date for visualization (DD/MM/YYYY format expected by SingleItemTimeSeries)
		const date = new Date(from);
		const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
		
		monthlyTotals.pedestrian.push({
			date: formattedDate,
			value: pedestrianTotal
		});
		
		monthlyTotals.bike.push({
			date: formattedDate,
			value: cyclistTotal
		});
	});
	
	// Sort by date
	monthlyTotals.pedestrian.sort((a, b) => {
		const dateA = a.date.split('/').reverse().join('-');
		const dateB = b.date.split('/').reverse().join('-');
		return new Date(dateA) - new Date(dateB);
	});
	
	monthlyTotals.bike.sort((a, b) => {
		const dateA = a.date.split('/').reverse().join('-');
		const dateB = b.date.split('/').reverse().join('-');
		return new Date(dateA) - new Date(dateB);
	});
	
	return monthlyTotals;
}

/**
 * Process monthly eco-counter data for time series visualization
 * @param {Array} monthlyData - Raw monthly data from API
 * @returns {Object} Processed monthly data by travel mode
 */
function processMonthlyData(monthlyData) {
	
	if (!monthlyData || monthlyData.length === 0) {
		return null;
	}
	
	// Initialize monthly totals for each travel mode
	const monthlyTotals = {
		pedestrian: [],
		bike: []
	};
	
	// Process each flow (travel mode data)
	monthlyData.forEach(flow => {
		const { travelMode, data } = flow;
		
		// Skip if no data
		if (!data || data.length === 0) {
			return;
		}
		
		
		// Process each monthly data point
		data.forEach(monthData => {
			
			// Handle different possible data structures
			let date, counts;
			
			if (monthData.timestamp && monthData.traffic) {
				// Structure: { timestamp: "2022-09-01T00:00:00+01:00", traffic: { counts: 204140 } }
				date = monthData.timestamp;
				counts = monthData.traffic.counts;
			} else if (monthData.period) {
				// Structure: { period: "2023-01", counts: 123 }
				date = monthData.period;
				counts = monthData.counts;
			} else if (monthData.timestamp) {
				// Structure: { timestamp: "2023-01-01T00:00:00", counts: 123 }
				date = monthData.timestamp;
				counts = monthData.counts;
			} else if (monthData.date) {
				// Structure: { date: "2023-01-01", value: 123 }
				date = monthData.date;
				counts = monthData.value || monthData.counts;
			} else {
				return;
			}
			
			
			// Parse the date/period and format for SingleItemTimeSeries
			let formattedDate;
			if (date && typeof date === 'string') {
				let dateObj;
				
				if (date.includes('-') && date.length <= 7) {
					// Format: "2023-01" -> Date object
					dateObj = new Date(`${date}-01`);
				} else {
					// ISO timestamp like "2022-09-01T00:00:00+01:00"
					dateObj = new Date(date);
				}
				
				// Convert to DD/MM/YYYY format expected by SingleItemTimeSeries
				if (dateObj && !isNaN(dateObj.getTime())) {
					const day = dateObj.getDate().toString().padStart(2, '0');
					const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
					const year = dateObj.getFullYear();
					formattedDate = `${day}/${month}/${year}`;
				} else {
					return;
				}
			} else {
				return;
			}
			
			// Add to the appropriate travel mode
			if (monthlyTotals[travelMode]) {
				monthlyTotals[travelMode].push({
					date: formattedDate,
					value: counts || 0
				});
			}
		});
	});
	
	// Sort by date for each travel mode
	Object.keys(monthlyTotals).forEach(travelMode => {
		monthlyTotals[travelMode].sort((a, b) => new Date(a.date) - new Date(b.date));
	});
	
	
	return monthlyTotals;
}

/**
 * Process aggregated hourly vivacity data to create hourly averages
 * This version handles pre-aggregated data (no countline keys)
 * @param {Array} hourlyDataArray - Aggregated hourly data array
 * @returns {Object} Processed hourly averages by travel mode
 */
function processHourlyDataVivacityAggregated(hourlyDataArray) {
	if (!Array.isArray(hourlyDataArray)) {
		return null;
	}
	
	
	// Initialize hourly totals for each hour (0-23)
	const hourlyTotals = {
		pedestrian: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() })),
		bike: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() }))
	};
	
	// Process each hourly data point
	hourlyDataArray.forEach((dataPoint, index) => {
		const { from, to, pedestrian, cyclist } = dataPoint;
		
		if (!from) {
			return;
		}
		
		// Parse the timestamp to get the hour and date
		const date = new Date(from);
		const hour = date.getHours();
		const dayKey = date.toISOString().split('T')[0]; // Get YYYY-MM-DD for unique day tracking
		
		// Use the pre-aggregated totals (already combined clockwise + anticlockwise)
		const pedestrianTotal = pedestrian || 0;
		const cyclistTotal = cyclist || 0;
		
		// Add to hourly totals
		if (hour >= 0 && hour < 24) {
			hourlyTotals.pedestrian[hour].total += pedestrianTotal;
			hourlyTotals.pedestrian[hour].count++;
			hourlyTotals.pedestrian[hour].days.add(dayKey);
			
			hourlyTotals.bike[hour].total += cyclistTotal;
			hourlyTotals.bike[hour].count++;
			hourlyTotals.bike[hour].days.add(dayKey);
		}
	});
	
	// Calculate averages for each hour
	const hourlyAverages = {
		pedestrian: hourlyTotals.pedestrian.map((hourData, hour) => ({
			hour: hour,
			average: hourData.count > 0 ? Math.round(hourData.total / hourData.count) : 0,
			totalDays: hourData.days.size
		})),
		bike: hourlyTotals.bike.map((hourData, hour) => ({
			hour: hour,
			average: hourData.count > 0 ? Math.round(hourData.total / hourData.count) : 0,
			totalDays: hourData.days.size
		}))
	};
	
	
	return hourlyAverages;
}

/**
 * Process aggregated daily vivacity data
 * This version handles pre-aggregated data (no countline keys)
 * @param {Array} dailyDataArray - Aggregated daily data array
 * @param {number} lastNDays - Number of recent days to include (default: 30)
 * @returns {Object} Processed daily data by travel mode
 */
function processDailyDataVivacityAggregated(dailyDataArray, lastNDays = 30) {
	if (!Array.isArray(dailyDataArray)) {
		return { pedestrian: [], bike: [] };
	}
	
	
	// Get the cutoff date for filtering recent data
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - lastNDays);
	cutoffDate.setHours(0, 0, 0, 0);
	
	const dailyTotals = {
		pedestrian: [],
		bike: []
	};
	
	// Process each daily data point
	dailyDataArray.forEach(dataPoint => {
		const { from, to, pedestrian, cyclist } = dataPoint;
		
		if (!from) return;
		
		const date = new Date(from);
		
		// Only include recent data within the specified range
		if (date >= cutoffDate) {
			const dateStr = date.toISOString().split('T')[0];
			
			// Use the pre-aggregated totals
			const pedestrianTotal = pedestrian || 0;
			const cyclistTotal = cyclist || 0;
			
			dailyTotals.pedestrian.push({
				date: dateStr,
				count: pedestrianTotal
			});
			
			dailyTotals.bike.push({
				date: dateStr,
				count: cyclistTotal
			});
		}
	});
	
	// Sort by date for each travel mode
	Object.keys(dailyTotals).forEach(travelMode => {
		dailyTotals[travelMode].sort((a, b) => new Date(a.date) - new Date(b.date));
	});
	
	
	return dailyTotals;
}

function modeCountFromAggregatedDailyRow(row, mode) {
	if (mode === 'pedestrian') {
		return (row.pedestrian || 0) + (row.jogger || 0);
	}
	return (
		(row.cyclist || 0) + (row.cargo_bicycle || 0) + (row.rental_bicycle || 0)
	);
}

const MS_PER_DAY = 86400000;

/** Monday 00:00 UTC for the calendar week containing `isoFrom`. */
function vivacityUtcWeekStartString(isoFrom) {
	const d = new Date(isoFrom);
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth();
	const day = d.getUTCDate();
	const dow = d.getUTCDay();
	const diffToMonday = (dow + 6) % 7;
	const mon = new Date(Date.UTC(y, m, day - diffToMonday));
	return mon.toISOString().slice(0, 10);
}

/**
 * Weekly totals from offline weekly snapshot (`weekKey` = YYYY-MM-DD Monday).
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @returns {{ pedestrian: Array<{ date: string, value: number }>, bike: Array<{ date: string, value: number }> }}
 */
export function buildVivacityWeeklyBarsFromSnapshotRows(weeklyRows) {
	const complete = excludeEcoIncompleteWeeklyRows(weeklyRows);
	const sorted = [...complete].sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)));
	const out = { pedestrian: [], bike: [] };
	for (const row of sorted) {
		if (!row?.weekKey) continue;
		out.pedestrian.push({ date: row.weekKey, value: Math.round(Number(row.pedestrian) || 0) });
		out.bike.push({ date: row.weekKey, value: Math.round(Number(row.bike) || 0) });
	}
	return out;
}

/**
 * Monthly totals rolled up from weekly snapshot rows.
 * @param {Array<{ weekKey: string, pedestrian?: number, bike?: number }>} weeklyRows
 * @returns {{ pedestrian: Array<{ date: string, value: number }>, bike: Array<{ date: string, value: number }> }}
 */
export function buildVivacityMonthlyBarsFromSnapshotWeekly(weeklyRows) {
	const completeWeeks = excludeEcoIncompleteWeeklyRows(weeklyRows);
	const byMonth = rollupEcoWeeklyRowsToMonthlyMap(completeWeeks);
	const currentMonth = ecoCurrentMonthKeyUtc();
	const out = { pedestrian: [], bike: [] };
	const sorted = [...byMonth.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([monthKey]) => monthKey !== currentMonth);
	for (const [monthKey, v] of sorted) {
		out.pedestrian.push({ date: `${monthKey}-01`, value: Math.round(v.pedestrian || 0) });
		out.bike.push({ date: `${monthKey}-01`, value: Math.round(v.bike || 0) });
	}
	return out;
}

/**
 * Weekly totals (Monday-start weeks, UTC) for the last ~6 months, up to 26 bars.
 * @param {unknown[]} dailyRows - aggregated daily rows from Vivacity
 * @param {'pedestrian'|'bike'} mode
 * @returns {{ date: string, value: number }[]}
 */
export function buildVivacityWeeklyBarsFromDaily(dailyRows, mode) {
	if (!Array.isArray(dailyRows) || dailyRows.length === 0) return [];

	const end = new Date();
	end.setUTCHours(0, 0, 0, 0);
	const start = new Date(end.getTime() - 183 * MS_PER_DAY);

	/** @type {Map<string, number>} */
	const byWeek = new Map();
	for (const row of dailyRows) {
		if (!row || typeof row !== 'object' || !row.from) continue;
		const t = new Date(row.from).getTime();
		if (t < start.getTime() || t >= end.getTime() + MS_PER_DAY) continue;

		const wk = vivacityUtcWeekStartString(row.from);
		const v = modeCountFromAggregatedDailyRow(row, mode);
		byWeek.set(wk, (byWeek.get(wk) || 0) + v);
	}

	const keys = [...byWeek.keys()].sort();
	const lastKeys = keys.slice(-26);
	return lastKeys.map((date) => ({
		date,
		value: Math.round(byWeek.get(date) || 0)
	}));
}

/**
 * Last 12 calendar months (UTC), one bar per month; `date` is first of month (YYYY-MM-DD) for the chart.
 * @param {unknown[]} dailyRows
 * @param {'pedestrian'|'bike'} mode
 * @returns {{ date: string, value: number }[]}
 */
export function buildVivacityMonthlyBarsFromDaily(dailyRows, mode) {
	if (!Array.isArray(dailyRows)) return [];

	const end = new Date();
	const y = end.getUTCFullYear();
	const mo = end.getUTCMonth();

	/** @type {string[]} */
	const monthKeys = [];
	for (let i = 11; i >= 0; i--) {
		const d = new Date(Date.UTC(y, mo - i, 1));
		const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		monthKeys.push(ym);
	}

	const keySet = new Set(monthKeys);
	/** @type {Map<string, number>} */
	const byMonth = new Map();
	for (const row of dailyRows) {
		if (!row || typeof row !== 'object' || !row.from) continue;
		const dt = new Date(row.from);
		const ym = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
		if (!keySet.has(ym)) continue;
		const v = modeCountFromAggregatedDailyRow(row, mode);
		byMonth.set(ym, (byMonth.get(ym) || 0) + v);
	}

	return monthKeys.map((ym) => ({
		date: `${ym}-01`,
		value: Math.round(byMonth.get(ym) || 0)
	}));
}

function formatUtcDayLabel(isoFrom) {
	if (!isoFrom) return '—';
	const d = new Date(isoFrom);
	return d.toLocaleDateString('en-IE', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
}

/**
 * Citywide API response from POST /api/vivacity-counter/citywide (daily series + networkMonthlyTotals + 30d sensor totals).
 * @param {Object} response - { dailyAggregated, networkMonthlyTotals?, countsBySensor, sensors }
 * @param {'pedestrian'|'bike'} mode
 */
export function processCitywideVivacityResponse(response, mode) {
	if (!response || typeof response !== 'object') {
		return null;
	}
	const rawDaily = response.dailyAggregated;
	const dailyRows = Array.isArray(rawDaily) ? rawDaily : [];

	const dailySorted = [...dailyRows].sort(
		(a, b) => new Date(a.from) - new Date(b.from)
	);

	const now = new Date();
	now.setUTCHours(0, 0, 0, 0);
	const end0 = now.getTime();
	const start30 = end0 - 30 * 86400000;

	let sum30 = 0;
	let days30 = 0;
	let busiestDayFrom = null;
	let busiestDayModeCount = -1;

	for (const row of dailySorted) {
		const t = new Date(row.from).getTime();
		const modeC = modeCountFromAggregatedDailyRow(row, mode);
		if (t >= start30 && t < end0) {
			sum30 += modeC;
			days30 += 1;
			if (modeC > busiestDayModeCount) {
				busiestDayModeCount = modeC;
				busiestDayFrom = row.from;
			}
		}
	}

	const avgDaily = days30 > 0 ? sum30 / days30 : 0;
	const busiestDayLabel = busiestDayFrom ? formatUtcDayLabel(busiestDayFrom) : '—';
	const busiestDayTotal = busiestDayModeCount >= 0 ? Math.round(busiestDayModeCount) : null;
	const rawList = Array.isArray(response.countsBySensor) ? response.countsBySensor : [];

	const modeKey = mode === 'pedestrian' ? 'pedestrian' : 'bike';
	const countsBySensorBars = [...rawList]
		.map((s) => ({
			id: s.id,
			name: s.name || `Sensor ${s.id}`,
			total: Number(s[modeKey]) || 0
		}))
		.filter((s) => s.total > 0)
		.sort((a, b) => b.total - a.total);

	let monthlyNetworkBars;
	if (Array.isArray(response.networkMonthlyTotals) && response.networkMonthlyTotals.length > 0) {
		const key = mode === 'pedestrian' ? 'pedestrian' : 'bike';
		monthlyNetworkBars = response.networkMonthlyTotals.map((x) => ({
			monthKey: x.monthKey,
			label: x.label,
			total: Math.round(Number(x[key]) || 0)
		}));
	} else {
		monthlyNetworkBars = buildMonthlyNetworkTotalsFromDaily(dailySorted, mode);
	}

	return {
		kpis: {
			avgDailyCount: avgDaily,
			busiestDayLabel,
			busiestDayTotal
		},
		countsBySensorBars,
		monthlyNetworkBars
	};
}

/** UTC calendar month label from `YYYY-MM` */
function formatMonthKeyUtc(monthKey) {
	const parts = monthKey.split('-');
	if (parts.length !== 2) return monthKey;
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	if (!Number.isFinite(y) || !Number.isFinite(m)) return monthKey;
	const d = new Date(Date.UTC(y, m - 1, 1));
	return d.toLocaleDateString('en-IE', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/**
 * Sum selected mode across all sensors per UTC calendar month; last 12 months with data.
 * @param {Array<Object>} dailySorted - citywide daily rows (from aggregateVivacityData)
 * @param {'pedestrian'|'bike'} mode
 * @returns {Array<{ monthKey: string, label: string, total: number }>}
 */
export function buildMonthlyNetworkTotalsFromDaily(dailySorted, mode) {
	if (!Array.isArray(dailySorted) || dailySorted.length === 0) return [];

	/** @type {Map<string, number>} */
	const sums = new Map();
	for (const row of dailySorted) {
		if (!row?.from) continue;
		const d = new Date(row.from);
		if (Number.isNaN(d.getTime())) continue;
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		const c = modeCountFromAggregatedDailyRow(row, mode);
		sums.set(key, (sums.get(key) || 0) + c);
	}

	const keys = [...sums.keys()].sort();
	const tail = keys.slice(-12);
	return tail.map((monthKey) => ({
		monthKey,
		label: formatMonthKeyUtc(monthKey),
		total: Math.round(sums.get(monthKey) || 0)
	}));
}