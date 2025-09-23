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
	const defaultCenter = isMobile ? [-6.2203, 53.0998] : [-6.1203, 53.3998];

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
 * Zoom to feature bounds with smooth animation
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} feature - GeoJSON feature to zoom to
 * @param {Object} options - Zoom options
 */
export function zoomToFeature(map, feature, options = {}) {
	if (!map || !feature || !feature.geometry) return;
	
	const defaultOptions = {
		padding: 50,
		duration: 1000,
		maxZoom: 12
	};
	
	const zoomOptions = { ...defaultOptions, ...options };
	
	// Calculate bounds of the feature
	const bounds = new mapboxgl.LngLatBounds();
	
	if (feature.geometry.type === 'Polygon') {
		feature.geometry.coordinates[0].forEach(coord => {
			bounds.extend(coord);
		});
	} else if (feature.geometry.type === 'MultiPolygon') {
		feature.geometry.coordinates.forEach(polygon => {
			polygon[0].forEach(coord => {
				bounds.extend(coord);
			});
		});
	}

	console.log('bounds',bounds);
	
	// Adjust bounds based on device type to account for UI positioning
	const isMobile = isMobileDevice();
	
	if (isMobile) {
		// Push bounds up by 0.1 degree latitude on mobile
		const adjustment = 0.05;
		const sw = bounds.getSouthWest();
		const ne = bounds.getNorthEast();
		
		// Shift both corners up by the adjustment
		bounds.setSouthWest([sw.lng, sw.lat - adjustment]);
		bounds.setNorthEast([ne.lng, ne.lat - adjustment]);
	} else {
		// Push bounds left by 0.1 degree longitude on desktop
		const adjustment = 0.05;
		const sw = bounds.getSouthWest();
		const ne = bounds.getNorthEast();
		
		// Shift both corners left by the adjustment
		bounds.setSouthWest([sw.lng - adjustment, sw.lat]);
		bounds.setNorthEast([ne.lng - adjustment, ne.lat]);
	}
	
	console.log('adjusted bounds', bounds);
	
	// Fit map to bounds
	map.fitBounds(bounds, zoomOptions);
}

/**
 * Reset map to default view
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} options - Reset options
 */
export function resetMapView(map, options = {}) {
	if (!map) return;
	
	const isMobile = isMobileDevice();
	const defaultZoom = isMobile ? 8.5 : 9.5;
	const defaultCenter = isMobile ? [-6.2203, 53.0998] : [-6.0203, 53.3998];
	
	const defaultOptions = {
		center: defaultCenter,
		zoom: defaultZoom,
		duration: 1000
	};
	
	const resetOptions = { ...defaultOptions, ...options };
	
	map.flyTo(resetOptions);
}

/**
 * Check if Mapbox token is available
 * @returns {boolean}
 */
export function hasMapboxToken() {
	return !!env.PUBLIC_MAPBOX_TOKEN;
}
