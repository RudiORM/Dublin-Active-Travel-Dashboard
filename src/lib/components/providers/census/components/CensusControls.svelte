<script>
	import { getContext } from 'svelte';
	import CensusFilterBar from './CensusFilterBar.svelte';
	import CensusInfoPanel from './CensusInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

	const census = getContext('census');

	function handleFilterChange() {
		census.updateVisualization();
	}
</script>

<CensusFilterBar 
	bind:selectedMode={census.selectedMode}
	bind:selectedPlace={census.selectedPlace}
	bind:selectedYear={census.selectedYear}
	onFilterChange={handleFilterChange}
/>

<DataBox>
	<CensusInfoPanel 
		reshapedData={census.reshapedData}
		selectedMode={census.selectedMode}
		selectedPlace={census.selectedPlace}
		selectedYear={census.selectedYear}
		selectedArea={census.selectedArea}
	/>
</DataBox>
