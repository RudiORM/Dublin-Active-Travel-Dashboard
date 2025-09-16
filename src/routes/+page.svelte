<script lang="ts">
	import MapContainer from '$lib/components/map/MapContainer.svelte';
	import NavigationMenu from '$lib/components/shared/NavigationMenu.svelte';
	import CensusProvider from '$lib/components/providers/census/CensusProvider.svelte';
	import CensusControls from '$lib/components/providers/census/components/CensusControls.svelte';
	import GoogleProvider from '$lib/components/providers/google/GoogleProvider.svelte';
	import GoogleControls from '$lib/components/providers/google/components/GoogleControls.svelte';
	import CordonProvider from '$lib/components/providers/cordon/CordonProvider.svelte';
	import CordonControls from '$lib/components/providers/cordon/components/CordonControls.svelte';


	import { showOnlyDataSource } from '$lib/utils/map/layer-manager.js';

	let map = $state();
	let selectedDataSource = $state('census');
	let providersInitialized = $state(0);

	function handleMapLoad(mapInstance: any) {
		map = mapInstance;
	}

	function handleProviderInitialized() {
		providersInitialized++;
		
		// Once all providers are initialized, set correct layer visibility
		if (providersInitialized >= 3 && map) {
			showOnlyDataSource(map, selectedDataSource);
		}
	}

	function handleDataSourceChange() {
		console.log('Data source changed to:', selectedDataSource);
		
		// Show only the layers for the selected data source
		if (map) {
			// Handle the new 'canal' data source by treating it like census for now
			let dataSourceForMap = selectedDataSource;
			if (selectedDataSource === 'cordon') dataSourceForMap = 'cordon';
			showOnlyDataSource(map, dataSourceForMap);
		}
	}
</script>

<div class="app-container">
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
	}
</style>