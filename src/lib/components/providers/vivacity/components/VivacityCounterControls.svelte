<script>
	import { getContext } from 'svelte';
	import DataBoxEco from '../../../shared/DataBoxEco.svelte';
	import VivacityCounterInfoPanel from './VivacityCounterInfoPanel.svelte';
	import VivacityCounterFilterBar from './VivacityCounterFilterBar.svelte';

	// Get provider context
	const vivacityCounterProvider = getContext('vivacityCounterProvider');
	
	// Filter state management
	let selectedMode = $state('pedestrian');
	
	function handleFilterChange() {
		console.log('Filter changed to:', selectedMode);
		vivacityCounterProvider.setSelectedMode(selectedMode);
	}
</script>

<VivacityCounterFilterBar bind:selectedMode onFilterChange={handleFilterChange} />

<DataBoxEco>
	<VivacityCounterInfoPanel />
</DataBoxEco>
