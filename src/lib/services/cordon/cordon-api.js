/**
 * Cordon data API service
 * Fetches cordon count data and zone locations
 */

/**
 * Fetch cordon data from static files
 * @returns {Promise<Object>} Combined cordon and zones data
 */
export async function fetchCordonData() {
	try {
		// Fetch both cordon counts and zone locations
		const [cordonsResponse, zonesResponse] = await Promise.all([
			fetch('/cordons.json'),
			fetch('/zones.json')
		]);

		if (!cordonsResponse.ok || !zonesResponse.ok) {
			throw new Error('Failed to fetch cordon data');
		}

		const cordons = await cordonsResponse.json();
		const zones = await zonesResponse.json();

		// Combine the data
		return {
			cordons,
			zones
		};

	} catch (error) {
		console.error('Error fetching cordon data:', error);
		throw error;
	}
}
