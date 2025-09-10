/**
 * Color schemes for different transportation modes
 */
export const colorSchemes = {
	cycling: [
		'#d4e3ff',
		'#c1d3f2',
		'#afc2e5',
		'#9cb3d8',
		'#89a3cb',
		'#7794bf',
		'#6485b2',
		'#5076a6',
	],
	walking: [
		'#ffeaeb',
		'#f9d9da',
		'#f3c8ca',
		'#ecb7b9',
		'#e5a6a9',
		'#de9599',
		'#d6848a',
		'#ce737a',
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
