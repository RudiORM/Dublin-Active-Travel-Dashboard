/**
 * Color schemes for different transportation modes
 */
export const colorSchemes = {
	cycling: [
'#d4e3ff',
'#bacced',
'#a0b6db',
'#86a0c9',
'#6b8bb7',
'#5076a6',	
	],
	
	walking: [
'#ffd9da',
'#f6c4c6',
'#edb0b2',
'#e39c9f',
'#d9878c',
'#ce737a'
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
