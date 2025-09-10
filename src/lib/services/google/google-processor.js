/**
 * Extract transportation mode data from Google mobility data
 * @param {Object} properties - Feature properties
 * @param {string} mode - Transportation mode
 * @param {string} metric - Metric type (trips, distance, co2)
 * @param {string} scope - Scope (full or gpc)
 * @returns {Object} - Raw value and calculated metrics
 */
export function extractGoogleModeData(properties, mode, metric, scope) {
	// Map mode names to Google data field names
	const modeMap = {
		'automobile': 'AUTOMOBILE',
		'bus': 'BUS',
		'cycling': 'CYCLING',
		'walking': 'ON FOOT',
		'rail': 'RAIL',
		'tram': 'TRAM'
	};
	
	// Map metric types to field suffixes
	const metricMap = {
		'trips': 'trips',
		'distance': `${scope}_distance_km`,
		'co2': `${scope}_co2e_tons`
	};
	
	const modeKey = modeMap[mode];
	const metricSuffix = metricMap[metric];
	
	if (!modeKey || !metricSuffix) {
		return { raw: 0, formatted: '0' };
	}
	
	const fieldName = `${modeKey}_${metricSuffix}`;
	const rawValue = properties[fieldName] || 0;
	
	// Format based on metric type
	let formatted;
	if (metric === 'trips') {
		formatted = rawValue.toLocaleString();
	} else if (metric === 'distance') {
		formatted = `${(rawValue / 1000).toFixed(1)}K km`; // Convert to thousands
	} else if (metric === 'co2') {
		formatted = `${rawValue.toFixed(1)} tons`;
	} else {
		formatted = rawValue.toString();
	}
	
	return {
		raw: rawValue,
		formatted: formatted
	};
}

/**
 * Reshape Google data for easier access
 * @param {Array} features - GeoJSON features
 * @returns {Object} - Reshaped data structure
 */
export function reshapeGoogleData(features) {
	const reshaped = {
		byArea: {},
		totals: {}
	};
	
	// Transportation modes available in Google data
	const modes = ['automobile', 'bus', 'cycling', 'walking', 'rail', 'tram'];
	const metrics = ['trips', 'distance', 'co2'];
	const scopes = ['full', 'gpc'];
	
	// Initialize totals
	modes.forEach(mode => {
		reshaped.totals[mode] = {};
		metrics.forEach(metric => {
			reshaped.totals[mode][metric] = {};
			scopes.forEach(scope => {
				reshaped.totals[mode][metric][scope] = 0;
			});
		});
	});
	
	// Process each feature
	features.forEach(feature => {
		const areaName = feature.properties.ENG_NAME_VALUE;
		reshaped.byArea[areaName] = {};
		
		// First pass: extract raw data
		modes.forEach(mode => {
			reshaped.byArea[areaName][mode] = {};
			metrics.forEach(metric => {
				reshaped.byArea[areaName][mode][metric] = {};
				scopes.forEach(scope => {
					const data = extractGoogleModeData(feature.properties, mode, metric, scope);
					reshaped.byArea[areaName][mode][metric][scope] = data;
					
					// Add to totals
					reshaped.totals[mode][metric][scope] += data.raw;
				});
			});
		});
		
		// Second pass: calculate percentages for trips
		scopes.forEach(scope => {
			// Calculate total trips across all modes for this area and scope
			const totalTrips = modes.reduce((sum, mode) => {
				return sum + (reshaped.byArea[areaName][mode]['trips'][scope]?.raw || 0);
			}, 0);
			
			// Add percentage calculations for each mode
			modes.forEach(mode => {
				const tripData = reshaped.byArea[areaName][mode]['trips'][scope];
				if (tripData && totalTrips > 0) {
					const percentage = (tripData.raw / totalTrips) * 100;
					tripData.percentage = percentage;
					tripData.formattedPercentage = `${percentage.toFixed(1)}%`;
				} else if (tripData) {
					tripData.percentage = 0;
					tripData.formattedPercentage = '0.0%';
				}
			});
		});
	});
	
	// Format totals and calculate percentages for totals
	scopes.forEach(scope => {
		// Calculate total trips across all modes for percentage calculation
		const totalTripsAllModes = modes.reduce((sum, mode) => {
			return sum + reshaped.totals[mode]['trips'][scope];
		}, 0);
		
		modes.forEach(mode => {
			metrics.forEach(metric => {
				const rawTotal = reshaped.totals[mode][metric][scope];
				let formatted;
				if (metric === 'trips') {
					formatted = rawTotal.toLocaleString();
				} else if (metric === 'distance') {
					formatted = `${(rawTotal / 1000).toFixed(1)}K km`;
				} else if (metric === 'co2') {
					formatted = `${rawTotal.toFixed(1)} tons`;
				} else {
					formatted = rawTotal.toString();
				}
				
				const totalData = {
					raw: rawTotal,
					formatted: formatted
				};
				
				// Add percentage for trips
				if (metric === 'trips' && totalTripsAllModes > 0) {
					const percentage = (rawTotal / totalTripsAllModes) * 100;
					totalData.percentage = percentage;
					totalData.formattedPercentage = `${percentage.toFixed(1)}%`;
				}
				
				reshaped.totals[mode][metric][scope] = totalData;
			});
		});
	});
	
	return reshaped;
}
