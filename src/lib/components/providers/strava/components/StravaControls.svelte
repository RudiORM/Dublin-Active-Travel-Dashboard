<script>
	import { getContext } from 'svelte';
	import StravaFilterBar from './StravaFilterBar.svelte';
	import StravaInfoPanel from './StravaInfoPanel.svelte';
	import DataBox from '$lib/components/shared/DataBox.svelte';

	const strava = getContext('strava');

	function handleFilterChange() {
		strava.updateVisualization();
	}
</script>

<StravaFilterBar 
	bind:selectedRoute={strava.selectedRoute}
	onFilterChange={handleFilterChange}
/>

<DataBox>
	<StravaInfoPanel 
		reshapedData={strava.reshapedData}
		selectedRoute={strava.selectedRoute}
		selectedLocation={strava.selectedLocation}
		stravaContext={strava}
	/>
</DataBox>
