<script>
	import { getContext } from 'svelte';
	import CordonFilterBar from './CordonFilterBar.svelte';
	import CordonInfoPanel from './CordonInfoPanel.svelte';
	import DataBoxEco from '$lib/components/shared/DataBoxEco.svelte';

	const cordon = getContext('cordon');

	function handleFilterChange() {
		cordon.updateVisualization();
	}
</script>

<CordonFilterBar 
	bind:selectedMode={cordon.selectedMode}
	bind:selectedYear={cordon.selectedYear}
	onFilterChange={handleFilterChange}
/>

<DataBoxEco>
	<CordonInfoPanel 
		reshapedData={cordon.reshapedData}
		selectedMode={cordon.selectedMode}
		selectedYear={cordon.selectedYear}
		selectedLocation={cordon.selectedLocation}
		cordonContext={cordon}
	/>
</DataBoxEco>
