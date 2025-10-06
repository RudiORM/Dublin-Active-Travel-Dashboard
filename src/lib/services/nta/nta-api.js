/**
 * NTA data API service
 * Fetches NTA route data and geojson files
 */

/**
 * Fetch NTA cycling infrastructure data from static files
 * @returns {Promise<Object>} NTA GeoJSON data with cycling infrastructure
 */
export async function fetchNTAData() {
	try {
		// Fetch the NTA GeoJSON data
		const ntaResponse = await fetch('/nta/nta.geojson');

		if (!ntaResponse.ok) {
			throw new Error('Failed to fetch NTA data');
		}

		const geoJsonData = await ntaResponse.json();

		// Return the GeoJSON data
		return {
			geoJsonData
		};

	} catch (error) {
		console.error('Error fetching NTA data:', error);
		throw error;
	}
}
