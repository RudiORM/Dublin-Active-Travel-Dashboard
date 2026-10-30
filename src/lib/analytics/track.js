/**
 * Client-side page-view beacon → POST /api/analytics.
 */

const ANALYTICS_ENDPOINT = '/api/analytics';

// Approximate country from timezone (server also records x-vercel-ip-country)
/** @type {Record<string, string>} */
const TIMEZONE_COUNTRIES = {
	'Europe/Dublin': 'Ireland',
	'Europe/London': 'United Kingdom',
	'America/New_York': 'United States',
	'America/Los_Angeles': 'United States',
	'America/Chicago': 'United States',
	'Europe/Paris': 'France',
	'Europe/Berlin': 'Germany',
	'Europe/Madrid': 'Spain',
	'Europe/Rome': 'Italy',
	'Asia/Tokyo': 'Japan',
	'Asia/Shanghai': 'China',
	'Australia/Sydney': 'Australia'
};

function getCountryFromTimezone() {
	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		return TIMEZONE_COUNTRIES[timezone] || timezone.split('/')[0]; // Fallback to continent
	} catch {
		return 'Unknown';
	}
}

/** @param {string} [url] defaults to the current pathname */
export function trackPageView(url = window.location.pathname) {
	const data = {
		type: 'pageview',
		url,
		referrer: document.referrer,
		timestamp: Date.now(),
		userAgent: navigator.userAgent,
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		country: getCountryFromTimezone()
	};

	if (navigator.sendBeacon) {
		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
		navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
	} else {
		fetch(ANALYTICS_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			keepalive: true
		}).catch(() => {});
	}
}
