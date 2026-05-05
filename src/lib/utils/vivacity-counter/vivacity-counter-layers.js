/**
 * Vivacity-Counter Map Layers Management
 * Handles adding, updating, and removing vivacity-counter layers from the map
 */

import { getVivacityCounterColor } from './vivacity-counter-colors.js';

/**
 * Add vivacity-counter markers to the map
 */
export function addVivacityCounterMarkers(map, locations) {
	
	if (!map || !locations || locations.length === 0) {
		return;
	}

	// Create GeoJSON feature collection for markers
	const geojson = {
		type: 'FeatureCollection',
		features: locations.map((location, index) => {
			const feature = {
				type: 'Feature',
				properties: {
					id: location.id,
					name: location.name,
					description: location.description,
					travelModes: location.travelModes,
					isSelected: false,
					filterMode: 'pedestrian', // Default filter mode
					pedestrian_total: location.pedestrian_total || 0 // Add activity data for sizing
				},
				geometry: {
					type: 'Point',
					coordinates: [location.longitude, location.latitude]
				}
			};
			return feature;
		})
	};
	
	
	// Log expected sizes for debugging
	geojson.features.forEach((feature, index) => {
		const pedestrianTotal = feature.properties.pedestrian_total || 0;
		const calculatedSize = Math.max(8, Math.min(30, 8 + (pedestrianTotal * 0.00005)));
	});


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
					// All markers: scale based on activity only
					'max',
					8, // Minimum size
					[
						'min',
						30, // Maximum size
						[
							'+',
							3, // Base size
							[
								'*',
								0.00005, // Scale factor
								['get', 'pedestrian_total']
							]
						]
					]
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

}

/**
 * Update vivacity-counter marker styles based on selection
 */
export function updateVivacityCounterMarkers(map, selectedLocationId) {
	
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
	const sel =
		selectedLocationId == null ? null : String(selectedLocationId);
	data.features.forEach((feature) => {
		feature.properties.isSelected =
			sel != null && String(feature.properties.id) === sel;
	});

	// Update the source data
	source.setData(data);
}

/**
 * Remove vivacity-counter markers from the map
 * TODO: Implement layer removal
 */
export function removeVivacityCounterMarkers(map) {
	
	if (!map) {
		return;
	}

	// TODO: Remove all vivacity-counter related layers
}
