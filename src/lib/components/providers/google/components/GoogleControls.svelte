<script>
	import GoogleFilterBar from './GoogleFilterBar.svelte';
	import GoogleInfoPanel from './GoogleInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

	// Props from GoogleProvider
	let { googleContext } = $props();

	function handleFilterChange() {
		googleContext.updateVisualization();
	}
</script>

<GoogleFilterBar 
	bind:selectedMode={googleContext.selectedMode}
	bind:selectedMetric={googleContext.selectedMetric}
	bind:selectedScope={googleContext.selectedScope}
	onFilterChange={handleFilterChange}
/>

<DataBox>
	<GoogleInfoPanel 
		reshapedData={googleContext.reshapedData}
		selectedMode={googleContext.selectedMode}
		selectedMetric={googleContext.selectedMetric}
		selectedScope={googleContext.selectedScope}
		selectedArea={googleContext.selectedArea}
	/>
</DataBox>
