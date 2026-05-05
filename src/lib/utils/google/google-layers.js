import { generateGoogleColorStops, getGoogleSelectionColor } from './google-colors.js';

/**
 * Create Google choropleth layer configuration
 * @param {string} sourceId - Map source ID
 * @returns {Object} - Layer configuration
 */
export function createGoogleChoroplethLayer(sourceId) {
	return {
		id: 'google-choropleth',
		type: 'fill',
		source: sourceId,
		paint: {
			'fill-color': '#cccccc',
			'fill-opacity': 0.95
		}
	};
}

/**
 * Create Google border layer configuration
 * @param {string} sourceId - Map source ID
 * @returns {Object} - Layer configuration
 */
export function createGoogleBorderLayer(sourceId) {
	return {
		id: 'google-borders',
		type: 'line',
		source: sourceId,
		paint: {
			'line-color': '#333',
			'line-width': 1
		}
	};
}

/**
 * Update Google choropleth layer paint properties
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} reshapedData - Reshaped Google data
 * @param {string} selectedMode - Selected transportation mode
 * @param {string} selectedMetric - Selected metric (trips, distance, co2)
 * @param {string} selectedScope - Selected scope (full, gpc)
 * @param {string} selectedArea - Selected area name
 * @param {string} selectedFilter - Selected filter value (for legend filtering)
 */
export function updateGoogleVisualization(map, reshapedData, selectedMode, selectedMetric, selectedScope, selectedArea, selectedFilter = 'all') {
	if (!map || !reshapedData || !reshapedData.byArea) return;
	
	// Get all values for the selected combination
	// For trips, use percentages; for other metrics, use raw values
	const values = Object.keys(reshapedData.byArea)
		.map(areaName => {
			const data = reshapedData.byArea[areaName][selectedMode]?.[selectedMetric]?.[selectedScope];
			if (selectedMetric === 'trips' && data?.percentage !== undefined) {
				return data.percentage;
			}
			return data?.raw || 0;
		});
	
	const maxValue = Math.max(...values);
	const minValue = Math.min(...values);
	
	// Generate color stops
	const colorStops = generateGoogleColorStops(selectedMode, minValue, maxValue);
	
	// Handle case where all values are the same (uniform data)
	let fillColorExpression;
	if (minValue === maxValue && colorStops.length === 1) {
		// All areas have the same value, use a simple color with selection highlight
		fillColorExpression = [
			'case',
			['==', ['get', 'ENG_NAME_VALUE'], selectedArea || ''],
			getGoogleSelectionColor(),
			colorStops[0][1] // Use the single color from color stops
		];
	} else {
		// Use interpolate expression for varying data
		fillColorExpression = [
			'case',
			['==', ['get', 'ENG_NAME_VALUE'], selectedArea || ''],
			getGoogleSelectionColor(),
			[
				'interpolate',
				['linear'],
				['get', 'selected_value'],
				...colorStops.flat()
			]
		];
	}
	
	// Update the paint property
	map.setPaintProperty('google-choropleth', 'fill-color', fillColorExpression);
	
	// Handle filtering by adjusting opacity based on selectedFilter
	if (selectedFilter === 'all') {
		// Show all areas at full opacity
		map.setPaintProperty('google-choropleth', 'fill-opacity', 0.95);
	} else {
		// For specific filter values, show only areas within that specific range
		const filterValue = parseFloat(selectedFilter);
		if (!isNaN(filterValue)) {
			// Find the range for this filter value from color stops
			let rangeMin = filterValue;
			let rangeMax = filterValue;
			
			// Find the current and next color stops to determine the range
			const currentIndex = colorStops.findIndex(stop => stop[0] === filterValue);
			if (currentIndex >= 0) {
				rangeMin = filterValue;
				// If this is the last color stop, use maxValue as upper bound
				if (currentIndex === colorStops.length - 1) {
					rangeMax = maxValue;
				} else {
					// Use the next color stop value as upper bound (exclusive)
					rangeMax = colorStops[currentIndex + 1][0];
				}
			}
			
			// Create an expression that shows full opacity for areas within the specific range
			let opacityExpression;
			if (currentIndex === colorStops.length - 1) {
				// For the highest range: "this and above" (inclusive)
				opacityExpression = [
					'case',
					['>=', ['get', 'selected_value'], rangeMin],
					0.95, // Full opacity for areas >= this value
					0.2   // Very dim for areas below this value
				];
			} else {
				// For all other ranges: exclusive upper bound
				opacityExpression = [
					'case',
					[
						'all',
						['>=', ['get', 'selected_value'], rangeMin],
						['<', ['get', 'selected_value'], rangeMax]
					],
					0.95, // Full opacity for areas in this range
					0.2   // Very dim for areas outside this range
				];
			}
			map.setPaintProperty('google-choropleth', 'fill-opacity', opacityExpression);
		} else {
			// Fallback to full opacity if filter value is not a number
			map.setPaintProperty('google-choropleth', 'fill-opacity', 0.95);
		}
	}
}
