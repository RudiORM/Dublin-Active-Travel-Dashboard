import { env } from '$env/dynamic/public';
import mapboxgl from 'mapbox-gl';

/**
 * Initialize Mapbox GL JS map
 * @param {HTMLElement} container - Map container element
 * @param {Object} options - Map options
 * @returns {mapboxgl.Map} - Mapbox map instance
 */
export function initializeMap(container, options = {}) {
	if (!env.PUBLIC_MAPBOX_TOKEN) {
		console.error('Cannot initialize map: PUBLIC_MAPBOX_TOKEN is not set');
		return null;
	}
	
	mapboxgl.accessToken = env.PUBLIC_MAPBOX_TOKEN;

	const defaultOptions = {
		container,
		style: 'mapbox://styles/mapbox/satellite-v9',
		center: [-6.0203, 53.3998], // Dublin coordinates
		zoom: 9.5
	};

	return new mapboxgl.Map({ ...defaultOptions, ...options });
}

/**
 * Add GeoJSON source to map
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} sourceId - Source ID
 * @param {Object} geoJsonData - GeoJSON data
 */
export function addGeoJSONSource(map, sourceId, geoJsonData) {
	if (!map || !sourceId || !geoJsonData) return;
	
	map.addSource(sourceId, {
		type: 'geojson',
		data: geoJsonData
	});
}

/**
 * Update GeoJSON source data
 * @param {mapboxgl.Map} map - Map instance
 * @param {string} sourceId - Source ID
 * @param {Object} geoJsonData - New GeoJSON data
 */
export function updateGeoJSONSource(map, sourceId, geoJsonData) {
	if (!map || !sourceId || !geoJsonData) return;
	
	const source = map.getSource(sourceId);
	if (source) {
		source.setData(geoJsonData);
	}
}

/**
 * Check if Mapbox token is available
 * @returns {boolean}
 */
export function hasMapboxToken() {
	return !!env.PUBLIC_MAPBOX_TOKEN;
}
