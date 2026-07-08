import { json } from '@sveltejs/kit';
import { ECO_COUNTER_API } from '$env/static/private';
import {
	readEcoCounterWeeklySnapshot,
	getEcoSnapshotSiteBlock
} from '$lib/server/eco-counter-weekly-snapshot.js';

/**
 * POST { siteId }
 * - Live API: hourly chart data only (P1D raw, last 30 days)
 * - Static snapshot: weekly + monthly series for the site
 */
export async function POST({ request }) {
	const origin = new URL(request.url).origin;

	let siteId;
	try {
		const body = await request.json();
		siteId = body?.siteId;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!siteId) {
		return json({ error: 'Site ID is required' }, { status: 400 });
	}

	if (!ECO_COUNTER_API) {
		return json({ error: 'Eco-Counter API not configured' }, { status: 500 });
	}

	const snapshot = await readEcoCounterWeeklySnapshot(process.cwd(), fetch, origin);
	const siteBlock = snapshot ? getEcoSnapshotSiteBlock(snapshot, siteId) : null;
	const snapshotSiteWeekly = siteBlock?.weekly ?? [];

	const options = {
		method: 'GET',
		headers: {
			accept: 'application/json',
			'X-API-KEY': ECO_COUNTER_API
		}
	};

	function formatDate(t) {
		const date = ('0' + t.getDate()).slice(-2);
		const month = ('0' + (t.getMonth() + 1)).slice(-2);
		const year = t.getFullYear();
		return `${year}-${month}-${date}`;
	}

	const end = new Date();
	const dd = formatDate(end);
	const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
	const dd2 = formatDate(start);

	const hourlyUrl = `https://api.eco-counter.com/api/v2/history/traffic/raw?siteId=${siteId}&include=&startDate=${dd2}&endDate=${dd}&startTime=00%3A00&endTime=00%3A00&granularity=P1D&gapFilling=false&travelModes=bike&travelModes=pedestrian`;

	try {
		const hourlyRes = await fetch(hourlyUrl, options);
		if (!hourlyRes.ok) {
			const text = await hourlyRes.text();
			return json(
				{ error: `Hourly fetch failed: HTTP ${hourlyRes.status}`, detail: text.slice(0, 300) },
				{ status: hourlyRes.status }
			);
		}
		const hourly_30days = await hourlyRes.json();

		return json({
			hourly_30days,
			snapshotSiteWeekly,
			source: 'weekly-snapshot'
		});
	} catch (error) {
		return json({ error: 'Failed to fetch hourly time series data' }, { status: 500 });
	}
}
