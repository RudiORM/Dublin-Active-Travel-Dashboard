<script lang="ts">
	import '../app.css';
	import favicon from '/favicon.png';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	const ANALYTICS_ENDPOINT = '/api/analytics';
  
	// Track page view
	async function trackPageView() {
		// Get country from timezone (approximate)
		const country = getCountryFromTimezone();
		
		const data = {
			type: 'pageview',
			url: window.location.pathname,
			referrer: document.referrer,
			timestamp: Date.now(),
			userAgent: navigator.userAgent,
			screenWidth: window.innerWidth,
			screenHeight: window.innerHeight,
			country: country
		};
		
		sendAnalytics(data);
	}
	
	// Approximate country from timezone
	function getCountryFromTimezone() {
		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			// Basic mapping of common timezones to countries
			const timezoneMap: Record<string, string> = {
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
				'Australia/Sydney': 'Australia',
			};
			return timezoneMap[timezone] || timezone.split('/')[0]; // Fallback to continent
		} catch (e) {
			return 'Unknown';
		}
	}
	
	// Send data to API
	function sendAnalytics(data: any) {
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
	
	onMount(() => {
		// Track initial page view
		trackPageView();
		
		// Track subsequent navigation (popstate for back/forward)
		const handleNavigation = () => trackPageView();
		window.addEventListener('popstate', handleNavigation);
		
		return () => {
			window.removeEventListener('popstate', handleNavigation);
		};
	});
	
	// Use afterNavigate for SvelteKit navigation in Svelte 5
	afterNavigate(() => {
		trackPageView();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}