/**
 * Process cordon data for visualization
 * Combines cordon counts with zone locations and creates structured data
 */

/**
 * Reshape cordon data for easier access and visualization
 * @param {Object} data - Raw data with cordons and zones
 * @returns {Object} Reshaped data structure
 */
export function reshapeCordonData(data) {
	const { cordons, zones } = data;
	
	// Create a lookup for zone locations
	const zoneLookup = {};
	zones.forEach(zone => {
		// Note: The JSON has lat/lng swapped in the field names
		zoneLookup[zone.Location] = {
			siteNo: zone["Site No"],
			location: zone.Location,
			latitude: parseFloat(zone.Longitude), // This is actually latitude
			longitude: parseFloat(zone.Latitude), // This is actually longitude
		};
	});

	// Process cordon data by mode and location
	const processedData = {
		byMode: {},
		byLocation: {},
		totals: {},
		zones: zoneLookup
	};

	cordons.forEach(modeData => {
		const mode = modeData.Mode.toLowerCase();
		
		// Clean up mode names
		let cleanMode = mode;
		if (mode === 'pedestrians') cleanMode = 'walking';
		if (mode === 'cyclists') cleanMode = 'cycling';
		if (mode === 'cars / lvgs') cleanMode = 'cars';
		
		processedData.byMode[cleanMode] = {};
		
		// Process each location for this mode
		Object.keys(modeData).forEach(key => {
			if (key === 'Mode') return;
			
			// Skip yearly totals for now (they're just numbers as keys)
			if (!isNaN(key)) {
				if (!processedData.totals[cleanMode]) {
					processedData.totals[cleanMode] = {};
				}
				processedData.totals[cleanMode][key] = modeData[key];
				return;
			}
			
			// Clean location name (remove _22 suffix if present)
			let locationName = key.replace(/_22$/, '');
			
			// Skip if this location doesn't have zone data
			if (!zoneLookup[locationName]) return;
			
			const value = modeData[key];
			const year = key.includes('_22') ? '2022' : '2023';
			
			// Initialize location data structure
			if (!processedData.byLocation[locationName]) {
				processedData.byLocation[locationName] = {
					...zoneLookup[locationName],
					data: {}
				};
			}
			
			if (!processedData.byLocation[locationName].data[cleanMode]) {
				processedData.byLocation[locationName].data[cleanMode] = {};
			}
			
			processedData.byLocation[locationName].data[cleanMode][year] = {
				raw: value,
				location: locationName,
				mode: cleanMode,
				year: year
			};
			
			// Also store in byMode structure
			if (!processedData.byMode[cleanMode][locationName]) {
				processedData.byMode[cleanMode][locationName] = {};
			}
			processedData.byMode[cleanMode][locationName][year] = {
				raw: value,
				location: locationName,
				mode: cleanMode,
				year: year
			};
		});
	});

	return processedData;
}

/**
 * Get walking data for 2023 for marker sizing
 * @param {Object} processedData - Processed cordon data
 * @returns {Array} Array of locations with walking 2023 totals
 */
export function getWalkingData2023(processedData) {
	const walkingData = [];
	
	Object.keys(processedData.byLocation).forEach(locationName => {
		const location = processedData.byLocation[locationName];
		const walkingValue = location.data.walking?.['2023']?.raw || 0;
		
		if (walkingValue > 0) {
			walkingData.push({
				...location,
				walkingTotal: walkingValue
			});
		}
	});
	
	return walkingData;
}
