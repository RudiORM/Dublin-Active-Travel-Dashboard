<script>
	import StravaTimeSeries from './StravaTimeSeries.svelte';
	import DataCard from '$lib/components/shared/DataCard.svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	// Props
	let { 
		reshapedData,
		selectedRoute,
		selectedLocation,
		stravaContext
	} = $props();

	// Derived data for the selected route
	const routeData = $derived.by(() => {
		if (!reshapedData?.byRoute?.[selectedRoute]) {
			return null;
		}
		return reshapedData.byRoute[selectedRoute];
	});

	const timeSeriesData = $derived.by(() => {
		if (!routeData) {
			return [];
		}
		return routeData.data;
	});

	const routeTotals = $derived.by(() => {
		if (!routeData) return {};
		return routeData.totals;
	});

	// Calculate 2023 daily average cyclists
	const dailyCyclists2023 = $derived.by(() => {
		if (!routeData) {
			console.log('StravaInfoPanel - No routeData for dailyCyclists2023');
			return 0;
		}
		
		console.log('StravaInfoPanel - routeData:', routeData);
		console.log('StravaInfoPanel - routeData.data:', routeData.data);
		
		// Filter data for 2023
		const data2023 = routeData.data.filter(item => item.date && item.date.includes('2023'));
		console.log('StravaInfoPanel - data2023:', data2023);
		
		if (data2023.length === 0) return 0;
		
		// Calculate daily average (monthly values / days in month)
		const totalDays = data2023.length * 30.44; // Average days per month
		const totalUsage = data2023.reduce((sum, item) => sum + (item.value || 0), 0);
		
		return Math.round(totalUsage / totalDays);
	});

	// Calculate change from 2022 to 2023
	const yearOverYearChange = $derived.by(() => {
		if (!routeData) {
			console.log('StravaInfoPanel - No routeData for yearOverYearChange');
			return 0;
		}
		
		// Get 2022 and 2023 data
		const data2022 = routeData.data.filter(item => item.date && item.date.includes('2022'));
		const data2023 = routeData.data.filter(item => item.date && item.date.includes('2023'));
		
		console.log('StravaInfoPanel - data2022:', data2022);
		console.log('StravaInfoPanel - data2023:', data2023);
		
		if (data2022.length === 0 || data2023.length === 0) return 0;
		
		// Calculate totals for each year
		const total2022 = data2022.reduce((sum, item) => sum + (item.value || 0), 0);
		const total2023 = data2023.reduce((sum, item) => sum + (item.value || 0), 0);
		
		console.log('StravaInfoPanel - total2022:', total2022, 'total2023:', total2023);
		
		// Calculate percentage change
		const change = ((total2023 - total2022) / total2022) * 100;
		return Math.round(change * 10) / 10; // Round to 1 decimal place
	});

	// Create stats arrays for DataCard components
	const dailyStats = $derived.by(() => {
		const value = dailyCyclists2023 ? dailyCyclists2023.toLocaleString() : "0";
		console.log('StravaInfoPanel - dailyStats value:', value);
		return [{ label: "daily cyclists", value: value }];
	});

	const changeStats = $derived.by(() => {
		const value = yearOverYearChange ? `${yearOverYearChange > 0 ? '+' : ''}${yearOverYearChange}%` : "0%";
		console.log('StravaInfoPanel - changeStats value:', value);
		return [{ label: "change", value: value }];
	});

	// Calculate peak month and its value
	const peakMonthData = $derived.by(() => {
		if (!routeData?.data || routeData.data.length === 0) {
			return { month: "N/A", value: 0 };
		}
		
		let maxValue = 0;
		let peakMonth = "";
		
		routeData.data.forEach(item => {
			if (item.value > maxValue) {
				maxValue = item.value;
				peakMonth = item.date;
			}
		});
		
		// Format month from "31/01/2021" to "Jan 2021"
		if (peakMonth) {
			const parts = peakMonth.split('/');
			if (parts.length === 3) {
				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
								  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				const monthIndex = parseInt(parts[1]) - 1;
				const year = parts[2];
				peakMonth = `${monthNames[monthIndex]} ${year}`;
			}
		}
		
		return { month: peakMonth || "N/A", value: Math.round(maxValue) };
	});

	const peakMonthStats = $derived.by(() => {
		return [{ label: "peak month", value: peakMonthData.month }];
	});

	const peakJourneysStats = $derived.by(() => {
		const value = peakMonthData.value ? peakMonthData.value.toLocaleString() : "0";
		return [{ label: "journeys", value: value }];
	});

	
</script>

{#if routeData}

<div class="info-panel">
<div class="panel-header">
	<div class="header-inline">
		<span class="area-label">Strava cycling data for {selectedRoute}</span>
	</div>
</div>

{#if dailyStats.length > 0}
<div class="cards-container">
	<DataCardSingle
		title="2023 Daily Cyclists"
		stats={dailyStats}
		explanation="Average number of cyclists using this route per day in 2023, estimated from monthly Strava data."
	/>

	<DataCardSingle
		title="Change from 2022 to 2023"
		stats={changeStats}
		explanation="Percentage change in estimated total route usage from 2022 to 2023, estimated from monthly Strava data."
	/>


</div>
{/if}

<StravaTimeSeries
	title="Strava Route Usage Over Time"
	explanation="This chart shows the estimated historical usage data for the selected Strava route. We use a model to estimate the total cycling activity based on Strava data and other factors."
	timeSeriesData={timeSeriesData}
	routeName={selectedRoute}
	totals={routeTotals}
/>

{#if dailyStats.length > 0}
<div class="cards-container" id='last'>

	<DataCardSingle
		title="Peak Month"
		stats={peakMonthStats}
		explanation="The month with the highest recorded cycling activity on this route, estimated from monthly Strava data."
	/>

	<DataCardSingle
		title="Peak Month Journeys"
		stats={peakJourneysStats}
		explanation="The number of cycling journeys recorded during the peak month, estimated from monthly Strava data."
	/>
</div>
{/if}


</div>
{:else}
	<div class="no-data">
		<p>No data available for the selected route.</p>
	</div>
{/if}

<style>

	#last {
		padding-bottom: 40px;
	}

.info-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: 100%;
	}

	.area-label {
		font-size: 22px;
		font-weight: 400;
		color: #000;
		word-wrap: break-word;
		line-height: 1.3;
	}

	.header-inline {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.no-data {
		padding: 20px;
		text-align: center;
		color: #666;
		background: #fff;
		border-radius: 8px;
		white-space: nowrap;
	}

	.panel-header {
	}

	.cards-container {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
	}


	@media (max-width: 950px) {
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




}

	


</style>
