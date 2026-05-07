/**
 * Eco-Counter Map Layers Management
 * Handles adding, updating, and removing eco-counter layers from the map
 */

import { getEcoCounterColor } from './eco-counter-colors.js';

/**
 * Add eco-counter markers to the map
 */
export function addEcoCounterMarkers(map, locations) {
	
	if (!map || !locations || locations.length === 0) {
		return;
	}

	// Create GeoJSON feature collection for markers
	const geojson = {
		type: 'FeatureCollection',
		features: locations.map(location => ({
			type: 'Feature',
			properties: {
				id: location.id,
				name: location.name,
				description: location.description,
				travelModes: location.travelModes,
				isSelected: false,
				filterMode: 'pedestrian', // Default filter mode
				total_7day_count: location.total_7day_count || 0 // Add activity data for sizing
			},
			geometry: {
				type: 'Point',
				coordinates: [location.longitude, location.latitude]
			}
		}))
	};

	// Add source
	if (map.getSource('eco-counter-markers')) {
		map.getSource('eco-counter-markers').setData(geojson);
	} else {
		map.addSource('eco-counter-markers', {
			type: 'geojson',
			data: geojson
		});
	}

	// Add marker layer
	if (!map.getLayer('eco-counter-markers')) {
		map.addLayer({
			id: 'eco-counter-markers',
			type: 'circle',
			source: 'eco-counter-markers',
			paint: {
				'circle-radius': 10,
				'circle-opacity': 0.8,

				'circle-color': [
					'case',
					['get', 'isSelected'],
					'#FFD249', // Yellow for selected
					[
						'case',
						['==', ['get', 'filterMode'], 'bike'],
						'#33BBEE', // Blue for bike filter
						'#CC3311'  // Default red for pedestrian mode
					]
				],
				'circle-stroke-width': 1,
				'circle-stroke-color': '#FFFFFF'
			}
		});
	}

	// Add labels
	if (!map.getLayer('eco-counter-labels')) {
		map.addLayer({
			id: 'eco-counter-labels',
			type: 'symbol',
			source: 'eco-counter-markers',
			layout: {
				'text-field': ['get', 'name'],
				'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
				'text-offset': [0, 1.25],
				'text-anchor': 'top',
				'text-size': 12
			},
			paint: {
				'text-color': '#333333',
				'text-halo-color': '#FFFFFF',
				'text-halo-width': 1
			}
		});
	}

}

/**
 * Update eco-counter marker styles based on selection
 */
export function updateEcoCounterMarkers(map, selectedLocationId) {
	
	if (!map || !map.getSource('eco-counter-markers')) {
		return;
	}

	// Get current data
	const source = map.getSource('eco-counter-markers');
	const data = source._data;
	
	if (!data || !data.features) {
		return;
	}

	// Update isSelected property for all features (GeoJSON ids may be string or number)
	data.features.forEach((feature) => {
		feature.properties.isSelected =
			selectedLocationId != null &&
			String(feature.properties.id) === String(selectedLocationId);
	});

	// Update the source data
	source.setData(data);
}

/**
 * Remove eco-counter markers from the map
 * TODO: Implement layer removal
 */
export function removeEcoCounterMarkers(map) {
	
	if (!map) {
		return;
	}

	// TODO: Remove all eco-counter related layers
}
