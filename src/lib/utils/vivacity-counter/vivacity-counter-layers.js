/**
 * Vivacity-Counter Map Layers Management
 * Handles adding, updating, and removing vivacity-counter layers from the map
 */

import { getVivacityCounterColor } from './vivacity-counter-colors.js';

/**
 * Add vivacity-counter markers to the map
 */
export function addVivacityCounterMarkers(map, locations) {
	console.log('=== ADDING VIVACITY MARKERS ===');
	console.log('Adding vivacity-counter markers to map:', locations.length, 'locations');
	console.log('Sample location:', locations[0]);
	
	if (!map || !locations || locations.length === 0) {
		console.warn('No map or locations provided for vivacity-counter markers');
		return;
	}

	// Create GeoJSON feature collection for markers
	console.log('Creating GeoJSON features...');
	const geojson = {
		type: 'FeatureCollection',
		features: locations.map((location, index) => {
			console.log(`Feature ${index}: lat=${location.latitude}, lon=${location.longitude}`);
			return {
				type: 'Feature',
				properties: {
					id: location.id,
					name: location.name,
					description: location.description,
					travelModes: location.travelModes,
					isSelected: false,
					filterMode: 'pedestrian' // Default filter mode
				},
				geometry: {
					type: 'Point',
					coordinates: [location.longitude, location.latitude]
				}
			};
		})
	};
	
	console.log('GeoJSON created with', geojson.features.length, 'features');
	console.log('Sample feature coordinates:', geojson.features[0]?.geometry?.coordinates);

	// Add source
	if (map.getSource('vivacity-counter-markers')) {
		map.getSource('vivacity-counter-markers').setData(geojson);
	} else {
		map.addSource('vivacity-counter-markers', {
			type: 'geojson',
			data: geojson
		});
	}

	// Add marker layer
	if (!map.getLayer('vivacity-counter-markers')) {
		map.addLayer({
			id: 'vivacity-counter-markers',
			type: 'circle',
			source: 'vivacity-counter-markers',
			paint: {
				'circle-radius': [
					'case',
					['get', 'isSelected'],
					22, // Larger radius for selected
					14  // Default radius
				],
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
	if (!map.getLayer('vivacity-counter-labels')) {
		map.addLayer({
			id: 'vivacity-counter-labels',
			type: 'symbol',
			source: 'vivacity-counter-markers',
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

	console.log('Vivacity-counter markers added successfully');
}

/**
 * Update vivacity-counter marker styles based on selection
 */
export function updateVivacityCounterMarkers(map, selectedLocationId) {
	console.log('Updating vivacity-counter marker styles, selected:', selectedLocationId);
	
	if (!map || !map.getSource('vivacity-counter-markers')) {
		return;
	}

	// Get current data
	const source = map.getSource('vivacity-counter-markers');
	const data = source._data;
	
	if (!data || !data.features) {
		return;
	}

	// Update isSelected property for all features
	data.features.forEach(feature => {
		feature.properties.isSelected = (feature.properties.id === selectedLocationId);
	});

	// Update the source data
	source.setData(data);
}

/**
 * Remove eco-counter markers from the map
 * TODO: Implement layer removal
 */
export function removeEcoCounterMarkers(map) {
	console.log('removeEcoCounterMarkers - TODO: Implement layer removal');
	
	if (!map) {
		return;
	}

	// TODO: Remove all eco-counter related layers
}
