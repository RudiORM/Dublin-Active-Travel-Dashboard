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
	
	// Add color cases for each cdo_1 type (matching the actual data)
	Object.entries(NTA_BIKE_COLORS).forEach(([bikeType, color]) => {
		expression.push(['==', ['get', 'cdo_1'], bikeType], color);
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
		// Hide Signed route features entirely from the visual layer
		filter: ['!=', ['get', 'cdo_1'], 'Signed route'],
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
		// Ensure Signed route features remain hidden on update
		map.setFilter('nta-routes', ['!=', ['get', 'cdo_1'], 'Signed route']);
	}

	// Update the source with the current data
	map.getSource('nta-routes').setData(reshapedData.geoJsonData);

	if (layerExists) {
		// Show the layer again after updates are complete
		map.setLayoutProperty('nta-routes', 'visibility', 'visible');
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
