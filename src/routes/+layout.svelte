<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	const ANALYTICS_ENDPOINT = '/api/analytics';
  
	// Track page view
	function trackPageView() {
		const data = {
			type: 'pageview',
			url: window.location.pathname,
			referrer: document.referrer,
			timestamp: Date.now(),
			userAgent: navigator.userAgent,
			screenWidth: window.innerWidth,
			screenHeight: window.innerHeight
		};
		
		sendAnalytics(data);
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
	import { afterNavigate } from '$app/navigation';
	afterNavigate(() => {
		trackPageView();
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

{@render children?.()}