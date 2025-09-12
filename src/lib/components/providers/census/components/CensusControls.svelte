<script>
	import { getContext } from 'svelte';
	import CensusFilterBar from './CensusFilterBar.svelte';
	import CensusLegendBar from './CensusLegendBar.svelte';
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

<CensusLegendBar 
	selectedMode={census.selectedMode}
	selectedPlace={census.selectedPlace}
	selectedYear={census.selectedYear}
	censusContext={census}
/>

<DataBox>
	<CensusInfoPanel 
		reshapedData={census.reshapedData}
		selectedMode={census.selectedMode}
		selectedPlace={census.selectedPlace}
		selectedYear={census.selectedYear}
		selectedArea={census.selectedArea}
		censusContext={census}
	/>
</DataBox>
