import { env } from '$env/dynamic/public';
import mapboxgl from 'mapbox-gl';

/**
 * Check if the device is mobile
 * @returns {boolean}
 */
function isMobileDevice() {
	return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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

	// Use lower zoom for mobile devices
	const isMobile = isMobileDevice();
	const defaultZoom = isMobile ? 8.5 : 9.5;
	const defaultCenter = isMobile ? [-6.2203, 53.0998] : [-6.0203, 53.3998];

	const defaultOptions = {
		container,
		style: 'mapbox://styles/mapbox/satellite-v9',
		center: defaultCenter, // Dublin coordinates
		zoom: defaultZoom
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
