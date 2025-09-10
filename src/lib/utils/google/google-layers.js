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
 */
export function updateGoogleVisualization(map, reshapedData, selectedMode, selectedMetric, selectedScope, selectedArea) {
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
}
