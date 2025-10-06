import { 
	getRouteColor, 
	getNTABikeColor, 
	getBusConnectsCdo1Color,
	NTA_BIKE_COLORS,
	BUSCONNECTS_CDO1_COLORS,
	DEFAULT_NTA_COLOR,
	DEFAULT_BUSCONNECTS_COLOR
} from './nta-colors.js';

/**
 * Create cycling infrastructure lines for NTA and BusConnects data visualization
 */

/**
 * Create Mapbox color expression for NTA BIKE types
 * @returns {Array} Mapbox expression for coloring based on BIKE property
 */
function createNTAColorExpression() {
	const expression = ['case'];
	
	// Add color cases for each BIKE type
	Object.entries(NTA_BIKE_COLORS).forEach(([bikeType, color]) => {
		expression.push(['==', ['get', 'BIKE'], bikeType], color);
	});
	
	// Default color
	expression.push(DEFAULT_NTA_COLOR);
	
	return expression;
}

/**
 * Create Mapbox color expression for BusConnects cdo_1 types
 * @returns {Array} Mapbox expression for coloring based on cdo_1 property
 */
function createBusConnectsColorExpression() {
	const expression = ['case'];
	
	// Add color cases for each cdo_1 type
	Object.entries(BUSCONNECTS_CDO1_COLORS).forEach(([cdo1Type, color]) => {
		expression.push(['==', ['get', 'cdo_1'], cdo1Type], color);
	});
	
	// Default color
	expression.push(DEFAULT_BUSCONNECTS_COLOR);
	
	return expression;
}

/**
 * Add cycling infrastructure to the map
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} reshapedData - Processed infrastructure data
 * @param {string} dataSource - Data source type ('nta' or 'busconnects')
 */
export function addNTARoutes(map, reshapedData, dataSource = 'nta') {
	if (!map || !reshapedData || !reshapedData.geoJsonData) return;

	// Add source for cycling infrastructure
	map.addSource('nta-routes', {
		type: 'geojson',
		data: reshapedData.geoJsonData
	});

	// Determine color expression based on data source
	const colorExpression = dataSource === 'busconnects' 
		? createBusConnectsColorExpression() 
		: createNTAColorExpression();

	// Add cycling infrastructure lines layer (visual)
	map.addLayer({
		id: 'nta-routes',
		type: 'line',
		source: 'nta-routes',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': colorExpression, // Use property-based coloring
			'line-width': 4, // Smaller line width as requested
			'line-opacity': 0.8
		}
	});
}

/**
 * Update cycling infrastructure visualization
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} reshapedData - Processed infrastructure data
 * @param {string} dataSource - Data source type ('nta' or 'busconnects')
 */
export function updateNTARoutes(map, reshapedData, dataSource = 'nta') {
	if (!map || !map.getSource('nta-routes') || !reshapedData.geoJsonData) return;

	const layerExists = map.getLayer('nta-routes');
	
	if (layerExists) {
		// Temporarily hide the layer to prevent visual glitches
		map.setLayoutProperty('nta-routes', 'visibility', 'none');
		
		// Update the color expression for the new data source
		const colorExpression = dataSource === 'busconnects' 
			? createBusConnectsColorExpression() 
			: createNTAColorExpression();
		
		map.setPaintProperty('nta-routes', 'line-color', colorExpression);
	}

	// Update the source with the current data
	map.getSource('nta-routes').setData(reshapedData.geoJsonData);

	if (layerExists) {
		// Show the layer again after updates are complete
		map.setLayoutProperty('nta-routes', 'visibility', 'visible');
	}
}

/**
 * Add parking stands to the map
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} parkingData - Processed parking data with GeoJSON
 */
export function addParkingStands(map, parkingData) {
	if (!map || !parkingData || !parkingData.geoJsonData) return;

	// Add source for parking stands
	map.addSource('parking-stands', {
		type: 'geojson',
		data: parkingData.geoJsonData
	});

	// Calculate size expression based on number of stands
	const sizeExpression = [
		'interpolate',
		['linear'],
		['get', 'no_stands'],
		1, 8,    // 1 stand = 8px
		5, 12,   // 5 stands = 12px
		10, 16,  // 10 stands = 16px
		20, 20,  // 20+ stands = 20px
		50, 24   // 50+ stands = 24px
	];

	// Add parking stands layer (circles)
	map.addLayer({
		id: 'parking-stands',
		type: 'circle',
		source: 'parking-stands',
		paint: {
			'circle-radius': sizeExpression,
			'circle-color': '#4A90E2',  // Blue color for parking
			'circle-stroke-width': 2,
			'circle-stroke-color': '#ffffff',
			'circle-opacity': 0.8
		}
	});

}

/**
 * Update parking stands visualization
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} parkingData - Processed parking data with GeoJSON
 */
export function updateParkingStands(map, parkingData) {
	if (!map || !map.getSource('parking-stands') || !parkingData.geoJsonData) return;

	// Update the source with the current data
	map.getSource('parking-stands').setData(parkingData.geoJsonData);
}

/**
 * Toggle parking stands visibility
 * @param {mapboxgl.Map} map - Map instance
 * @param {boolean} visible - Whether to show or hide parking stands
 */
export function toggleParkingStands(map, visible) {
	if (!map) return;

	const visibility = visible ? 'visible' : 'none';
	
	if (map.getLayer('parking-stands')) {
		map.setLayoutProperty('parking-stands', 'visibility', visibility);
	}
}

/**
 * Remove parking stands from the map
 * @param {mapboxgl.Map} map - Map instance
 */
export function removeParkingStands(map) {
	if (!map) return;

	// Remove layer
	if (map.getLayer('parking-stands')) {
		map.removeLayer('parking-stands');
	}

	// Remove source
	if (map.getSource('parking-stands')) {
		map.removeSource('parking-stands');
	}
}

/**
 * Remove NTA cycling infrastructure from the map
 * @param {mapboxgl.Map} map - Map instance
 */
export function removeNTARoutes(map) {
	if (!map) return;

	// Remove layer
	if (map.getLayer('nta-routes')) {
		map.removeLayer('nta-routes');
	}

	// Remove source
	if (map.getSource('nta-routes')) {
		map.removeSource('nta-routes');
	}
}
