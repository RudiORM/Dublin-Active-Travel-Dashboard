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
	let workingPopulation = 0;
	
	// Map mode to actual field name
	const modeMap = {
		'cycling': 'Bicycle',
		'walking': 'On foot'
	};
	
	// Define all transport modes to sum for working population
	const transportModes = [
		'On foot',
		'Bicycle',
		'Bus, minibus or coach',
		'Train, DART or LUAS',
		'Motorcycle or scooter',
		'Car driver',
		'Car passenger',
		'Van',
		'Other (incl. lorry)',
		'Work mainly at or from home',
		'Not stated'
	];
	
	// Construct field names based on place of business
	let modeField = '';
	let suffix = '';
	
	if (placeOfBusiness === 'work_school_college') {
		// Total for both work and school/college
		modeField = `${modeMap[mode]} - Total${yearSuffix}`;
		suffix = ` - Total${yearSuffix}`;
	} else if (placeOfBusiness === 'work') {
		modeField = `${modeMap[mode]} - Work${yearSuffix}`;
		suffix = ` - Work${yearSuffix}`;
	} else if (placeOfBusiness === 'school_college') {
		modeField = `${modeMap[mode]} - School, college or childcare${yearSuffix}`;
		suffix = ` - School, college or childcare${yearSuffix}`;
	}
	
	// Get the raw value for the specific mode
	rawValue = properties[modeField] || 0;
	
	// Calculate working population by summing all transport modes
	transportModes.forEach(transportMode => {
		const fieldName = `${transportMode}${suffix}`;
		workingPopulation += properties[fieldName] || 0;
	});
	
	// Calculate percentage based on working population
	const percentage = workingPopulation > 0 ? (rawValue / workingPopulation) * 100 : 0;
	
	return {
		raw: rawValue,
		percentage: percentage,
		total: workingPopulation
	};
}

/**
 * Function to reshape the data with statistic-first hierarchy
 * @param {Array} features - GeoJSON features
 * @param {string} boundaryType - Either 'lea' or 'ed' for boundary type
 * @returns {Object} - Reshaped data structure
 */
export function reshapeData(features, boundaryType = 'lea') {
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
		// Get area name based on boundary type
		const areaName = boundaryType === 'ed' ? feature.properties.ED_ENGLISH : feature.properties.CSO_LEA;
		
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
		let totalPopulation = 0;
		let areaCount = 0;
		
		Object.keys(reshaped[statKey]).forEach(areaName => {
			if (areaName !== '_TOTAL') {
				totalRaw += reshaped[statKey][areaName].raw;
				totalPopulation += reshaped[statKey][areaName].total;
				areaCount++;
			}
		});
		
		// Calculate proper percentage: total raw / total population * 100
		const overallPercentage = totalPopulation > 0 ? (totalRaw / totalPopulation) * 100 : 0;
		
		// Add total as a special key
		reshaped[statKey]['_TOTAL'] = {
			raw: totalRaw,
			total: totalPopulation,
			averagePercentage: overallPercentage,
			areaCount: areaCount
		};
	});
	
	return reshaped;
}
