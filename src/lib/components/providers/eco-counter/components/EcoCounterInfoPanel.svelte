<script>
	import { getContext } from 'svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	import EcoCounterTimeSeries from './EcoCounterTimeSeries.svelte';

	// Get provider context
	const ecoCounterProvider = getContext('ecoCounterProvider');

	// Reactive data from provider
	const data = $derived(ecoCounterProvider?.data || []);
	const selectedLocation = $derived(ecoCounterProvider?.selectedLocation);
	const selectedLocationId = $derived(ecoCounterProvider?.selectedLocationId);
	const selectedLocationTimeSeriesData = $derived(ecoCounterProvider?.selectedLocationTimeSeriesData);

	const selectedMode = $derived(ecoCounterProvider?.selectedMode);

	// Get available locations, filtered by current mode and sorted alphabetically
	let availableLocations = $derived.by(() => {
		if (!data || data.length === 0) return [];
		
		const locations = data
			.filter(location => {
				// Filter by current mode
				return location.travelModes && location.travelModes.includes(selectedMode);
			})
			.map(location => ({
				value: location.id,
				label: location.name,
				id: location.id
			}))
			.sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
		
		return [
			{ value: null, label: 'Select a location', id: null },
			...locations
		];
	});

	// Handle dropdown change
	async function handleLocationChange(event) {
		const target = event.target;
		const newValue = target.value === 'null' ? null : parseInt(target.value);
		
		if (newValue) {
			const location = data.find(loc => loc.id === newValue);
			if (location) {
				await ecoCounterProvider.setSelectedLocation(location);
			}
		} else {
			await ecoCounterProvider.setSelectedLocation(null);
		}
	}

	$effect(() => {
			console.log('data',data);
			console.log('selectedLocationTimeSeriesData',selectedLocationTimeSeriesData);
			console.log('ecoCounterProvider',ecoCounterProvider);

	});

	// TODO: Implement data calculations for cards
	const dailyStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.monthlyData || !selectedLocation?.travelModes) {
			return [{ label: "daily count", value: "0" }];
		}

		// Get the current filter mode from the provider context
		const currentMode = ecoCounterProvider.selectedMode;
		
		// Get monthly data for the selected travel mode
		const monthlyData = selectedLocationTimeSeriesData.monthlyData[currentMode];
		
		if (!monthlyData || monthlyData.length === 0) {
			return [{ label: "daily count", value: "0" }];
		}

		// Get the last 12 months of data
		const last12Months = monthlyData.slice(-12);
		
		// Calculate total for last 12 months
		const totalLast12Months = last12Months.reduce((sum, month) => sum + month.value, 0);
		
		// Calculate average daily count (total / 365 days)
		const dailyAverage = Math.round(totalLast12Months / 365);
		
		return [{ label: "daily count", value: dailyAverage.toLocaleString() }];
	});

	const changeStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.monthlyData || !selectedLocation?.travelModes) {
			return [{ label: "change", value: "N/A" }];
		}

		// Get the current filter mode from the provider context
		const currentMode = ecoCounterProvider.selectedMode;
		
		// Get monthly data for the selected travel mode
		const monthlyData = selectedLocationTimeSeriesData.monthlyData[currentMode];

		console.log('monthlyData for change calculation:', monthlyData);
		
		if (!monthlyData || monthlyData.length < 24) { // Need at least 24 months of data
			console.log('Not enough data for change calculation. Length:', monthlyData?.length);
			return [{ label: "change", value: "N/A" }];
		}

		// Get the most recent 12 months and the previous 12 months
		const recentYear = monthlyData.slice(-12);
		const previousYear = monthlyData.slice(-24, -12);
		
		
		// Calculate totals for each period
		const currentYearTotal = recentYear.reduce((sum, month) => sum + month.value, 0);
		const previousYearTotal = previousYear.reduce((sum, month) => sum + month.value, 0);
		
		if (previousYearTotal === 0) {
			return [{ label: "change", value: "N/A" }];
		}
		
		// Calculate percentage change
		const percentageChange = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
		const formattedChange = percentageChange >= 0 
			? `+${percentageChange.toFixed(1)}%` 
			: `${percentageChange.toFixed(1)}%`;
		
		console.log('Percentage change:', percentageChange, 'Formatted:', formattedChange);
		
		return [{ label: "change", value: formattedChange }];
	});

</script>

{#if selectedLocation}

<div class="info-panel">
<div class="panel-header">
	<div class="header-inline">
		<span class="area-label">Eco-Counter data for</span>

	
	<!-- Location dropdown -->
	
		<select 
			id="eco-location-select" 
			class="location-dropdown" 
			value={selectedLocationId || 'null'} 
			onchange={handleLocationChange}
		>
			{#each availableLocations as location}
				<option value={location.value || 'null'}>
					{location.label}
				</option>
			{/each}
		</select>
	</div>
	</div>


{#if dailyStats[0].value!='0'}
<div class="cards-container">
	<DataCardSingle
		title="Counts"
		stats={dailyStats}
		explanation="The average daily count of pedestrians or cyclists recorded at this induction sensor over the last year."
		mode={selectedMode}
	/>

	<DataCardSingle
		title="Year-over-year change"
		stats={changeStats}
		explanation="The percentage change in total counts between the last 12 months and the previous 12 months."
		mode={selectedMode}
	/>
</div>

<!-- Show time series for available travel modes -->
{#if selectedLocationTimeSeriesData}
	{console.log('made it here')}
	
	{#if selectedLocation?.travelModes}
		{#if selectedLocation.travelModes.includes('pedestrian') && selectedMode == 'pedestrian'}
			<EcoCounterTimeSeries
				travelMode="pedestrian"
				chartType="hourly"
				title="Hourly average counts"
				explanation="The average daily counts of pedestrians or cyclists recorded at this induction sensor over the last 30 days, by hour."
			/>
			<EcoCounterTimeSeries
				travelMode="pedestrian"
				chartType="monthly"
				title="Trends: last 3 years"
				explanation="The total monthly counts of pedestrians or cyclists recorded at this induction sensor over the last 3 years."
			/>
		{/if}
		
		<div class="time-series-container">
		{#if selectedLocation.travelModes.includes('bike') && selectedMode == 'bike'}
			<EcoCounterTimeSeries
				travelMode="bike"
				chartType="hourly"
				title="Average counts by hour"
				explanation="The average counts by hour over the last 30 days"
			/>
			<EcoCounterTimeSeries
				travelMode="bike"
				chartType="monthly"
				title="Monthly trends"
				explanation="Monthly counts over the last 3 years"
			/>
		{/if}
	</div>
	
	{/if}
{/if}


{:else}
	<div class="no-data">
		<p>Eco-counter data is currently not available for the selected location. Please try another.</p>
	</div>

{/if}



</div>

{/if}



<style>
	.no-data {
		padding: 20px;
		text-align: center;
		color: #666;
		background: #fff;
		border-radius: 8px;
	}

	.time-series-container {
		padding-bottom: 20px;
	}

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
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	

	.cards-container {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
	}

	
	
	.location-dropdown {
		font-size: 22px;
		font-weight: 400;
		padding-bottom: 2px;
		background: #EEF2F6;
		color: #000;
		border: 0px solid #e5e5e5;
		border-radius: 0px;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: border-color 0.2s ease;
		border-bottom: 1px solid #000;
		max-width: 300px;
	}

	.location-dropdown:hover {
		border-color: white;
	}

	.location-dropdown:focus {
		outline: none;
		border-color: #999;
	}

	.location-dropdown option {
		padding: 8px;
		font-size: 16px;
	}



	@media (max-width: 1200px) {
	

	.location-dropdown {
		max-width: 250px;
	}
}



	@media (max-width: 950px) {

		.location-dropdown {
			max-width: 100%;
		}

	
		.location-dropdown {
			font-size: 16px;
		}

		.cards-container {
			flex-direction: column;
			gap: 15px;
		}

	.area-label {
		font-size: 16px;
		
	}

	

	
	}


	@media (min-width: 651px) and (max-height: 750px) {

.area-label {
	font-size: 14px;
}

.location-dropdown {
	font-size: 14px;
	max-width: 220px;

}


}

</style>