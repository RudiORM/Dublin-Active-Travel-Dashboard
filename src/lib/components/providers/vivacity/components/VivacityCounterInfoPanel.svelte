<script>
	import { getContext } from 'svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	import VivacityCounterTimeSeries from './VivacityCounterTimeSeries.svelte';

	// Get provider context
	const vivacityCounterProvider = getContext('vivacityCounterProvider');

	// Reactive data from provider
	const data = $derived(vivacityCounterProvider?.data || []);
	const selectedLocation = $derived(vivacityCounterProvider?.selectedLocation);
	const selectedLocationId = $derived(vivacityCounterProvider?.selectedLocationId);
	const selectedLocationTimeSeriesData = $derived(vivacityCounterProvider?.selectedLocationTimeSeriesData);

	const selectedMode = $derived(vivacityCounterProvider?.selectedMode);

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
		const newValue = target.value === 'null' ? null : target.value;
		
		if (newValue) {
			const location = data.find(loc => loc.id === newValue);
			if (location) {
				await vivacityCounterProvider.setSelectedLocation(location);
			}
		} else {
			await vivacityCounterProvider.setSelectedLocation(null);
		}
	}

	$effect(() => {
		console.log('selectedLocationTimeSeriesData',selectedLocationTimeSeriesData);
	});



	// TODO: Implement data calculations for cards
	const dailyStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.summary || !selectedLocation?.travelModes) {
			return [{ label: "detected traffic", value: "0" }];
		}

		// Get the current filter mode from the provider context
		const currentMode = vivacityCounterProvider.selectedMode;

		const dataString = currentMode === 'pedestrian' ? 'pedestrianPercentage':'cyclistPercentage'
		
		
		return [{ label: "share of total traffic", value: selectedLocationTimeSeriesData.summary[dataString].toFixed(1)+'%' }];
	});
	const dailyTotals = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.summary || !selectedLocation?.travelModes) {
			return [{ label: "daily count", value: "0" }];
		}

		// Get the current filter mode from the provider context
		const currentMode = vivacityCounterProvider.selectedMode;

		const dataString = currentMode === 'pedestrian' ? 'totalPedestrianCount':'totalCyclistCount'
		
		
		return [{ label: "counts", value: selectedLocationTimeSeriesData.summary[dataString].toLocaleString()}];
	});

</script>

{#if selectedLocation}

<div class="info-panel">
<div class="panel-header">
	<div class="header-inline">
		<span class="area-label">Vivacity sensor data for</span>

	
	<!-- Location dropdown -->
	
		<select 
			id="vivacity-location-select" 
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
		title="Share of traffic"
		stats={dailyStats}
		explanation="Walking as a percentage of total traffic at this vivacity-counter location."
		mode={selectedMode?selectedMode:'walking'}
	/>

	<DataCardSingle
		title="Counts"
		stats={dailyTotals}
		explanation="Percentage change in usage from the previous year."
		mode={selectedMode?selectedMode:'walking'}
	/>
</div>
{/if}

<!-- Show time series for available travel modes -->
{#if selectedLocationTimeSeriesData}
	{console.log('made it here')}
	
	{#if selectedLocation?.travelModes}
		{#if selectedLocation.travelModes.includes('pedestrian') && selectedMode=='pedestrian'}
			<VivacityCounterTimeSeries
				travelMode="pedestrian"
				chartType="hourly"
				title="Hourly average counts"
				explanation="Average counts by hour over the last 7 days"
			/>

			<VivacityCounterTimeSeries
			travelMode="pedestrian"
			chartType="daily"
			title="Counts in the last 30 days"
			explanation="Tota daily counts over the last 30 days"
		/>
		{/if}
		
		{#if selectedLocation.travelModes.includes('bike') && selectedMode=='bike'}
			<VivacityCounterTimeSeries
				travelMode="bike"
				chartType="hourly"
				title="Hourly Average Usage"
				explanation="Average daily usage by hour over the last 30 days"

			/>


			<VivacityCounterTimeSeries
				travelMode="bike"
				chartType="daily"
				title="Hourly Average Usage"
				explanation="Average daily usage by hour over the last 30 days"
			/>

		
		{/if}
	
	{/if}
{/if}

</div>

{:else}
	<div class="no-data">
		<p>Vivacity-counter data is currently not available for the selected location. Please try another.</p>
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

	.panel-header {
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
			font-size: 16px;
		}

		.cards-container {
			flex-direction: column;
			gap: 15px;
		}

		.info-panel {
			gap: 10px;
		}

		.area-label {
			font-size: 16px;
		}
	}
</style>