<script>
	import { getContext } from 'svelte';
	import StackedBarH from '$lib/components/shared/StackedBarH.svelte';
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
				.sort(([,a], [,b]) => b - a)
				.map(([type, count]) => ({
					label: type.replace(/_/g, ' ').toLowerCase(),
					value: count,
					color: getInfrastructureColor('nta', type)
				}));
		}
	});
</script>


		<StackedBarH 
			data={chartData}
			height={40}
			showLabels={true}
			labelPosition="outside"
		/>


		

<style>
	.infrastructure-chart-container {
		width: 100%;
		background: #f9fafb;
		border-radius: 8px;
		padding:0px;
		border: 0px solid #e5e7eb;
	}

	.chart-header h4 {
		font-size: 14px;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 16px 0;
		font-family: 'Inter', sans-serif;
	}

	.no-chart-data {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #6b7280;
	}

	.no-chart-data p {
		margin: 0;
		font-size: 14px;
	}
</style>
