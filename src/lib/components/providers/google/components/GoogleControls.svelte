<script>
	import GoogleFilterLegendBar from './GoogleFilterLegendBar.svelte';
	import GoogleInfoPanel from './GoogleInfoPanel.svelte';
	import DataBoxEco from '$lib/components/shared/DataBoxEco.svelte';

	// Props from GoogleProvider
	let { googleContext } = $props();

	function handleFilterChange() {
		googleContext.updateVisualization();
	}
</script>

<GoogleFilterLegendBar 
	bind:selectedMode={googleContext.selectedMode}
	bind:selectedMetric={googleContext.selectedMetric}
	bind:selectedScope={googleContext.selectedScope}
	bind:selectedFilter={googleContext.selectedFilter}
	onFilterChange={handleFilterChange}
	{googleContext}
/>

<DataBoxEco>
	<GoogleInfoPanel 
		reshapedData={googleContext.reshapedData}
		selectedMode={googleContext.selectedMode}
		selectedMetric={googleContext.selectedMetric}
		selectedScope={googleContext.selectedScope}
		selectedArea={googleContext.selectedArea}
		{googleContext}
	/>
</DataBoxEco>
