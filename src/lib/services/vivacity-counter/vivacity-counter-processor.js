/**
 * Vivacity-Counter Data Processor
 * Processes raw API data into usable format for components
 */

/**
 * Process vivacity-counter locations data from API response
 * Transforms sites data into format suitable for map markers
 */
export function processVivacityCounterLocations(sitesData) {
	console.log('=== VIVACITY PROCESSOR ===');
	console.log('Processing vivacity-counter locations...');
	console.log('Input sitesData type:', typeof sitesData);
	console.log('Input sitesData:', sitesData);
	
	// Handle both direct array and wrapped data formats
	let sites;
	if (Array.isArray(sitesData)) {
		console.log('Sites data is direct array, length:', sitesData.length);
		sites = sitesData;
	} else if (sitesData && sitesData.data && Array.isArray(sitesData.data)) {
		console.log('Sites data is wrapped in .data property, length:', sitesData.data.length);
		sites = sitesData.data;
	} else if (sitesData && typeof sitesData === 'object') {
		console.log('Sites data is object with keys:', Object.keys(sitesData));
		console.log('Checking for common Vivacity API response structures...');
		
		// Check for Vivacity-specific response structure
		if (sitesData.countlines && Array.isArray(sitesData.countlines)) {
			console.log('Found countlines array, length:', sitesData.countlines.length);
			sites = sitesData.countlines;
		} else if (sitesData.sensors && Array.isArray(sitesData.sensors)) {
			console.log('Found sensors array, length:', sitesData.sensors.length);
			sites = sitesData.sensors;
		} else {
			// Handle Vivacity metadata format where sensors are keyed by ID
			console.log('Treating as Vivacity metadata object with sensor IDs as keys');
			const sensorIds = Object.keys(sitesData);
			console.log('Found sensor IDs:', sensorIds);
			
			// Convert object to array of sensors
			sites = sensorIds.map(id => ({
				id: id,
				...sitesData[id]
			}));
			
			console.log('Converted to array, length:', sites.length);
		}
	} else {
		console.warn('No sites data available or unrecognized format');
		console.log('Received:', sitesData);
		return [];
	}

	// Transform sites into marker format
	console.log('Transforming sites to location format...');
	console.log('First site sample:', sites[0]);
	
	const locations = sites.map((site, index) => {
		console.log(`Processing site ${index}:`, {
			id: site.id,
			name: site.name,
			location: site.location,
			hasLocation: !!site.location,
			locationKeys: site.location ? Object.keys(site.location) : 'none'
		});
		
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
		
		console.log(`Site ${index} coordinates: lat=${latitude}, lon=${longitude}`);
		console.log(`Site ${index} countlines:`, countlines);
		
		return {
			id: site.id,
			name: site.name || `Site ${site.id}`,
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

	console.log(`Processed ${locations.length} vivacity-counter locations`);
	console.log('Sample processed location:', locations[0]);
	return locations;
}

/**
 * Process eco-counter traffic data from API response
 * Combines traffic data with site information
 */
export function processVivacityCounterTraffic(trafficData, sitesData) {
	console.log('Processing vivacity-counter traffic data:', trafficData);
	
	if (!trafficData || !trafficData.data) {
		console.warn('No traffic data available');
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

	console.log(`Processed ${processedTraffic.length} traffic records`);
	return processedTraffic;
}

/**
 * Combine locations and traffic data for easy access
 */
export function combineVivacityCounterData(locations, traffic) {
	console.log('Combining vivacity-counter data');
	
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

	console.log(`Combined data for ${combinedData.length} locations`);
	return combinedData;
}

/**
 * Process eco-counter readings data for time series
 * TODO: Implement when we have specific readings API
 */
export function processEcoCounterReadings(rawData) {
	console.log('processEcoCounterReadings - TODO: Implement when readings API is available');
	// TODO: Transform API response into time series format
	return rawData || [];
}

/**
 * Reshape readings data for time series visualization
 * TODO: Implement reshaping logic based on component needs
 */
export function reshapeEcoCounterData(processedData) {
	console.log('reshapeEcoCounterData - TODO: Implement reshaping logic');
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
	console.log('=== VIVACITY TIME SERIES PROCESSING ===');
	console.log('Processing vivacity-counter time series data');
	console.log('Input data structure:', timeSeriesData);
	
	// Check for the new data structure with hourly_7days and daily_3months
	const hasHourlyData = timeSeriesData && timeSeriesData.hourly_7days;
	const hasDailyData = timeSeriesData && timeSeriesData.daily_3months;
	
	// Fallback to old structure for backwards compatibility
	const hasLegacyData = timeSeriesData && timeSeriesData.hourly_30days;
	
	if (!hasHourlyData && !hasDailyData && !hasLegacyData) {
		console.warn('No time series data available');
		return null;
	}
	
	const { countlineIds, dateRange } = timeSeriesData;
	console.log('Countline IDs:', countlineIds);
	console.log('Date range:', dateRange);
	
	// Process hourly data (now aggregated, no countline ID needed)
	let hourlyAverages = null;
	if (hasHourlyData) {
		console.log('Processing aggregated hourly_7days data...');
		hourlyAverages = processHourlyDataVivacityAggregated(timeSeriesData.hourly_7days);
	} else if (hasLegacyData) {
		// For legacy data, try to use first countline ID if available
		const legacyCountlineId = countlineIds && countlineIds[0];
		hourlyAverages = processHourlyDataVivacity(timeSeriesData.hourly_30days, legacyCountlineId);
	}
	
	// Process daily data for last 30 days (now aggregated)
	let dailyData = null;
	if (hasDailyData) {
		console.log('Processing aggregated daily_3months data for last 30 days...');
		dailyData = processDailyDataVivacityAggregated(timeSeriesData.daily_3months, 30);
	} else {
		console.log('No daily data available - creating placeholder');
		dailyData = {
			pedestrian: [],
			bike: []
		};
	}
	
	console.log('Processed hourly averages:', hourlyAverages);
	console.log('Processed daily data:', dailyData);
	
	// Calculate percentages from the last 30 days of daily data
	let pedestrianPercentage = 0;
	let cyclistPercentage = 0;
	let totalPedestrianCount = 0;
	let totalCyclistCount = 0;
	
	if (dailyData && dailyData.pedestrian && dailyData.bike) {
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
			
			console.log(`Last 30 days - Total ALL traffic: ${totalAllTraffic}`);
			console.log(`Pedestrians: ${totalPedestrianCount} (${pedestrianPercentage.toFixed(1)}%)`);
			console.log(`Cyclists: ${totalCyclistCount} (${cyclistPercentage.toFixed(1)}%)`);
		} else {
			// Fallback if we don't have access to raw data - just use what we have
			totalPedestrianCount = dailyData.pedestrian.reduce((sum, day) => sum + day.value, 0);
			totalCyclistCount = dailyData.bike.reduce((sum, day) => sum + day.value, 0);
			console.log('Warning: Cannot calculate true percentages without access to all traffic types');
		}
	}
	
	const result = {
		hourlyAverages: hourlyAverages,
		dailyData: dailyData, // Changed from monthlyData to dailyData
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
	
	console.log('Final processed result:', result);
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
		console.warn('No hourly data found for countline:', countlineId);
		return null;
	}
	
	const hourlyDataArray = hourlyData[countlineId];
	
	if (!Array.isArray(hourlyDataArray)) {
		console.warn('Hourly data is not an array for countline:', countlineId);
		return null;
	}
	
	console.log(`Processing ${hourlyDataArray.length} hourly data points`);
	
	// Initialize hourly totals for each hour (0-23)
	const hourlyTotals = {
		pedestrian: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() })),
		bike: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() }))
	};
	
	// Process each hourly data point
	hourlyDataArray.forEach((dataPoint, index) => {
		const { from, to, clockwise, anti_clockwise } = dataPoint;
		
		if (!from) {
			console.warn(`Skipping data point ${index} - no timestamp`);
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
	
	console.log(`Data spans ${numDays} unique days`);
	
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
		console.warn('No daily data found for countline:', countlineId);
		return { pedestrian: [], bike: [] };
	}
	
	const dailyDataArray = dailyData[countlineId];
	
	if (!Array.isArray(dailyDataArray)) {
		console.warn('Daily data is not an array for countline:', countlineId);
		return { pedestrian: [], bike: [] };
	}
	
	console.log(`Processing ${dailyDataArray.length} daily data points, will return last ${daysToShow} days`);
	
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
	
	console.log(`Processed daily data: ${recentPedestrian.length} days of pedestrian data, ${recentBike.length} days of bike data`);
	
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
	
	console.log(`Processing ${monthlyDataArray.length} monthly data points`);
	
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
	console.log('Processing monthly data:', monthlyData);
	
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
			console.log(`Skipping empty monthly data for ${travelMode}`);
			return;
		}
		
		console.log(`Processing ${data.length} monthly data points for ${travelMode}`);
		
		// Process each monthly data point
		data.forEach(monthData => {
			console.log('Processing monthly data point:', monthData);
			
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
				console.warn('Unknown monthly data structure:', monthData);
				return;
			}
			
			console.log('Extracted date:', date, 'counts:', counts);
			
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
					console.log('Formatted date from', date, 'to', formattedDate);
				} else {
					console.warn('Could not parse date:', date);
					return;
				}
			} else {
				console.warn('Invalid date format:', date);
				return;
			}
			
			// Add to the appropriate travel mode
			if (monthlyTotals[travelMode]) {
				monthlyTotals[travelMode].push({
					date: formattedDate,
					value: counts || 0
				});
				console.log('Added monthly data point:', { date: formattedDate, value: counts || 0 });
			}
		});
	});
	
	// Sort by date for each travel mode
	Object.keys(monthlyTotals).forEach(travelMode => {
		monthlyTotals[travelMode].sort((a, b) => new Date(a.date) - new Date(b.date));
	});
	
	console.log('Processed monthly totals:', monthlyTotals);
	
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
		console.warn('Aggregated hourly data is not an array');
		return null;
	}
	
	console.log(`Processing ${hourlyDataArray.length} aggregated hourly data points`);
	
	// Initialize hourly totals for each hour (0-23)
	const hourlyTotals = {
		pedestrian: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() })),
		bike: new Array(24).fill(0).map(() => ({ total: 0, count: 0, days: new Set() }))
	};
	
	// Process each hourly data point
	hourlyDataArray.forEach((dataPoint, index) => {
		const { from, to, pedestrian, cyclist } = dataPoint;
		
		if (!from) {
			console.warn(`Skipping data point ${index} - no timestamp`);
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
	
	console.log('Processed aggregated hourly averages:', hourlyAverages);
	
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
		console.warn('Aggregated daily data is not an array');
		return { pedestrian: [], bike: [] };
	}
	
	console.log(`Processing ${dailyDataArray.length} aggregated daily data points for last ${lastNDays} days`);
	
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
	
	console.log('Processed aggregated daily totals:', dailyTotals);
	
	return dailyTotals;
}