import { getRouteColor, calculateLineWidth, getRouteOpacity } from './strava-colors.js';

/**
 * Create route lines for Strava data visualization
 */

/**
 * Add Strava routes to the map
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} reshapedData - Processed Strava data
 */
export function addStravaRoutes(map, reshapedData) {
	if (!map || !reshapedData || Object.keys(reshapedData.byRoute).length === 0) return;

	// Create GeoJSON features for all routes
	const features = Object.keys(reshapedData.byRoute).map(routeName => {
		const route = reshapedData.byRoute[routeName];
		
		// Convert GeometryCollection to MultiLineString if needed
		let coordinates = [];
		if (route.geometry.type === 'GeometryCollection') {
			coordinates = route.geometry.geometries
				.filter(geom => geom.type === 'LineString')
				.map(geom => geom.coordinates);
		} else if (route.geometry.type === 'LineString') {
			coordinates = [route.geometry.coordinates];
		}

		return {
			type: 'Feature',
			geometry: {
				type: 'MultiLineString',
				coordinates: coordinates
			},
			properties: {
				route: routeName,
				total: route.totals.total,
				average: route.totals.average,
				color: getRouteColor(routeName)
			}
		};
	});

	// Add source for routes
	map.addSource('strava-routes', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: features
		}
	});

	// Add invisible thick click target layer (for better click detection)
	map.addLayer({
		id: 'strava-routes-clickable',
		type: 'line',
		source: 'strava-routes',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': 'transparent',
			'line-width': 20, // Thick invisible line for easier clicking
			'line-opacity': 0
		}
	});

	// Add route lines layer (visual)
	map.addLayer({
		id: 'strava-routes',
		type: 'line',
		source: 'strava-routes',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': ['get', 'color'],
			'line-width': 4,
			'line-opacity': 0.8
		}
	});

	// Add route labels layer
	map.addLayer({
		id: 'strava-route-labels',
		type: 'symbol',
		source: 'strava-routes',
		layout: {
			'text-field': ['get', 'route'],
			'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
			'text-size': 12,
			'text-offset': [0, 1],
			'text-anchor': 'top',
			'symbol-placement': 'line'
		},
		paint: {
			'text-color': '#333333',
			'text-halo-color': '#FFFFFF',
			'text-halo-width': 2
		}
	});
}

/**
 * Update Strava routes visualization based on selection
 * @param {mapboxgl.Map} map - Map instance
 * @param {Object} reshapedData - Processed Strava data
 * @param {string} selectedRoute - Currently selected route
 */
export function updateStravaRoutes(map, reshapedData, selectedRoute) {
	if (!map || !map.getSource('strava-routes')) return;

	// Calculate values for line width scaling
	const totalValues = Object.values(reshapedData.byRoute).map(route => route.totals.total);
	const minValue = Math.min(...totalValues);
	const maxValue = Math.max(...totalValues);

	// Update features with selection state
	const features = Object.keys(reshapedData.byRoute).map(routeName => {
		const route = reshapedData.byRoute[routeName];
		const isSelected = routeName === selectedRoute;
		
		// Convert GeometryCollection to MultiLineString if needed
		let coordinates = [];
		if (route.geometry.type === 'GeometryCollection') {
			coordinates = route.geometry.geometries
				.filter(geom => geom.type === 'LineString')
				.map(geom => geom.coordinates);
		} else if (route.geometry.type === 'LineString') {
			coordinates = [route.geometry.coordinates];
		}

		return {
			type: 'Feature',
			geometry: {
				type: 'MultiLineString',
				coordinates: coordinates
			},
			properties: {
				route: routeName,
				total: route.totals.total,
				average: route.totals.average,
				color: isSelected ? '#FFD249' : getRouteColor(routeName), // Yellow for selected route
				isSelected: isSelected,
				lineWidth: calculateLineWidth(route.totals.total, minValue, maxValue),
				opacity: getRouteOpacity(isSelected)
			}
		};
	});

	// Update the source
	map.getSource('strava-routes').setData({
		type: 'FeatureCollection',
		features: features
	});

	// Update paint properties
	map.setPaintProperty('strava-routes', 'line-width', [
		'case',
		['get', 'isSelected'],
		10, // Thicker line for selected route
		6 // Standard width for non-selected routes
	]);

	map.setPaintProperty('strava-routes', 'line-opacity', [
		'case',
		['get', 'isSelected'],
		1.0, // Full opacity for selected route
		1 // Reduced opacity for non-selected routes
	]);
}

/**
 * Remove Strava routes from the map
 * @param {mapboxgl.Map} map - Map instance
 */
export function removeStravaRoutes(map) {
	if (!map) return;

	// Remove layers
	if (map.getLayer('strava-route-labels')) {
		map.removeLayer('strava-route-labels');
	}
	if (map.getLayer('strava-routes')) {
		map.removeLayer('strava-routes');
	}
	if (map.getLayer('strava-routes-clickable')) {
		map.removeLayer('strava-routes-clickable');
	}

	// Remove source
	if (map.getSource('strava-routes')) {
		map.removeSource('strava-routes');
	}
}
