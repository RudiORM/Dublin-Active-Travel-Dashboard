import { json } from '@sveltejs/kit';
import { VIVACITY_API } from '$env/static/private';
import { env } from '$env/dynamic/private';

// Handle POST requests to fetch traffic data from Vivacity API
export async function POST({ request }) {
	try {
		// Extract the countline ID from the request body
		const { siteId } = await request.json();
		
		if (!siteId) {
			return json({ error: 'Site ID (countline ID) is required' }, { status: 400 });
		}

		// Try SvelteKit env first, then fallback to process.env for development
		const vivacityApiKey = VIVACITY_API || env.VIVACITY_API || process.env.VIVACITY_API;

		if (!vivacityApiKey) {
			console.error('VIVACITY_API environment variable is not set');
			return json({ error: 'VIVACITY_API not configured' }, { status: 500 });
		}

		// Define request options with headers including the API key
		const options = {
			method: 'GET',
			headers: { 
				'Accept': 'application/json', 
				'x-vivacity-api-key': vivacityApiKey
			}
		};

		// Helper function to format date as YYYY-MM-DDTHH:mm:ss.000Z
		function formatDateForVivacity(date) {
			return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
		}

		console.log(`Fetching vivacity time series data for countline: ${siteId}`);

		// Calculate date range for last 7 days (hourly data)
		// Align to hour boundaries for Vivacity API
		const to = new Date();
		to.setMinutes(0, 0, 0); // Set to top of current hour
		
		const from7Days = new Date(to.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
		from7Days.setMinutes(0, 0, 0); // Set to top of hour
		
		// Calculate date range for last 3 months (daily data)
		const from3Months = new Date(to.getTime() - (30 * 24 * 60 * 60 * 1000))
		from3Months.setUTCHours(0, 0, 0, 0); // 90 days ago

		const to_today = new Date();
		to_today.setUTCHours(0, 0, 0, 0); // Set to top of day
		
		// Format dates to match Vivacity API format
		const from7DaysISO = formatDateForVivacity(from7Days);
		const from3MonthsISO = formatDateForVivacity(from3Months);
		const toISO = formatDateForVivacity(to);
		const to_todayISO = formatDateForVivacity(to_today);

		console.log('from3MonthsISO:', from3MonthsISO);
		console.log('toISO:', toISO);


		// Define URLs for the API requests
		const urlHourly = `https://api.vivacitylabs.com/countline/counts?countline_ids=${siteId}&from=${from7DaysISO}&to=${toISO}&time_bucket=1h&fill_zeros=true`;
		const urlDaily = `https://api.vivacitylabs.com/countline/counts?countline_ids=${siteId}&from=${from3MonthsISO}&to=${to_todayISO}&time_bucket=24h`;

		console.log('Vivacity API URL (hourly):', urlHourly);
		console.log('Vivacity API URL (daily):', urlDaily);
		console.log('Vivacity API options:', options);

		try {
			// Fetch both hourly and daily data in parallel
			const [hourly_7days, daily_3months] = await Promise.all([
				// Fetch hourly data for last 7 days
				fetch(urlHourly, options)
					.then(response => {
						if (!response.ok) throw new Error(`Vivacity HTTP error (hourly)! status: ${response.status}`);
						return response.json();
					}),
				// Fetch daily data for last 3 months
				fetch(urlDaily, options)
					.then(response => {
						if (!response.ok) throw new Error(`Vivacity HTTP error (daily)! status: ${response.status}`);
						return response.json();
					})
			]);

			console.log(`Vivacity time series data fetched successfully for countline: ${siteId}`);
			
			// Structure the response with both hourly and daily data
			const timeSeriesData = {
				hourly_7days: hourly_7days,      // 7 days of hourly data
				daily_3months: daily_3months,     // 3 months of daily data
				weekly_year: null,                // Vivacity doesn't provide this format directly
				monthly_3years: null,             // Vivacity doesn't provide this format directly
				countlineId: siteId,
				dateRange: {
					hourly: {
						from: from7DaysISO,
						to: toISO
					},
					daily: {
						from: from3MonthsISO,
						to: toISO
					}
				}
			};

			return json(timeSeriesData);
			
		} catch (error) {
			console.error('Vivacity API error:', error);
			// Return error response
			return json({ 
				error: 'Failed to fetch Vivacity data',
				message: error.message 
			}, { status: 500 });
		}
		
	} catch (error) {
		console.error('Error processing vivacity time series request:', error);
		return json({ error: error.message }, { status: 500 });
	}
}