/**
 * Strava data API service
 * Fetches strava route data and geojson files
 */

/**
 * Fetch strava data from static files
 * @returns {Promise<Object>} Combined strava historical data and route geometries
 */
export async function fetchStravaData() {
	try {
		// Fetch historical data and all route geojson files
		const [
			stravaResponse,
			c2ccResponse,
			dlrResponse,
			dodderResponse,
			portmarnockResponse
		] = await Promise.all([
			fetch('/strava/strava.json'),
			fetch('/strava/C2CC.geojson'),
			fetch('/strava/DLR.geojson'),
			fetch('/strava/Dodder River.geojson'),
			fetch('/strava/Portmarnock.geojson')
		]);

		if (!stravaResponse.ok || !c2ccResponse.ok || !dlrResponse.ok || 
			!dodderResponse.ok || !portmarnockResponse.ok) {
			throw new Error('Failed to fetch strava data');
		}

		const historicalData = await stravaResponse.json();
		const c2cc = await c2ccResponse.json();
		const dlr = await dlrResponse.json();
		const dodder = await dodderResponse.json();
		const portmarnock = await portmarnockResponse.json();

		// Combine the data
		return {
			historicalData,
			routes: {
				'Clontarf to City Center': c2cc,
				'Dun Laoghaire Coastal': dlr,
				'Dodder Greenway': dodder,
				'Portmarnock Greenway': portmarnock
			}
		};

	} catch (error) {
		console.error('Error fetching strava data:', error);
		throw error;
	}
}
