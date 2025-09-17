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
	function handleAreaChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newValue = target.value === 'null' ? null : target.value;
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
		let walkingTrips, cyclingTrips, automobileTrips, publicTrips;
		let walkingCO2, cyclingCO2, automobileCO2, publicCO2;
		let walkingDistance, cyclingDistance, automobileDistance, publicDistance;

		if (!selectedArea) {
			// Show totals for Dublin
			walkingTrips = reshapedData.totals?.walking?.trips?.[selectedScope]?.raw || 0;
			cyclingTrips = reshapedData.totals?.cycling?.trips?.[selectedScope]?.raw || 0;
			automobileTrips = reshapedData.totals?.automobile?.trips?.[selectedScope]?.raw || 0;
			publicTrips = reshapedData.totals?.public?.trips?.[selectedScope]?.raw || 0;
			
			walkingCO2 = reshapedData.totals?.walking?.co2?.gpc?.raw || 0;
			cyclingCO2 = reshapedData.totals?.cycling?.co2?.gpc?.raw || 0;
			automobileCO2 = reshapedData.totals?.automobile?.co2?.gpc?.raw || 0;
			publicCO2 = reshapedData.totals?.public?.co2?.gpc?.raw || 0;
			
			walkingDistance = reshapedData.totals?.walking?.distance?.gpc?.raw || 0;
			cyclingDistance = reshapedData.totals?.cycling?.distance?.gpc?.raw || 0;
			automobileDistance = reshapedData.totals?.automobile?.distance?.gpc?.raw || 0;
			publicDistance = reshapedData.totals?.public?.distance?.gpc?.raw || 0;
		} else {
			// Show data for selected area
			walkingTrips = reshapedData.byArea?.[selectedArea]?.walking?.trips?.[selectedScope]?.raw || 0;
			cyclingTrips = reshapedData.byArea?.[selectedArea]?.cycling?.trips?.[selectedScope]?.raw || 0;
			automobileTrips = reshapedData.byArea?.[selectedArea]?.automobile?.trips?.[selectedScope]?.raw || 0;
			publicTrips = reshapedData.byArea?.[selectedArea]?.public?.trips?.[selectedScope]?.raw || 0;
			
			walkingCO2 = reshapedData.byArea?.[selectedArea]?.walking?.co2?.gpc?.raw || 0;
			cyclingCO2 = reshapedData.byArea?.[selectedArea]?.cycling?.co2?.gpc?.raw || 0;
			automobileCO2 = reshapedData.byArea?.[selectedArea]?.automobile?.co2?.gpc?.raw || 0;
			publicCO2 = reshapedData.byArea?.[selectedArea]?.public?.co2?.gpc?.raw || 0;
			
			walkingDistance = reshapedData.byArea?.[selectedArea]?.walking?.distance?.gpc?.raw || 0;
			cyclingDistance = reshapedData.byArea?.[selectedArea]?.cycling?.distance?.gpc?.raw || 0;
			automobileDistance = reshapedData.byArea?.[selectedArea]?.automobile?.distance?.gpc?.raw || 0;
			publicDistance = reshapedData.byArea?.[selectedArea]?.public?.distance?.gpc?.raw || 0;
		}
		
		// Get values for the currently selected metric for display
		let walkingValue, cyclingValue, automobileValue, publicValue;
		if (!selectedArea) {
			walkingValue = reshapedData.totals?.walking?.[selectedMetric]?.[selectedScope]?.raw || 0;
			cyclingValue = reshapedData.totals?.cycling?.[selectedMetric]?.[selectedScope]?.raw || 0;
			automobileValue = reshapedData.totals?.automobile?.[selectedMetric]?.[selectedScope]?.raw || 0;
			publicValue = reshapedData.totals?.public?.[selectedMetric]?.[selectedScope]?.raw || 0;
		} else {
			walkingValue = reshapedData.byArea?.[selectedArea]?.walking?.[selectedMetric]?.[selectedScope]?.raw || 0;
			cyclingValue = reshapedData.byArea?.[selectedArea]?.cycling?.[selectedMetric]?.[selectedScope]?.raw || 0;
			automobileValue = reshapedData.byArea?.[selectedArea]?.automobile?.[selectedMetric]?.[selectedScope]?.raw || 0;
			publicValue = reshapedData.byArea?.[selectedArea]?.public?.[selectedMetric]?.[selectedScope]?.raw || 0;
		}
		
		// Calculate total for percentage calculations
		const totalTrips = walkingValue + cyclingValue + automobileValue + publicValue;
		
		// Calculate trip percentages
		const walkingPercentage = totalTrips > 0 ? (walkingValue / totalTrips * 100).toFixed(0) : '0';
		const cyclingPercentage = totalTrips > 0 ? (cyclingValue / totalTrips * 100).toFixed(0) : '0';
		
		// Calculate distance percentages using GPC data
		const totalDistance = walkingDistance + cyclingDistance + automobileDistance + publicDistance;
		const walkingDistancePercentage = totalDistance > 0 ? (walkingDistance / totalDistance * 100).toFixed(0) : '0';
		const cyclingDistancePercentage = totalDistance > 0 ? (cyclingDistance / totalDistance * 100).toFixed(0) : '0';
		
		// Calculate CO2 saved
		// emissions_per_AUTOMOBILE_trip = automobile_co2_total / automobile_trips_total
		const emissionsPerAutomobileTrip = automobileTrips > 0 ? automobileCO2 / automobileTrips : 0;
		
		// CO2 that would have been emitted if cycling/walking trips were made by car
		const cyclingCO2Saved = cyclingTrips * emissionsPerAutomobileTrip;
		const walkingCO2Saved = walkingTrips * emissionsPerAutomobileTrip;
		
		// Format CO2 saved values
		const formatCO2 = (value: number) => {
			if (value >= 1000) {
				return `${(value / 1000).toFixed(1)}k`;
			} else if (value >= 1) {
				return `${value.toFixed(1)}`;
			} else {
				return `${(value * 1000).toFixed(0)} kg`;
			}
		};
		
		return [
			{
				title: "Percentage of all trips",
				stats: [
					{ label: "of all trips", value: `${cyclingPercentage}%` },
					{ label: "of all trips", value: `${walkingPercentage}%` },
				],
				explanation: `The percentage of all trips across Dublin which were on foot or by bike in 2023.`
			},{
				title: "Percentage of total distance",
				stats: [
					{ label: "distance travelled", value: `${cyclingDistancePercentage}%` },
					{ label: "distance travelled", value: `${walkingDistancePercentage}%` },
				],
				explanation: `Walking and cycling trips as a percentage of total distance covered in 2023.`
			},
			{
				title: "Daily Trips",
				stats: [
					{ label: "trips", value: Math.round(cyclingTrips/365).toLocaleString() },
					{ label: "trips", value: Math.round(walkingTrips/365).toLocaleString() },
				],
				explanation: `The average walking and cycling trips a day in 2023.`

			},
			{
				title: "CO2 saved",
				stats: [
					{ label: "tonnes CO2 saved", value: formatCO2(cyclingCO2Saved) },
					{ label: "tonnes CO2 saved", value: formatCO2(walkingCO2Saved) },
				],
				explanation: "Calculated by multiplying active travel trips by the	 average automobile GPC emissions per trip."
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
				onchange={handleAreaChange}
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
			explanation="The distribution of transportation modes for all trips across Google's Environmental Insights Platform for 2023."
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
