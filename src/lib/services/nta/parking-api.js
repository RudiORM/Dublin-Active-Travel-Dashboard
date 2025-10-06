/**
 * Parking data API service
 * Fetches parking stand data from static files
 */

/**
 * Fetch parking stand data
 * @returns {Promise<Object>} Parking data with stands information
 */
export async function fetchParkingData() {
	try {
		const parkingResponse = await fetch('/nta/parking.json');
		if (!parkingResponse.ok) {
			throw new Error('Failed to fetch parking data');
		}
		const parkingData = await parkingResponse.json();
		
		return { parkingData };
	} catch (error) {
		console.error('Error fetching parking data:', error);
		throw error;
	}
}
