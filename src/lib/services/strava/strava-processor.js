/**
 * Process strava data for visualization
 * Combines historical data with route geometries for map display and time series
 */

/**
 * Reshape strava data for easier access and visualization
 * @param {Object} data - Raw data with historical data and route geometries
 * @returns {Object} Reshaped data structure
 */
export function reshapeStravaData(data) {
	const { historicalData, routes } = data;
	
	// Process historical data by route and date
	const processedData = {
		byRoute: {},
		byDate: {},
		routes: routes,
		timeSeriesData: []
	};

	// Initialize route data structure
	const routeNames = ['Clontarf to City Center', 'Dun Laoghaire Coastal', 'Dodder Greenway', 'Portmarnock Greenway'];
	
	routeNames.forEach(routeName => {
		processedData.byRoute[routeName] = {
			name: routeName,
			geometry: routes[routeName],
			data: [],
			totals: {}
		};
	});

	// Process historical data
	historicalData.forEach(record => {
		const date = record.date;
		processedData.byDate[date] = record;
		
		// Add to time series data
		processedData.timeSeriesData.push({
			date: date,
			'Clontarf to City Center': record['Clontarf to City Center'],
			'Dun Laoghaire Coastal': record['Dun Laoghaire Coastal'],
			'Dodder Greenway': record['Dodder Greenway'],
			'Portmarnock Greenway': record['Portmarnock Greenway']
		});

		// Add data to each route
		routeNames.forEach(routeName => {
			processedData.byRoute[routeName].data.push({
				date: date,
				value: record[routeName]
			});
		});
	});

	// Calculate totals for each route
	routeNames.forEach(routeName => {
		const routeData = processedData.byRoute[routeName].data;
		const total = routeData.reduce((sum, item) => sum + (item.value || 0), 0);
		const average = total / routeData.length;
		const max = Math.max(...routeData.map(item => item.value || 0));
		const min = Math.min(...routeData.map(item => item.value || 0));

		processedData.byRoute[routeName].totals = {
			total,
			average,
			max,
			min,
			count: routeData.length
		};
	});

	return processedData;
}

/**
 * Get time series data for a specific route
 * @param {Object} reshapedData - Processed strava data
 * @param {string} routeName - Name of the route
 * @returns {Array} Time series data for the route
 */
export function getRouteTimeSeriesData(reshapedData, routeName) {
	if (!reshapedData.byRoute[routeName]) return [];
	
	return reshapedData.byRoute[routeName].data.map(item => ({
		date: item.date,
		value: item.value,
		route: routeName
	}));
}

/**
 * Get all routes data for map display
 * @param {Object} reshapedData - Processed strava data
 * @returns {Array} Array of route data with geometries
 */
export function getAllRoutesData(reshapedData) {
	return Object.keys(reshapedData.byRoute).map(routeName => {
		const route = reshapedData.byRoute[routeName];
		return {
			name: routeName,
			geometry: route.geometry,
			totals: route.totals
		};
	});
}
