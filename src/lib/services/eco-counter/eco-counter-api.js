/**
 * Eco-Counter API Service
 * Handles fetching data from the Eco-Counter API
 */

// Get API key from environment variables
function getApiKey() {
	// Try different ways to access the environment variable
	if (typeof process !== 'undefined' && process.env) {
		return process.env.ECO_COUNTER_API;
	}
	
	// For Vite/browser environment, try both prefixed and non-prefixed
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env.ECO_COUNTER_API || import.meta.env.VITE_ECO_COUNTER_API;
	}
	
	return null;
}

/**
 * Fetch eco-counter sites/locations for markers
 */
export async function fetchEcoCounterLocations() {
	try {
		const apiKey = getApiKey();
		
		if (!apiKey) {
			throw new Error('ECO_COUNTER_API environment variable is not set');
		}

		const options = {
			method: 'GET',
			headers: {
				accept: 'application/json', 
				'X-API-KEY': apiKey
			}
		};

		
		const response = await fetch(
			'https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc', 
			options
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const sitesData = await response.json();
		
		return sitesData;
	} catch (error) {
		throw error;
	}
}

/**
 * Fetch daily traffic data for eco-counter sites
 */
export async function fetchEcoCounterTraffic() {
	try {
		const apiKey = getApiKey();
		
		if (!apiKey) {
			throw new Error('ECO_COUNTER_API environment variable is not set');
		}

		const options = {
			method: 'GET',
			headers: {
				accept: 'application/json', 
				'X-API-KEY': apiKey
			}
		};

		
		const response = await fetch(
			'https://api.eco-counter.com/api/v2/statistical/adt/by/site?dateRange=lastMonth&groupBy=siteAndTravelMode&travelModes=pedestrian&travelModes=bike', 
			options
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const trafficData = await response.json();
		
		return trafficData;
	} catch (error) {
		throw error;
	}
}

/**
 * Fetch time series data for a specific eco-counter site via server-side API
 * @param {number} siteId - The site ID to fetch data for
 * @returns {Promise<Object>} Time series data with multiple periods
 */
export async function fetchEcoCounterTimeSeries(siteId) {
	
	try {
		const response = await fetch('/api/eco-counter/timeseries', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ siteId })
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		
		if (data.error) {
			throw new Error(data.error);
		}

		return data;
		
	} catch (error) {
		throw error;
	}
}

/**
 * Fetch readings for a specific eco-counter location
 * TODO: Implement specific site readings API call
 */
export async function fetchEcoCounterReadings(locationId, startDate, endDate) {
	try {
		// TODO: Replace with actual API call for specific site readings
		return [];
	} catch (error) {
		throw error;
	}
}
