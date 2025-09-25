<script>
	import { getContext } from 'svelte';
	import DataBoxEco from '../../../shared/DataBoxEco.svelte';
	import EcoCounterInfoPanel from './EcoCounterInfoPanel.svelte';
	import EcoCounterFilterBar from './EcoCounterFilterBar.svelte';

	// Get provider context
	const ecoCounterProvider = getContext('ecoCounterProvider');
	
	// Filter state management
	let selectedMode = $state('pedestrian');
	
	function handleFilterChange() {
		console.log('Filter changed to:', selectedMode);
		ecoCounterProvider.setSelectedMode(selectedMode);
	}
</script>

<EcoCounterFilterBar bind:selectedMode onFilterChange={handleFilterChange} />

<DataBoxEco>
	<EcoCounterInfoPanel />
</DataBoxEco>
