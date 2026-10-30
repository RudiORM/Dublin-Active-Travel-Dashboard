<script lang="ts">
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { trackPageView } from '$lib/analytics/track.js';

	let { children } = $props();

	// Fires on initial load, client-side navigation and back/forward (popstate)
	afterNavigate(() => {
		trackPageView();
	});
</script>

{@render children?.()}
