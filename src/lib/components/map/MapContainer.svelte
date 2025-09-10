<script>
	import { onMount } from 'svelte';
	import { initializeMap, hasMapboxToken } from '$lib/services/map/mapbox-service.js';
	import 'mapbox-gl/dist/mapbox-gl.css';

	let mapContainer = $state();
	let map = $state();

	// Props
	let { onMapLoad = () => {} } = $props();

	onMount(() => {
		if (!hasMapboxToken()) {
			console.error('Cannot initialize map: PUBLIC_MAPBOX_TOKEN is not set');
			return;
		}

		map = initializeMap(mapContainer);
		
		if (map) {
			map.on('load', () => {
				onMapLoad(map);
			});
		}

		return () => {
			map?.remove();
		};
	});
</script>

{#if !hasMapboxToken()}
<div class="error-message">
	<h3>⚠️ Configuration Error</h3>
	<p>Missing Mapbox token. Please set the <code>PUBLIC_MAPBOX_TOKEN</code> environment variable.</p>
	<p>For Vercel deployment, add this in your project's Environment Variables settings.</p>
</div>
{:else}
<div bind:this={mapContainer} class="map-container"></div>
{/if}

<style>
	.map-container {
		width: 100%;
		height: 100%;
		position: relative;
	}
	
	.error-message {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: #fff;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.15);
		text-align: center;
		max-width: 500px;
		z-index: 1000;
	}
	
	.error-message h3 {
		color: #d73027;
		margin: 0 0 15px 0;
	}
	
	.error-message p {
		margin: 10px 0;
		color: #666;
		line-height: 1.5;
	}
	
	.error-message code {
		background: #f0f0f0;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: 'Courier New', monospace;
	}
</style>
