/**
 * Fetch census GeoJSON data
 * @param {string} boundaryType - Either 'lea' or 'ed' for boundary type
 * @returns {Promise<Object>} - Census GeoJSON data
 */
export async function fetchCensusData(boundaryType = 'lea') {
	try {
		const filename = boundaryType === 'ed' ? '/census_data_ed.geojson' : '/census_data_lea.geojson';
		const response = await fetch(filename);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error('Error fetching census data:', error);
		throw error;
	}
}
