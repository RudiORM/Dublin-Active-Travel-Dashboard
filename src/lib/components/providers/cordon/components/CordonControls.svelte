<script>
	import { getContext } from 'svelte';
	import CordonFilterBar from './CordonFilterBar.svelte';
	import CordonInfoPanel from './CordonInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

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

<DataBox>
	<CordonInfoPanel 
		reshapedData={cordon.reshapedData}
		selectedMode={cordon.selectedMode}
		selectedYear={cordon.selectedYear}
		selectedLocation={cordon.selectedLocation}
		cordonContext={cordon}
	/>
</DataBox>
