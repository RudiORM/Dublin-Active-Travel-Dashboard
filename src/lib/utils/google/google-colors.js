/**
 * Color schemes for different transportation modes in Google data
 */
export const googleColorSchemes = {
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
			],

			automobile: [
				'#EAE8DD',
				'#E1E0C3',
				'#DAD8AA',
				'#D3CF8F',
				'#CEC674',
				'#C9BC59'
					]
					,
					public: [
						'#F5F5F5',
						'#E9E9E9',
						'#DFDEDE',
						'#D3D2D2',
						'#C6C6C6',
						'#BBBBBB'
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
