<script>
	import GoogleFilterLegendBar from './GoogleFilterLegendBar.svelte';
	import GoogleInfoPanel from './GoogleInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

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

<DataBox>
	<GoogleInfoPanel 
		reshapedData={googleContext.reshapedData}
		selectedMode={googleContext.selectedMode}
		selectedMetric={googleContext.selectedMetric}
		selectedScope={googleContext.selectedScope}
		selectedArea={googleContext.selectedArea}
		{googleContext}
	/>
</DataBox>
