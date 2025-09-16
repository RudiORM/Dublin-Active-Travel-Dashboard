/**
 * Color schemes for different transportation modes in Google data
 */
export const googleColorSchemes = {
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
					]
					,
					public: [
						'#F6EED9',
						'#F0E1B9',
						'#EBD599',
						'#E7C779',
						'#E1B958',
						'#DDAA33'
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
export function getGoogleSelectionColor() {
	return '#F8D463';
}

/**
 * Get the primary (darkest) color for a specific mode
 * @param {string} mode - Transportation mode
 * @returns {string} The primary color for the mode
 */
export function getGooglePrimaryColor(mode) {
	const colors = googleColorSchemes[mode] || googleColorSchemes.walking;
	return colors[colors.length - 1]; // Return the last (darkest) color
}
