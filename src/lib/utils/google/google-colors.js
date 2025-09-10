/**
 * Color schemes for different transportation modes in Google data
 */
export const googleColorSchemes = {
	automobile: [
		'#fee5d9',
		'#fcbba1',
		'#fc9272',
		'#fb6a4a',
		'#ef3b2c',
		'#cb181d',
		'#99000d',
		'#67000d'
	],
	bus: [
		'#edf8e9',
		'#c7e9c0',
		'#a1d99b',
		'#74c476',
		'#41ab5d',
		'#238b45',
		'#005a32',
		'#003d22'
	],
	cycling: [
		'#d4e3ff',
		'#c1d3f2',
		'#afc2e5',
		'#9cb3d8',
		'#89a3cb',
		'#7794bf',
		'#6485b2',
		'#5076a6'
	],
	walking: [
		'#ffeaeb',
		'#f9d9da',
		'#f3c8ca',
		'#ecb7b9',
		'#e5a6a9',
		'#de9599',
		'#d6848a',
		'#ce737a'
	],
	rail: [
		'#f2f0f7',
		'#dadaeb',
		'#bcbddc',
		'#9e9ac8',
		'#807dba',
		'#6a51a3',
		'#4a1486',
		'#3d0a5c'
	],
	tram: [
		'#fff7bc',
		'#fee391',
		'#fec44f',
		'#fe9929',
		'#ec7014',
		'#cc4c02',
		'#8c2d04',
		'#662506'
	]
};

/**
 * Generate color stops for Mapbox expression
 * @param {string} mode - Transportation mode
 * @param {number} minValue - Minimum value
 * @param {number} maxValue - Maximum value
 * @returns {Array} - Color stops array for Mapbox
 */
export function generateGoogleColorStops(mode, minValue, maxValue) {
	const colors = googleColorSchemes[mode];
	if (!colors) return [];
	
	// Handle case where all values are the same
	if (minValue === maxValue) {
		// Return a simple two-stop gradient using the middle color
		const middleColorIndex = Math.floor(colors.length / 2);
		return [
			[minValue, colors[middleColorIndex]]
		];
	}
	
	const colorStops = [];
	for (let i = 0; i < colors.length; i++) {
		const value = minValue + (maxValue - minValue) * (i / (colors.length - 1));
		colorStops.push([value, colors[i]]);
	}
	
	return colorStops;
}

/**
 * Get selection highlight color for Google data
 * @returns {string} - Hex color for selected areas
 */
export function getGoogleSelectionColor() {
	return '#FFD700'; // Gold color to distinguish from census
}
