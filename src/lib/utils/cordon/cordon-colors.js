/**
 * Color schemes for cordon data visualization
 */

// Color schemes for different modes
export const cordonColorSchemes = {
	cycling: [
		'#DBF1FA',
		'#C1E7F6',
		'#A6DCF3',
		'#89D1F1',
		'#67C6EE',
		'#33BBEE',	
	],
			
	walking: [
		'#F0D7D1',
		'#F3B9AB',
		'#F39984',
		'#EB7A5D',
		'#DF5839',
		'#CC3311'
	],

	automobile: [
	'#D2EAE7',
				'#B5DAD6',
				'#96CBC4',
				'#74BBB0',
				'#4EAA9D',
				'#009988'
	],
					
	public: [
		'#F6EED9',
						'#F0E1B9',
						'#EBD599',
						'#E7C779',
						'#E1B958',
						'#DDAA33'
	]
};

// Map individual transportation modes to color categories
/** @type {Record<string, string>} */
export const modeToCategory = {
	// Walking
	walking: 'walking',
	pedestrians: 'walking',
	
	// Cycling
	cycling: 'cycling',
	cyclists: 'cycling',
	
	// Automobile (cars, vans, HGVs, motorcycles, taxis)
	cars: 'automobile',
	'cars / lvgs': 'automobile',
	motorcycles: 'automobile',
	taxis: 'automobile',
	hgvs: 'automobile',
	
	// Public transport
	bus: 'public'
};

/**
 * Get color scheme for a specific mode
 * @param {string} mode - Transportation mode
 * @returns {string[]} Array of colors for the mode
 */
export function getCordonColorScheme(mode) {
	const category = /** @type {keyof typeof cordonColorSchemes} */ (modeToCategory[mode] || 'walking');
	return cordonColorSchemes[category] || cordonColorSchemes.walking;
}

/**
 * Get the primary (darkest) color for a specific mode
 * @param {string} mode - Transportation mode
 * @returns {string} The primary color for the mode
 */
export function getCordonPrimaryColor(mode) {
	const colors = getCordonColorScheme(mode);
	return colors[colors.length - 1]; // Return the last (darkest) color
}

/**
 * Calculate marker size based on value
 * @param {number} value - Raw count value
 * @param {number} minValue - Minimum value in dataset
 * @param {number} maxValue - Maximum value in dataset  
 * @param {number} minSize - Minimum marker size in pixels
 * @param {number} maxSize - Maximum marker size in pixels
 * @returns {number} Calculated marker size
 */
export function calculateMarkerSize(value, minValue, maxValue, minSize = 8, maxSize = 40) {
	if (maxValue === minValue) return minSize;
	
	const normalized = (value - minValue) / (maxValue - minValue);
	return minSize + (normalized * (maxSize - minSize));
}

/**
 * Get marker color based on mode and value
 * @param {string} mode - Transportation mode
 * @param {number} value - Value for color intensity
 * @param {number} maxValue - Maximum value for normalization
 * @returns {string} Hex color string
 */
export function getMarkerColor(mode, value, maxValue) {
	// Use primary color for now, could add intensity variation later
	return getCordonPrimaryColor(mode);
}
