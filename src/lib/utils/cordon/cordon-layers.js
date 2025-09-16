import { calculateMarkerSize, getMarkerColor } from './cordon-colors.js';

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
				'circle-color': ['get', 'markerColor'],
				'circle-opacity': 0.8,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#ffffff',
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
 */
export function updateCordonMarkers(map, cordonData, selectedMode = 'walking', selectedYear = '2023') {
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

	// Calculate min/max for sizing
	const values = locationData.map(d => d.value);
	const minValue = Math.min(...values);
	const maxValue = Math.max(...values);

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
			markerSize: calculateMarkerSize(location.value, minValue, maxValue),
			markerColor: getMarkerColor(selectedMode, location.value, maxValue)
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
