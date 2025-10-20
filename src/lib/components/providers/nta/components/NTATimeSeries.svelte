<script>
	import { getContext } from 'svelte';
	import StackedBarHMany from '$lib/components/shared/StackedBarHMany.svelte';
	import { getInfrastructureStats } from '$lib/services/nta/nta-processor.js';
	import { getInfrastructureColor } from '$lib/utils/nta/nta-colors.js';

	// Props
	let {
		reshapedData,
		selectedDataSource
	} = $props();

	// Get context to access selected data source
	const nta = getContext('nta');

	// Get infrastructure statistics
	const infrastructureStats = $derived.by(() => {
		if (!reshapedData || !nta?.selectedDataSource) {
			return null;
		}
		return /** @type {any} */ (getInfrastructureStats(reshapedData, nta.selectedDataSource));
	});

	// Create chart data for StackedBarH component
	const chartData = $derived.by(() => {
		if (!infrastructureStats) return [];
		
		if (nta?.selectedDataSource === 'busconnects') {
			// Show surface types distribution for BusConnects
			const surfaceTypes = infrastructureStats.surfaceTypes || {};
			return Object.entries(surfaceTypes)
				.sort(([,a], [,b]) => b - a)
				.map(([type, count]) => ({
					label: type.replace(/([A-Z])/g, ' $1').trim(),
					value: count,
					color: getInfrastructureColor('busconnects', type)
				}));
		} else {
			// Show bike types distribution for NTA
			const bikeTypes = infrastructureStats.bikeTypes || {};
			return Object.entries(bikeTypes)
				.filter(([type]) => type !== 'Signed route')
				.sort(([,a], [,b]) => b - a)
				.map(([type, count]) => ({
					label: type.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
					value: count,
					color: getInfrastructureColor('nta', type)
				}));
		}
	});
</script>


		<StackedBarHMany 
			data={chartData}
			height={40}
			showLabels={true}
			labelPosition="outside"
		/>


		

<style>
	
</style>
