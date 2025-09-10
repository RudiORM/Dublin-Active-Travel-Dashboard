/**
 * Helper function to extract mode of transport data
 * @param {Object} properties - Feature properties
 * @param {string} mode - Transportation mode
 * @param {string} placeOfBusiness - Place of business
 * @param {string} year - Year
 * @returns {Object} - Raw value, percentage, and total
 */
export function extractModeData(properties, mode, placeOfBusiness, year) {
	const yearSuffix = year === '2016' ? '_16' : '';
	let rawValue = 0;
	let totalValue = 0;
	
	// Map mode to actual field name
	const modeMap = {
		'cycling': 'Bicycle',
		'walking': 'On foot'
	};
	
	// Construct field names based on place of business
	let modeField = '';
	let totalField = '';
	
	if (placeOfBusiness === 'work_school_college') {
		// Total for both work and school/college
		modeField = `${modeMap[mode]} - Total${yearSuffix}`;
		totalField = `Total${yearSuffix}`;
	} else if (placeOfBusiness === 'work') {
		modeField = `${modeMap[mode]} - Work${yearSuffix}`;
		totalField = `Total - Work${yearSuffix}`;
	} else if (placeOfBusiness === 'school_college') {
		modeField = `${modeMap[mode]} - School, college or childcare${yearSuffix}`;
		totalField = `Total - School, college or childcare${yearSuffix}`;
	}
	
	// Get the values
	rawValue = properties[modeField] || 0;
	totalValue = properties[totalField] || 0;
	
	// Calculate percentage
	const percentage = totalValue > 0 ? (rawValue / totalValue) * 100 : 0;
	
	return {
		raw: rawValue,
		percentage: percentage,
		total: totalValue
	};
}

/**
 * Function to reshape the data with statistic-first hierarchy
 * @param {Array} features - GeoJSON features
 * @returns {Object} - Reshaped data structure
 */
export function reshapeData(features) {
	const reshaped = {};
	
	// Define all combinations
	const modes = ['cycling', 'walking'];
	const placesOfBusiness = ['work_school_college', 'work', 'school_college'];
	const years = ['2016', '2022'];
	
	// Initialize structure with statistic keys first
	modes.forEach(mode => {
		placesOfBusiness.forEach(place => {
			years.forEach(year => {
				const key = `${mode}_${place}_${year}`;
				reshaped[key] = {};
			});
		});
	});
	
	// Process each feature
	features.forEach(feature => {
		const areaName = feature.properties.CSO_LEA;
		
		// Generate all 12 combinations for this area
		modes.forEach(mode => {
			placesOfBusiness.forEach(place => {
				years.forEach(year => {
					const key = `${mode}_${place}_${year}`;
					reshaped[key][areaName] = extractModeData(
						feature.properties, 
						mode, 
						place, 
						year
					);
				});
			});
		});
	});
	
	// Add totals for each statistic
	Object.keys(reshaped).forEach(statKey => {
		let totalRaw = 0;
		let totalPercentageSum = 0;
		let areaCount = 0;
		
		Object.keys(reshaped[statKey]).forEach(areaName => {
			if (areaName !== '_TOTAL') {
				totalRaw += reshaped[statKey][areaName].raw;
				totalPercentageSum += reshaped[statKey][areaName].percentage;
				areaCount++;
			}
		});
		
		// Add total as a special key
		reshaped[statKey]['_TOTAL'] = {
			raw: totalRaw,
			averagePercentage: areaCount > 0 ? totalPercentageSum / areaCount : 0,
			areaCount: areaCount
		};
	});
	
	return reshaped;
}
