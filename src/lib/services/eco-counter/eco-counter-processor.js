/**
 * Eco-Counter Data Processor
 * Processes raw API data into usable format for components
 */

/**
 * Process eco-counter locations data from API response
 * Transforms sites data into format suitable for map markers
 */
export function processEcoCounterLocations(sitesData) {
	console.log('Processing eco-counter locations:', sitesData);
	
	// Handle both direct array and wrapped data formats
	let sites;
	if (Array.isArray(sitesData)) {
		sites = sitesData;
	} else if (sitesData && sitesData.data && Array.isArray(sitesData.data)) {
		sites = sitesData.data;
	} else {
		console.warn('No sites data available');
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

	console.log(`Processed ${locations.length} eco-counter locations`);
	return locations;
}

/**
 * Process eco-counter traffic data from API response
 * Combines traffic data with site information
 */
export function processEcoCounterTraffic(trafficData, sitesData) {
	console.log('Processing eco-counter traffic data:', trafficData);
	
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
export function combineEcoCounterData(locations, traffic) {
	console.log('Combining eco-counter data');
	
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
 * Process eco-counter time series data to create hourly averages
 * @param {Object} timeSeriesData - Raw time series data from API
 * @returns {Object} Processed data with hourly averages for pedestrian and bike
 */
export function processEcoCounterTimeSeriesData(timeSeriesData) {
	console.log('Processing eco-counter time series data');
	
	if (!timeSeriesData || !timeSeriesData.hourly_30days) {
		console.warn('No hourly_30days data available');
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
			console.log(`Skipping empty data for ${travelMode} ${direction}`);
			return;
		}
		
		console.log(`Processing ${data.length} data points for ${travelMode} ${direction}`);
		
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
	
	// Process monthly data if available
	let monthlyData = null;
	if (timeSeriesData.monthly_3years) {
		monthlyData = processMonthlyData(timeSeriesData.monthly_3years);
	}
	
	console.log('Processed hourly averages:', dailyAverages);
	console.log('Processed monthly data:', monthlyData);
	
	return {
		hourlyAverages: dailyAverages,
		monthlyData: monthlyData,
		summary: {
			totalPedestrianDataPoints: hourlyTotals.pedestrian.reduce((sum, h) => sum + h.count, 0),
			totalBikeDataPoints: hourlyTotals.bike.reduce((sum, h) => sum + h.count, 0),
			daysOfData: 30
		}
	};
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
