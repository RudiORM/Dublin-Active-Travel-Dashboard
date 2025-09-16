/**
 * Color schemes for cordon data visualization
 */

// Color schemes for different modes
export const cordonColorSchemes = {
	cycling: [
		'#DEECFD',
		'#C3D6ED',
		'#A8BFDC',
		'#8CA8CB',
		'#6E90B9',
		'#5076A6'
	],
			
	walking: [
		'#EFE3E5',
		'#EFCDD3',
		'#EEB6C0',
		'#EA9EAB',
		'#E68693',
		'#DE6E79'
	],

	automobile: [
		'#EAE8DD',
		'#E1E0C3',
		'#DAD8AA',
		'#D3CF8F',
		'#CEC674',
		'#C9BC59'
	],
					
	public: [
		'#F5F5F5',
		'#E9E9E9',
		'#DFDEDE',
		'#D3D2D2',
		'#C6C6C6',
		'#BBBBBB'
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
