/**
 * Color schemes for different transportation modes
 */
export const colorSchemes = {
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
	]
};

/**
 * Generate color stops for Mapbox expression
 * @param {string} mode - Transportation mode ('cycling' or 'walking')
 * @param {number} minValue - Minimum percentage value
 * @param {number} maxValue - Maximum percentage value
 * @returns {Array} - Color stops array for Mapbox
 */
export function generateColorStops(mode, minValue, maxValue) {
	const colors = colorSchemes[mode];
	if (!colors) return [];
	
	const colorStops = [];
	for (let i = 0; i < colors.length; i++) {
		const value = minValue + (maxValue - minValue) * (i / (colors.length - 1));
		colorStops.push([value, colors[i]]);
	}
	
	return colorStops;
}

/**
 * Get selection highlight color
 * @returns {string} - Hex color for selected areas
 */
export function getSelectionColor() {
	return '#F8D463';
}
