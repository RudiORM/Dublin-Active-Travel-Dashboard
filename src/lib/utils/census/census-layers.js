import { generateColorStops, getSelectionColor } from './census-colors.js';

/**
 * Create census choropleth layer configuration
 * @param {string} sourceId - Map source ID
 * @returns {Object} - Layer configuration
 */
export function createChoroplethLayer(sourceId) {
	return {
		id: 'census-choropleth',
		type: 'fill',
		source: sourceId,
		paint: {
			'fill-color': '#cccccc',
			'fill-opacity': 0.95
		}
	};
}

/**
 * Create census border layer configuration
 * @param {string} sourceId - Map source ID
 * @returns {Object} - Layer configuration
 */
export function createBorderLayer(sourceId) {
	return {
		id: 'census-borders',
		type: 'line',
		source: sourceId,
		paint: {
			'line-color': '#333',
			'line-width': 1
		}
	};
}

/**
 * Update choropleth layer paint properties
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} statData - Statistics data
 * @param {string} selectedMode - Selected transportation mode
 * @param {string} selectedArea - Selected area name
 * @param {string} boundaryType - Boundary type ('lea' or 'ed')
 */
export function updateChoroplethVisualization(map, statData, selectedMode, selectedArea, boundaryType = 'lea') {
	if (!map || !statData) return;
	
	// Get min and max values for the selected statistic (using percentages)
	const percentages = Object.keys(statData)
		.filter(key => key !== '_TOTAL')
		.map(areaName => statData[areaName].percentage);
	
	const maxPercentage = Math.max(...percentages);
	const minPercentage = Math.min(...percentages);
	
	// Generate color stops
	const colorStops = generateColorStops(selectedMode, minPercentage, maxPercentage);
	
	// Get the correct property name based on boundary type
	const areaProperty = boundaryType === 'ed' ? 'ED_ENGLISH' : 'CSO_LEA';
	
	// Update the paint property
	map.setPaintProperty('census-choropleth', 'fill-color', [
		'case',
		['==', ['get', areaProperty], selectedArea || ''],
		getSelectionColor(),
		[
			'interpolate',
			['linear'],
			['get', 'selected_percentage'],
			...colorStops.flat()
		]
	]);
}
