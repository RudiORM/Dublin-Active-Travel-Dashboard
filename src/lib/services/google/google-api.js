/**
 * Fetch Google mobility GeoJSON data
 * @returns {Promise<Object>} - Google GeoJSON data
 */
export async function fetchGoogleData() {
	try {
		const response = await fetch('/google_data.geojson');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error('Error fetching Google data:', error);
		throw error;
	}
}
