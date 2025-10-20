/**
 * Process NTA and BusConnects cycling infrastructure data for visualization
 * Processes GeoJSON data with cycling infrastructure features
 */

/**
 * Reshape NTA GeoJSON data for map visualization
 * @param {Object} data - Raw data with GeoJSON cycling infrastructure
 * @returns {Object} Processed GeoJSON data structure
 */
export function reshapeNTAData(data) {
	const { geoJsonData } = data;
	
	if (!geoJsonData || !geoJsonData.features) {
		return {
			geoJsonData: null,
			featureCount: 0,
			bikeTypes: {},
			directions: {}
		};
	}

	// Filter out SHARED_ROAD features
	const filteredFeatures = geoJsonData.features.filter(feature => {
		const bikeType = feature.properties?.BIKE || 'Unknown';
		return bikeType !== 'SHARED_ROAD';
	});

	// Create filtered GeoJSON
	const filteredGeoJsonData = {
		...geoJsonData,
		features: filteredFeatures
	};

	// Analyze the filtered features to get statistics
	const bikeTypes = {};
	const directions = {};
	let totalLength = 0;
	
	filteredFeatures.forEach(feature => {
		const bikeType = feature.properties?.cdo_1 || 'Unknown';
		const direction = feature.properties?.twoway || 'Unknown';
		const length = feature.properties?.Shape_Leng || 0;
		
		bikeTypes[bikeType] = (bikeTypes[bikeType] || 0) + 1;
		directions[direction] = (directions[direction] || 0) + 1;
		totalLength += length;
	});

	return {
		geoJsonData: filteredGeoJsonData,
		featureCount: filteredFeatures.length,
		bikeTypes,
		directions,
		totalLength
	};
}

/**
 * Reshape BusConnects GeoJSON data for map visualization
 * @param {Object} data - Raw data with GeoJSON cycling infrastructure
 * @returns {Object} Processed GeoJSON data structure
 */
export function reshapeBusConnectsData(data) {
	const { geoJsonData } = data;
	
	if (!geoJsonData || !geoJsonData.features) {
		return {
			geoJsonData: null,
			featureCount: 0,
			surfaceTypes: {},
			twowayTypes: {},
			bollardTypes: {}
		};
	}

	// Analyze the features to get statistics
	const surfaceTypes = {};
	const twowayTypes = {};
	const bollardTypes = {};
	let totalLength = 0;
	
	geoJsonData.features.forEach(feature => {
		const surfaceType = feature.properties?.cdo_1 || 'Unknown';
		const twoway = feature.properties?.twoway !== undefined ? 
			(feature.properties.twoway === 1 ? 'Bidirectional' : 'Unidirectional') : 'Unknown';
		const bollard = feature.properties?.bollardpro !== undefined ? 
			(feature.properties.bollardpro === 1 ? 'With Bollards' : 'No Bollards') : 'Unknown';
		// Multiply BusConnects length by 1000 to convert to meters (assuming it's in km)
		const length = (feature.properties?.Shape_Leng || 0);
		
		surfaceTypes[surfaceType] = (surfaceTypes[surfaceType] || 0) + 1;
		twowayTypes[twoway] = (twowayTypes[twoway] || 0) + 1;
		bollardTypes[bollard] = (bollardTypes[bollard] || 0) + 1;
		totalLength += length;
	});

	return {
		geoJsonData,
		featureCount: geoJsonData.features.length,
		surfaceTypes,
		twowayTypes,
		bollardTypes,
		totalLength
	};
}

/**
 * Generic function to process cycling infrastructure data based on data source
 * @param {Object} data - Raw data with GeoJSON cycling infrastructure
 * @param {string} dataSource - Data source type ('nta' or 'busconnects')
 * @returns {Object} Processed GeoJSON data structure
 */
export function processInfrastructureData(data, dataSource) {
	if (dataSource === 'busconnects') {
		return reshapeBusConnectsData(data);
	} else {
		return reshapeNTAData(data);
	}
}

/**
 * Process parking stand data for map visualization
 * @param {Object} data - Raw parking data array
 * @returns {Object} Processed parking data with GeoJSON and statistics
 */
export function processParkingData(data) {
	const { parkingData } = data;
	
	if (!parkingData || !Array.isArray(parkingData)) {
		return {
			geoJsonData: null,
			totalStands: 0,
			totalLocations: 0,
			standTypes: {},
			maxStands: 0,
			minStands: 0
		};
	}

	// Convert to GeoJSON format
	const features = parkingData.map(stand => ({
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [stand.X, stand.Y]
		},
		properties: {
			type_stands: stand.type_stands,
			location_stand: stand.location_stand,
			no_stands: stand.no_stands
		}
	}));

	const geoJsonData = {
		type: 'FeatureCollection',
		features: features
	};

	// Calculate statistics
	const standTypes = {};
	const standTypeCounts = {}; // Count of locations by type
	let totalStands = 0;
	let maxStands = 0;
	let minStands = Infinity;

	parkingData.forEach(stand => {
		const type = stand.type_stands || 'Unknown';
		const numStands = stand.no_stands || 0;
		
		// Count locations by type
		standTypeCounts[type] = (standTypeCounts[type] || 0) + 1;
		// Sum total stands by type
		standTypes[type] = (standTypes[type] || 0) + numStands;
		
		totalStands += numStands;
		maxStands = Math.max(maxStands, numStands);
		minStands = Math.min(minStands, numStands);
	});

	// Handle case where no data
	if (minStands === Infinity) minStands = 0;

	return {
		geoJsonData,
		totalStands,
		totalLocations: parkingData.length,
		standTypes, // Total stands by type
		standTypeCounts, // Count of locations by type
		maxStands,
		minStands
	};
}

/**
 * Get cycling infrastructure statistics
 * @param {Object} reshapedData - Processed infrastructure data
 * @param {string} dataSource - Data source type ('nta' or 'busconnects')
 * @returns {Object} Statistics about the cycling infrastructure
 */
export function getInfrastructureStats(reshapedData, dataSource = 'nta') {
	if (!reshapedData.geoJsonData) return null;
	
	if (dataSource === 'busconnects') {
		return {
			totalFeatures: reshapedData.featureCount,
			surfaceTypes: reshapedData.surfaceTypes,
			twowayTypes: reshapedData.twowayTypes,
			bollardTypes: reshapedData.bollardTypes,
			totalLength: reshapedData.totalLength
		};
	} else {
		return {
			totalFeatures: reshapedData.featureCount,
			bikeTypes: reshapedData.bikeTypes,
			directions: reshapedData.directions,
			totalLength: reshapedData.totalLength
		};
	}
}

/**
 * Get parking statistics
 * @param {Object} parkingData - Processed parking data
 * @returns {Object} Statistics about parking stands
 */
export function getParkingStats(parkingData) {
	if (!parkingData || !parkingData.geoJsonData) return null;
	
	return {
		totalStands: parkingData.totalStands,
		totalLocations: parkingData.totalLocations,
		standTypes: parkingData.standTypes,
		standTypeCounts: parkingData.standTypeCounts,
		maxStands: parkingData.maxStands,
		minStands: parkingData.minStands
	};
}
