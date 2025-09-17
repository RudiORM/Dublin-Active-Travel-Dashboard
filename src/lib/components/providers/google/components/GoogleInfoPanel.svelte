<script lang="ts">
	import DataCard from '$lib/components/shared/DataCard.svelte';
	import { getGooglePrimaryColor } from '$lib/utils/google/google-colors.js';
	import GoogleStacked from './GoogleStacked.svelte';


	// Props passed from parent
	let { 
		reshapedData,
		selectedMode,
		selectedMetric,
		selectedScope,
		selectedArea,
		censusContext  // Add this to match the first file's pattern
	} = $props();

	// Add currentStats derived value to match the pattern from the first file
	const currentStats = $derived(
		reshapedData.byArea || null
	);

	let availableAreas = $derived.by(() => {
		if (!currentStats) return [];
		
		const areas = Object.keys(currentStats)
			.filter(key => key !== '_TOTAL')
			.sort();
		
		// Put Dublin (totals) at the top, then all other areas
		return [
			{ value: null, label: 'Dublin' },
			...areas.map(area => ({ 
				value: area, 
				label: area.replace(/_/g, ' ').replace(/-/g, ' ')
			}))
		];
	});

	// Handle dropdown change - this was missing!
	function handleAreaChange(event) {
		const newValue = event.target.value === 'null' ? null : event.target.value;
		// Update through censusContext if available, otherwise update the prop directly
		if (censusContext) {
			censusContext.selectedArea = newValue;
			// Update the map visualization to highlight the selected area
			censusContext.updateVisualization?.();
		}
	}

	// Reactive computed values using runes
	const selectedAreaData = $derived(
		selectedArea && reshapedData.byArea?.[selectedArea]?.[selectedMode]?.[selectedMetric]?.[selectedScope] || null
	);
	const totalStats = $derived(
		reshapedData.totals?.[selectedMode]?.[selectedMetric]?.[selectedScope] || null
	);

	// Get display name for selected area
	const displayName = $derived.by(() => {
		if (!selectedArea) return 'Dublin';
		return selectedArea.replace(/_/g, ' ').replace(/-/g, ' ');
	});

	// Prepare the DataCard stats - updates based on selected area
	const statsData = $derived.by(() => {
		let walkingValue, cyclingValue, automobileValue, publicValue;
		
		if (!selectedArea) {
			// Show totals for Dublin
			walkingValue = reshapedData.totals?.walking?.[selectedMetric]?.[selectedScope]?.raw || 0;
			cyclingValue = reshapedData.totals?.cycling?.[selectedMetric]?.[selectedScope]?.raw || 0;
			automobileValue = reshapedData.totals?.automobile?.[selectedMetric]?.[selectedScope]?.raw || 0;
			publicValue = reshapedData.totals?.public?.[selectedMetric]?.[selectedScope]?.raw || 0;
		} else {
			// Show data for selected area
			walkingValue = reshapedData.byArea?.[selectedArea]?.walking?.[selectedMetric]?.[selectedScope]?.raw || 0;
			cyclingValue = reshapedData.byArea?.[selectedArea]?.cycling?.[selectedMetric]?.[selectedScope]?.raw || 0;
			automobileValue = reshapedData.byArea?.[selectedArea]?.automobile?.[selectedMetric]?.[selectedScope]?.raw || 0;
			publicValue = reshapedData.byArea?.[selectedArea]?.public?.[selectedMetric]?.[selectedScope]?.raw || 0;
		}
		
		// Calculate total for percentage calculations
		const totalTrips = walkingValue + cyclingValue + automobileValue + publicValue;
		
		// Calculate percentages
		const walkingPercentage = totalTrips > 0 ? (walkingValue / totalTrips * 100).toFixed(0) : '0';
		const cyclingPercentage = totalTrips > 0 ? (cyclingValue / totalTrips * 100).toFixed(0) : '0';
		
		return [
			{
				title: "Percentage of all trips",
				stats: [
					{ label: "of all trips", value: `${cyclingPercentage}%` },
					{ label: "of all trips", value: `${walkingPercentage}%` },
				],
				explanation: selectedArea 
					? `The percentage of all trips in ${displayName} made by walking and cycling.`
					: "The percentage of all trips across Dublin made by walking and cycling."
			},
			{
				title: "Total Trips",
				stats: [
					{ label: "cycling trips", value: cyclingValue.toLocaleString() },
					{ label: "walking trips", value: walkingValue.toLocaleString() },

				],
				explanation: selectedArea 
					? `The number of walking and cycling trips made in ${displayName}.`
					: "The total number of walking and cycling trips made across all of Dublin."
			},

		];
	});

	// Get transportation mode distribution data
	const modeData = $derived.by(() => {
		if (!reshapedData) return [];

		const modes = ['walking', 'cycling', 'automobile', 'public'];
		const data: Array<{label: string, value: number, color: string}> = [];

		modes.forEach(mode => {
			let value;
			
			if (!selectedArea) {
				// Use totals for Dublin
				value = reshapedData.totals?.[mode]?.[selectedMetric]?.[selectedScope]?.raw || 0;
			} else {
				// Use selected area data
				value = reshapedData.byArea?.[selectedArea]?.[mode]?.[selectedMetric]?.[selectedScope]?.raw || 0;
			}
			
			if (value > 0) {
				let label = mode.charAt(0).toUpperCase() + mode.slice(1);
				if (mode === 'public') label = 'Public Transport';
				
				data.push({
					label: label,
					value: value,
					color: getGooglePrimaryColor(mode)
				});
			}
		});

		return data;
	});
</script>
<div class="info-panel">
	<div class="panel-header">
		<div class="header-inline">
			<span class="area-label">Census statistics for</span>
			<select 
				id="area-select" 
				class="area-dropdown" 
				value={selectedArea || 'null'} 
				on:change={handleAreaChange}
			>
				{#each availableAreas as area}
				<option value={area.value || 'null'}>
					{area.label
					  .split(' ')
					  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
					  .join(' ')}
				  </option>				
				  {/each}
			</select>
		</div>
	</div>

	{#if totalStats}

	<GoogleStacked 
			title="Transportation Mode Distribution"
			modeData={modeData}
			explanation="The distribution of transportation modes for all trips."
		/>


	<div class="stats-grid">
		{#each statsData as d}
		<DataCard 
			title={d.title}
			stats={d.stats}
			explanation={d.explanation}
		/>
		{/each}


		
	</div>
{/if}



	</div>

	

<!-- 

<div class="info-panel">
	
	<div class="chart-section">
		<h4>Transportation Mode Distribution</h4>
		<StackedBarH 
			data={modeData} 
			height={50} 
			showLabels={true} 
			labelPosition="outside"
		/>
	</div>

	{#if selectedArea && selectedAreaData}
		<div class="selected-area-section">
			<h4>Selected Area: {selectedArea}</h4>
			<div class="stat-grid">
				<div class="stat-item">
					<span class="stat-label">{selectedMode} trips</span>
					<span class="stat-value">{selectedAreaData.formatted}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Share of all trips</span>
					<span class="stat-value">{selectedAreaData.formattedPercentage}</span>
				</div>
			</div>
			
			{#if totalStats && totalStats.raw > 0}
				<div class="percentage-section">
					<div class="stat-item">
						<span class="stat-label">% of Total</span>
						<span class="stat-value">
							{((selectedAreaData.raw / totalStats.raw) * 100).toFixed(2)}%
						</span>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="no-selection">
			<p>Click on an area on the map to see detailed mobility statistics</p>
		</div>
	{/if}
</div> -->

<style>
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: 100%;
	}


	.header-inline {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.area-label {
		font-size: 22px;
		font-weight: 400;
		color: #000;
		white-space: nowrap;
	}

	.area-dropdown {
		font-size: 22px;
		font-weight: 400;
		padding-bottom: 2px;
		color: #000;
		background: #EEF2F6;
		border: 0px solid #e5e5e5;
		border-radius: 0px;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: border-color 0.2s ease;
		border-bottom: 1px solid #000;
		max-width: 360px;
		width: 340px;
	}

	.area-dropdown:hover {
		border-color: #d1d5db;
	}

	.area-dropdown:focus {
		outline: none;
		border-color: #999;
	}

	.area-dropdown option {
		padding: 8px;
		font-size: 16px;
	}


	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 1300px) {
		.stats-grid {
			grid-template-columns: 1fr;
			padding-bottom: 30px;
		}

		.area-dropdown {
			max-width: 265px;
	}

	@media (max-width: 950px) {
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}

		.area-dropdown {
			max-width: 100%;
	}

	.info-panel {
			gap: 10px;

		}


	.area-label {
		font-size: 16px;
		
	}

	.area-dropdown {
		font-size: 16px;
	}

}


@media (max-width: 850px) {
		.stats-grid {

			grid-template-columns: 1fr;
		}}




@media (max-width: 620px) {
		.stats-grid {
			margin-top: 10px;

		}

		

	
}


}

	
</style>
