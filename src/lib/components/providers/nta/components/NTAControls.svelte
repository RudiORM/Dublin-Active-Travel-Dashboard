<script>
	import { getContext } from 'svelte';
	import NTAFilterBar from './NTAFilterBar.svelte';
	import NTAInfoPanel from './NTAInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

	const nta = getContext('nta');

	function handleFilterChange() {
		nta.updateVisualization();
	}
</script>

<NTAFilterBar 
	bind:selectedRoute={nta.selectedRoute}
	onFilterChange={handleFilterChange}
/>

<DataBox>
	<NTAInfoPanel 
		reshapedData={nta.reshapedData}
		selectedRoute={nta.selectedRoute}
		selectedLocation={nta.selectedLocation}
		ntaContext={nta}
	/>
</DataBox>
