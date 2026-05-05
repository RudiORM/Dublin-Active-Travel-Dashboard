<script>
	import { getContext, onMount } from 'svelte';
	import DataBoxEco from '../../../shared/DataBoxEco.svelte';
	import VivacityCounterInfoPanel from './VivacityCounterInfoPanel.svelte';
	import VivacityCounterFilterBar from './VivacityCounterFilterBar.svelte';

	// Get provider context
	const vivacityCounterProvider = getContext('vivacityCounterProvider');
	
	// Filter state management
	let selectedMode = $state('pedestrian');

	onMount(() => {
		// Returning to this datasource should default back to overview.
		void vivacityCounterProvider.setSelectedLocation(null);
	});
	
	function handleFilterChange() {
		vivacityCounterProvider.setSelectedMode(selectedMode);
	}
</script>

<VivacityCounterFilterBar bind:selectedMode onFilterChange={handleFilterChange} />

<DataBoxEco>
	<VivacityCounterInfoPanel />
</DataBoxEco>
