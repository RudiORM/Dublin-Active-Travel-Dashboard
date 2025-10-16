<script lang="ts">
	import MapContainer from '$lib/components/map/MapContainer.svelte';
	import NavigationMenu from '$lib/components/shared/NavigationMenu.svelte';
	import CensusProvider from '$lib/components/providers/census/CensusProvider.svelte';
	import CensusControls from '$lib/components/providers/census/components/CensusControls.svelte';
	import GoogleProvider from '$lib/components/providers/google/GoogleProvider.svelte';
	import GoogleControls from '$lib/components/providers/google/components/GoogleControls.svelte';
	import CordonProvider from '$lib/components/providers/cordon/CordonProvider.svelte';
	import CordonControls from '$lib/components/providers/cordon/components/CordonControls.svelte';
	import StravaProvider from '$lib/components/providers/strava/StravaProvider.svelte';
	import StravaControls from '$lib/components/providers/strava/components/StravaControls.svelte';
	import NTAProvider from '$lib/components/providers/nta/NTAProvider.svelte';
	import NTAControls from '$lib/components/providers/nta/components/NTAControls.svelte';
	import EcoCounterProvider from '$lib/components/providers/eco-counter/EcoCounterProvider.svelte';
	import EcoCounterControls from '$lib/components/providers/eco-counter/components/EcoCounterControls.svelte';
	import VivacityCounterProvider from '$lib/components/providers/vivacity/VivacityCounterProvider.svelte';
	import VivacityCounterControls from '$lib/components/providers/vivacity/components/VivacityCounterControls.svelte';

	// Get server-side data
	let { data } = $props();


	import { showOnlyDataSource } from '$lib/utils/map/layer-manager.js';

	let map = $state();
	let selectedDataSource = $state('census');
	let providersInitialized = $state(0);
	
	// Total number of providers that need to initialize
	const totalProviders = 7;
	let isLoading = $derived(providersInitialized < totalProviders);

	function handleMapLoad(mapInstance: any) {
		map = mapInstance;
	}

	function handleProviderInitialized() {
		providersInitialized++;
		
		// Set correct layer visibility after each provider initializes
		if (map) {
			showOnlyDataSource(map, selectedDataSource);
		}
	}

	function handleDataSourceChange() {
		console.log('Data source changed to:', selectedDataSource);
		
		// Show only the layers for the selected data source
		if (map) {
			// Handle the new data sources
			let dataSourceForMap = selectedDataSource;
			if (selectedDataSource === 'cordon') dataSourceForMap = 'cordon';
			if (selectedDataSource === 'strava') dataSourceForMap = 'strava';
			if (selectedDataSource === 'nta') dataSourceForMap = 'nta';
			if (selectedDataSource === 'eco-counter') dataSourceForMap = 'eco-counter';
			if (selectedDataSource === 'vivacity-counter') dataSourceForMap = 'vivacity-counter';
			showOnlyDataSource(map, dataSourceForMap);
		}
	}
</script>

<div class="app-container">
	{#if isLoading}
		<div class="loading-overlay">
			<div class="loading-content">
				<img src="/svgs/DATD-logo-v3-outlinestroke.svg" alt="DATD Logo" class="loading-logo" />
				<div class="loading-spinner">
					<div class="spinner"></div>
					<p>Loading data...</p>
				</div>
			</div>
		</div>
	{/if}
	
	<MapContainer onMapLoad={handleMapLoad} />
	
	<NavigationMenu 
		bind:selectedDataSource={selectedDataSource}
		onDataSourceChange={handleDataSourceChange}
	/>

	{#if map}
		<CensusProvider {map} onInitialized={handleProviderInitialized}>
			{#if selectedDataSource === 'census' || selectedDataSource === 'canal'}
				<CensusControls />
			{/if}
		</CensusProvider>
		
		<GoogleProvider {map} onInitialized={handleProviderInitialized}>
			{#snippet children(googleContext: any)}
				{#if selectedDataSource === 'google'}
					<GoogleControls {googleContext} />
				{/if}
			{/snippet}
		</GoogleProvider>

		<CordonProvider {map} onInitialized={handleProviderInitialized}>
			{#snippet children(cordonContext: any)}
				{#if selectedDataSource === 'cordon'}
					<CordonControls />
				{/if}
			{/snippet}
		</CordonProvider>

		<StravaProvider {map} onInitialized={handleProviderInitialized}>
			{#snippet children(stravaContext: any)}
				{#if selectedDataSource === 'strava'}
					<StravaControls />
				{/if}
			{/snippet}
		</StravaProvider>

		<NTAProvider {map} onInitialized={handleProviderInitialized}>
			{#snippet children(ntaContext: any)}
				{#if selectedDataSource === 'nta'}
					<NTAControls />
				{/if}
			{/snippet}
		</NTAProvider>

		<EcoCounterProvider {map} onInitialized={handleProviderInitialized} serverData={data}>
			{#snippet children(ecoCounterContext: any)}
				{#if selectedDataSource === 'eco-counter'}
					<EcoCounterControls />
				{/if}
			{/snippet}
		</EcoCounterProvider>

		<VivacityCounterProvider {map} onInitialized={handleProviderInitialized} serverData={data}>
			{#snippet children(vivacityCounterContext: any)}
				{#if selectedDataSource === 'vivacity-counter'}
					<VivacityCounterControls />
				{/if}
			{/snippet}
		</VivacityCounterProvider>
	{/if}
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
		
	}

	:global(#svelte) {
		height: 100vh;
	}

	.app-container {
		width: 100vw;
		height: 100vh;
		position: fixed;
		top: 0;
		left: 0;
		min-height: 450px;
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(255, 255, 255, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(5px);
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.loading-logo {
		width: 120px;
		height: auto;
		margin-bottom: 30px;
		opacity: 0.9;
	}

	.loading-spinner {
		text-align: center;
		color: #333;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #A8E9DA;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 20px;
	}

	.loading-spinner p {
		margin: 0;
		font-size: 16px;
		font-weight: 500;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>