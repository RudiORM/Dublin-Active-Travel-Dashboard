/**
 * BusConnects data API service
 * Fetches BusConnects cycling infrastructure data
 */

/**
 * Fetch BusConnects GeoJSON data
 * @returns {Promise<Object>} BusConnects data with GeoJSON
 */
export async function fetchBusConnectsData() {
	try {
		const busConnectsResponse = await fetch('/nta/busconnects.geojson');
		if (!busConnectsResponse.ok) {
			throw new Error('Failed to fetch BusConnects data');
		}
		const geoJsonData = await busConnectsResponse.json();
		
		return { geoJsonData };
	} catch (error) {
		console.error('Error fetching BusConnects data:', error);
		throw error;
	}
}
