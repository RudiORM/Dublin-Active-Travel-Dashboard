/**
 * Color schemes for different transportation modes
 */
export const colorSchemes = {
	cycling: [
'#DEECFD',
'#C3D6ED',
'#A8BFDC',
'#8CA8CB',
'#6E90B9',
'#5076A6',	
	],
	
	walking: [
'#EFE3E5',
'#EFCDD3',
'#EEB6C0',
'#EA9EAB',
'#E68693',
'#DE6E79'
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
