/**
 * Vivacity-Counter API Service
 * Handles fetching data from the Vivacity-Counter API
 */

// Get API key from environment variables
function getApiKey() {
	// Try different ways to access the environment variable
	if (typeof process !== 'undefined' && process.env) {
		return process.env.VIVACITY_API;
	}
	
	// For Vite/browser environment, try both prefixed and non-prefixed
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env.VIVACITY_API || import.meta.env.VITE_VIVACITY_API;
	}
	
	return null;
}

/**
 * Fetch vivacity-counter sites/locations for markers
 */
export async function fetchVivacityCounterLocations() {
	try {
		const apiKey = getApiKey();
		
		if (!apiKey) {
			throw new Error('VIVACITY_API environment variable is not set');
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
 * Fetch daily traffic data for vivacity-counter sites
 */
export async function fetchVivacityCounterTraffic() {
	try {
		const apiKey = getApiKey();
		
		if (!apiKey) {
			throw new Error('VIVACITY_API environment variable is not set');
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
 * Fetch time series data for a specific vivacity-counter site via server-side API
 * @param {number} siteId - The site ID to fetch data for
 * @returns {Promise<Object>} Time series data with multiple periods
 */
/**
 * Citywide Vivacity counts (all sensors). Server batches countlines to limit URL size.
 * @param {Array<{ id: string, name: string, countlineIds: string[] }>} sensors
 */
export async function fetchVivacityCitywide(sensors) {
	try {
		const response = await fetch('/api/vivacity-counter/citywide', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ sensors })
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
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
 * @param {string|string[]} siteId countline id(s)
 * @param {string|number|null|undefined} sensorId Vivacity sensor / site id for snapshot merge (optional)
 */
export async function fetchVivacityCounterTimeSeries(siteId, sensorId = undefined) {
	try {
		const response = await fetch('/api/vivacity-counter/timeseries', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				siteId,
				...(sensorId != null && String(sensorId) !== '' ? { sensorId: String(sensorId) } : {})
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const detail = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
			console.error('[vivacity-timeseries] client POST failed', response.status, detail);
			throw new Error(detail);
		}

		const data = await response.json();
		
		if (data.error) {
			const detail = data.message ? `${data.error}: ${data.message}` : data.error;
			console.error('[vivacity-timeseries] client response error', detail);
			throw new Error(detail);
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
