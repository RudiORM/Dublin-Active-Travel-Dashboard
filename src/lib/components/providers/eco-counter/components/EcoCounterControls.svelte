<script>
	import { getContext, onMount } from 'svelte';
	import DataBoxEco from '../../../shared/DataBoxEco.svelte';
	import EcoCounterInfoPanel from './EcoCounterInfoPanel.svelte';
	import EcoCounterFilterBar from './EcoCounterFilterBar.svelte';

	// Get provider context
	const ecoCounterProvider = getContext('ecoCounterProvider');
	
	// Filter state management
	let selectedMode = $state('pedestrian');

	onMount(() => {
		// Returning to this datasource should default back to overview.
		void ecoCounterProvider.setSelectedLocation(null);
	});

	// Keep filter bar in sync when provider switches mode (e.g. bike-only site click).
	$effect(() => {
		const providerMode = ecoCounterProvider?.selectedMode;
		if (providerMode && providerMode !== selectedMode) {
			selectedMode = providerMode;
		}
	});
	
	function handleFilterChange() {
		ecoCounterProvider.setSelectedMode(selectedMode);
	}
</script>

<EcoCounterFilterBar bind:selectedMode onFilterChange={handleFilterChange} />

<DataBoxEco>
	<EcoCounterInfoPanel />
</DataBoxEco>
