<script lang="ts">
	import MapContainer from '$lib/components/map/MapContainer.svelte';
	import Title from '$lib/components/shared/Title.svelte';
	import DataMenu from '$lib/components/shared/DataMenu.svelte';


	import CensusProvider from '$lib/components/providers/census/CensusProvider.svelte';
	import CensusControls from '$lib/components/providers/census/components/CensusControls.svelte';
	import GoogleProvider from '$lib/components/providers/google/GoogleProvider.svelte';
	import GoogleControls from '$lib/components/providers/google/components/GoogleControls.svelte';


	import { showOnlyDataSource } from '$lib/utils/map/layer-manager.js';

	let map = $state();
	let selectedDataSource = $state('census');
	let providersInitialized = $state(0);

	function handleMapLoad(mapInstance: any) {
		map = mapInstance;
	}

	function handleProviderInitialized() {
		providersInitialized++;
		
		// Once both providers are initialized, set correct layer visibility
		if (providersInitialized >= 2 && map) {
			showOnlyDataSource(map, selectedDataSource);
		}
	}

	function handleDataSourceChange() {
		console.log('Data source changed to:', selectedDataSource);
		
		// Show only the layers for the selected data source
		if (map) {
			// Handle the new 'canal' data source by treating it like census for now
			const dataSourceForMap = selectedDataSource === 'canal' ? 'census' : selectedDataSource;
			showOnlyDataSource(map, dataSourceForMap);
		}
	}
</script>

<div class="app-container">
	<MapContainer onMapLoad={handleMapLoad} />
	
	<DataMenu 
		bind:selectedDataSource={selectedDataSource}
		onDataSourceChange={handleDataSourceChange}
	/>

	<Title />

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