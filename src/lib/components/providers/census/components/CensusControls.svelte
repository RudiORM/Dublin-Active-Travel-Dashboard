<script>
	import { getContext } from 'svelte';
	import CensusFilterLegendBar from './CensusFilterLegendBar.svelte';
	import CensusInfoPanel from './CensusInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

	const census = getContext('census');

	function handleFilterChange() {
		census.updateVisualization();
	}
</script>

<CensusFilterLegendBar 
	bind:selectedMode={census.selectedMode}
	bind:selectedPlace={census.selectedPlace}
	bind:selectedYear={census.selectedYear}
	bind:selectedFilter={census.selectedFilter}
	onFilterChange={handleFilterChange}
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
