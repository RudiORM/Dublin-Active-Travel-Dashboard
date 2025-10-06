<script>
	import DataCard from '$lib/components/shared/DataCard.svelte';
	
	// Props passed from parent
	let { 
		reshapedData,
		selectedMode,
		selectedPlace,
		selectedYear,
		selectedArea,
		censusContext
	} = $props();

	// Reactive computed values using runes
	const currentStats = $derived(reshapedData[`${selectedMode}_${selectedPlace}_${selectedYear}`]);

	const totalStats = $derived(currentStats ? currentStats['_TOTAL'] : null);

	// Get all available areas from the current stats, sorted alphabetically
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

	// Handle dropdown change
	function handleAreaChange(event) {
		const newValue = event.target.value === 'null' ? null : event.target.value;
		censusContext.selectedArea = newValue;
		
		// Update the map visualization to highlight the selected area (skip source update)
		censusContext.updateVisualization(true);
	}

	// Get display name for selected area
	const displayName = $derived.by(() => {
		if (!selectedArea) return 'Dublin';
		return selectedArea.replace(/_/g, ' ').replace(/-/g, ' ');
	});

	// Get the boundary type label for display
	const boundaryTypeLabel = $derived(censusContext?.selectedBoundaryType === 'ed' ? 'Electoral Division' : 'Local Electoral Area');

	// Prepare stats data for the cards
	const statsData = $derived.by(() => {
		const cyclingStats = reshapedData[`cycling_${selectedPlace}_${selectedYear}`];
		const walkingStats = reshapedData[`walking_${selectedPlace}_${selectedYear}`];
		
		if (!cyclingStats || !walkingStats) return [];
		
		// Use totals if Dublin is selected (selectedArea is null), otherwise use specific area data
		const cyclingData = selectedArea ? cyclingStats[selectedArea] : cyclingStats['_TOTAL'];
		const walkingData = selectedArea ? walkingStats[selectedArea] : walkingStats['_TOTAL'];
		
		if (!cyclingData || !walkingData) return [];
		
		// Get the appropriate percentage value (individual areas use 'percentage', totals use 'averagePercentage')
		const cyclingPercentage = cyclingData.percentage !== undefined ? cyclingData.percentage : cyclingData.averagePercentage;
		const walkingPercentage = walkingData.percentage !== undefined ? walkingData.percentage : walkingData.averagePercentage;
		
		return [
			{
				title: "Mode of transport for commuting",
				stats: [
					{ label: "of commuters", value: `${Math.round(cyclingPercentage)}%` },
					{ label: "of commuters", value: `${Math.round(walkingPercentage)}%` },
				],
				explanation: "The percentage of the working population who reported travelling to work, school or college by bicycle or on foot."
			},
			{
				title: "Total number of commuters",
				stats: [
					{ label: "commuters", value: `${cyclingData.raw.toLocaleString()}` },
					{ label: "commuters", value: `${walkingData.raw.toLocaleString()}` },
				],
				explanation: "The number of commuters who reported travelling to work, school or college by bicycle or on foot."
			},
			{
				title: "Annual premature deaths avoided", 
				stats: [
					{ label: "deaths avoided", value: Math.round(cyclingData.raw*0.41*0.1/40) },
					{ label: "deaths avoided", value: Math.round(walkingData.raw*0.16*0.1/40) },
				],
				explanation: "Walking or biking to work reduce the risk of premature death by 41% and 16% respectively. The risk of premature death between 30-70 years was estimated at 10%."
			},
			{
				title: "Annual money saved on fuel",
				stats: [
					{ label: "saved on fuel", value: `${'€'+(Math.round(cyclingData.raw*401.5/1000000)>10?Math.round(cyclingData.raw*401.5/1000000)+'m':Math.round(cyclingData.raw*401.5)).toLocaleString()}` },
					{ label: "saved on fuel", value: `${'€'+(Math.round(walkingData.raw*401.5/1000000)>10?Math.round(walkingData.raw*401.5/1000000)+'m':Math.round(walkingData.raw*401.5)).toLocaleString()}` },
				],
				explanation: "Assumes each person cycling or walking would otherwise have a 10km commute 3.5 days a week. We use the calculator by TomTom to estimate this cost at €401.50 per person."
			},
			{
				title: "Annual CO2 emissions avoided",
				stats: [
					{ label: "tonnes CO2 saved", value: Math.round(253*.001*.7*.095*20*cyclingData.raw).toLocaleString() },
					{ label: "tonnes CO2 saved", value: Math.round(253*.001*.7*.095*20*walkingData.raw).toLocaleString() },
				],
				explanation: "Assumes each person cycling or walking would otherwise have a 10km commute 3.5 days a week and a carbon footprint for a car as 95g CO2/km."
				
			},
			{
				title: "Annual time in traffic avoided",
				stats: [
					{ label: "years saved", value: Math.round(cyclingData.raw*158*.7*0.000114155).toLocaleString() },
					{ label: "years saved", value: Math.round(walkingData.raw*158*.7*0.000114155).toLocaleString() },
				],
				explanation: "Assumes a 10km commute 3.5 days a week. A study by Tomtom found that a daily 10km commute in Dublin resulted in 158 hours lost to congestion."
			},
			
		];
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
				  </option>				{/each}
			</select>
		</div>
	</div>

	{#if totalStats}
		<div class="stats-grid">
			{#each statsData as cardData}
				<DataCard 
					title={cardData.title}
					stats={cardData.stats}
					explanation={cardData.explanation}
				/>
			{/each}
		</div>
	{/if}

	


</div>

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
		margin-top: 3px;
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
		margin-top: 20px;
	}

	@media (max-width: 1200px) {
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
