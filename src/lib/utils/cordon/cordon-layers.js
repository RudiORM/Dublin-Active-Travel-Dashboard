import { calculateMarkerSize, getMarkerColor, getSelectionColor } from './cordon-colors.js';

/**
 * Create circular markers for cordon count locations
 */

/**
 * Add cordon markers to the map
 * @param {mapboxgl.Map} map - Map instance
 * @param {Array} walkingData - Walking data with locations and totals
 */
export function addCordonMarkers(map, walkingData) {
	if (!map || !walkingData || walkingData.length === 0) return;

	// Calculate min/max values for sizing
	const values = walkingData.map(d => d.walkingTotal);
	const minValue = Math.min(...values);
	const maxValue = Math.max(...values);

	// Create GeoJSON features for markers
	const features = walkingData.map(location => ({
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [location.longitude, location.latitude]
		},
		properties: {
			siteNo: location.siteNo,
			location: location.location,
			walkingTotal: location.walkingTotal,
			markerSize: calculateMarkerSize(location.walkingTotal, minValue, maxValue),
			markerColor: getMarkerColor('walking', location.walkingTotal, maxValue)
		}
	}));

	const geojsonData = {
		type: 'FeatureCollection',
		features
	};

	// Add source
	if (map.getSource('cordon-markers')) {
		map.getSource('cordon-markers').setData(geojsonData);
	} else {
		map.addSource('cordon-markers', {
			type: 'geojson',
			data: geojsonData
		});
	}

	// Add circle layer if it doesn't exist
	if (!map.getLayer('cordon-circles')) {
		map.addLayer({
			id: 'cordon-circles',
			type: 'circle',
			source: 'cordon-markers',
			paint: {
				'circle-radius': ['get', 'markerSize'],
				'circle-color': [
					'case',
					['get', 'isSelected'],
					getSelectionColor(), // Gold color for selected
					['get', 'markerColor'] // Normal color for unselected
				],
				'circle-opacity': 0.8,
				'circle-stroke-width': [
					'case',
					['get', 'isSelected'],
					3, // Thicker stroke for selected
					1  // Normal stroke for unselected
				],
				'circle-stroke-color': [
					'case',
					['get', 'isSelected'],
					'#ffffff', // White stroke for selected
					'#ffffff'  // White stroke for unselected
				],
				'circle-stroke-opacity': 0.9
			}
		});
	}

	// Add labels layer if it doesn't exist

}

/**
 * Update cordon markers with new data
 * @param {mapboxgl.Map} map - Map instance  
 * @param {Object} cordonData - Processed cordon data
 * @param {string} selectedMode - Selected transportation mode
 * @param {string} selectedYear - Selected year
 * @param {string|null} selectedLocation - Currently selected location
 */
export function updateCordonMarkers(map, cordonData, selectedMode = 'walking', selectedYear = '2023', selectedLocation = null) {
	if (!map || !cordonData || !cordonData.byLocation) return;

	const locationData = [];
	
	// Extract data for selected mode and year
	Object.keys(cordonData.byLocation).forEach(locationName => {
		const location = cordonData.byLocation[locationName];
		const value = location.data[selectedMode]?.[selectedYear]?.raw || 0;
		
		if (value > 0) {
			locationData.push({
				...location,
				value: value,
				mode: selectedMode,
				year: selectedYear
			});
		}
	});

	// Calculate min/max for sizing - use global max across all modes for consistent scaling
	const values = locationData.map(d => d.value);
	const minValue = Math.min(...values);
	
	// Calculate global maximum across all modes and years for consistent scaling
	let globalMaxValue = 0;
	Object.keys(cordonData.byLocation).forEach(locationName => {
		const location = cordonData.byLocation[locationName];
		// Check all modes and years to find the absolute maximum
		Object.keys(location.data).forEach(mode => {
			Object.keys(location.data[mode]).forEach(year => {
				const value = location.data[mode][year]?.raw || 0;
				if (value > globalMaxValue) {
					globalMaxValue = value;
				}
			});
		});
	});
	
	console.log(`Scaling markers: current mode max = ${Math.max(...values)}, global max = ${globalMaxValue}`);

	// Create GeoJSON features
	const features = locationData.map(location => ({
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [location.longitude, location.latitude]
		},
		properties: {
			siteNo: location.siteNo,
			location: location.location,
			value: location.value,
			mode: selectedMode,
			year: selectedYear,
			isSelected: selectedLocation === location.location, // Add selection state
			markerSize: calculateMarkerSize(location.value, minValue, globalMaxValue),
			markerColor: getMarkerColor(selectedMode, location.value, globalMaxValue)
		}
	}));

	const geojsonData = {
		type: 'FeatureCollection',
		features
	};

	// Update source data
	if (map.getSource('cordon-markers')) {
		map.getSource('cordon-markers').setData(geojsonData);
	}

	// Update label text field to show current values
	if (map.getLayer('cordon-labels')) {
		map.setLayoutProperty('cordon-labels', 'text-field', ['get', 'value']);
	}
}

/**
 * Remove cordon markers from map
 * @param {mapboxgl.Map} map - Map instance
 */
export function removeCordonMarkers(map) {
	if (!map) return;

	// Remove layers
	if (map.getLayer('cordon-labels')) {
		map.removeLayer('cordon-labels');
	}
	if (map.getLayer('cordon-circles')) {
		map.removeLayer('cordon-circles');
	}

	// Remove source
	if (map.getSource('cordon-markers')) {
		map.removeSource('cordon-markers');
	}
}
