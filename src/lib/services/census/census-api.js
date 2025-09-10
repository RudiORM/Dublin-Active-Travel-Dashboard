/**
 * Fetch census GeoJSON data
 * @returns {Promise<Object>} - Census GeoJSON data
 */
export async function fetchCensusData() {
	try {
		const response = await fetch('/census_data_lea.geojson');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error('Error fetching census data:', error);
		throw error;
	}
}
