/**
 * Hide all layers for a specific data source
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} dataSource - Data source name (e.g., 'census', 'google')
 */
export function hideDataSourceLayers(map, dataSource) {
	if (!map) return;
	
	const layerIds = getDataSourceLayerIds(dataSource);
	
	layerIds.forEach(layerId => {
		if (map.getLayer(layerId)) {
			map.setLayoutProperty(layerId, 'visibility', 'none');
		}
	});
}

/**
 * Show all layers for a specific data source
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} dataSource - Data source name (e.g., 'census', 'google')
 */
export function showDataSourceLayers(map, dataSource) {
	if (!map) return;
	
	const layerIds = getDataSourceLayerIds(dataSource);
	
	layerIds.forEach(layerId => {
		if (map.getLayer(layerId)) {
			map.setLayoutProperty(layerId, 'visibility', 'visible');
		}
	});
}

/**
 * Remove all layers and sources for a specific data source
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} dataSource - Data source name (e.g., 'census', 'google')
 */
export function removeDataSourceLayers(map, dataSource) {
	if (!map) return;
	
	const layerIds = getDataSourceLayerIds(dataSource);
	const sourceId = `${dataSource}-data`;
	
	// Remove layers
	layerIds.forEach(layerId => {
		if (map.getLayer(layerId)) {
			map.removeLayer(layerId);
		}
	});
	
	// Remove source
	if (map.getSource(sourceId)) {
		map.removeSource(sourceId);
	}
}

/**
 * Hide all layers except for the specified data source
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} activeDataSource - The data source to keep visible
 * @param {Array<string>} allDataSources - Array of all data source names
 */
export function showOnlyDataSource(map, activeDataSource, allDataSources = ['census', 'google', 'cordon', 'strava', 'eco-counter', 'vivacity-counter']) {
	if (!map) return;
	
	allDataSources.forEach(dataSource => {
		if (dataSource === activeDataSource) {
			showDataSourceLayers(map, dataSource);
		} else {
			hideDataSourceLayers(map, dataSource);
		}
	});
}

/**
 * Get layer IDs for a specific data source
 * @param {string} dataSource - Data source name
 * @returns {Array<string>} - Array of layer IDs
 */
function getDataSourceLayerIds(dataSource) {
	const layerMappings = {
		census: ['census-choropleth', 'census-borders'],
		google: ['google-choropleth', 'google-borders'],
		cordon: ['cordon-circles', 'cordon-labels'],
		strava: ['strava-routes', 'strava-route-labels'],
		'eco-counter': ['eco-counter-markers', 'eco-counter-labels'],
		'vivacity-counter': ['vivacity-counter-markers', 'vivacity-counter-labels']
	};
	
	return layerMappings[dataSource] || [];
}
