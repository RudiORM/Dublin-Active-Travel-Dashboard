<script>
	import { getContext } from 'svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	import EcoCounterTimeSeries from './EcoCounterTimeSeries.svelte';
	import VivacityCitywideSensorBars from '../../vivacity/components/VivacityCitywideSensorBars.svelte';
	import VivacityCitywideMonthlyChart from '../../vivacity/components/VivacityCitywideMonthlyChart.svelte';
	import { getEcoCounterColor } from '../../../../utils/eco-counter/eco-counter-colors.js';

	const ecoCounterProvider = getContext('ecoCounterProvider');

	const allLocations = $derived(ecoCounterProvider?.allLocations || []);
	const networkView = $derived(ecoCounterProvider?.networkView);
	const ecoNetworkDailyLoading = $derived(ecoCounterProvider?.ecoNetworkDailyLoading ?? false);
	const ecoTimeSeriesLoading = $derived(ecoCounterProvider?.ecoTimeSeriesLoading ?? false);
	const selectedLocation = $derived(ecoCounterProvider?.selectedLocation);
	const selectedLocationId = $derived(ecoCounterProvider?.selectedLocationId);
	const selectedLocationTimeSeriesData = $derived(ecoCounterProvider?.selectedLocationTimeSeriesData);
	const selectedMode = $derived(ecoCounterProvider?.selectedMode);
	const isLoading = $derived(ecoCounterProvider?.isLoading);
	const loadError = $derived(ecoCounterProvider?.error);

	const seriesColor = $derived.by(
		() => getEcoCounterColor(selectedMode === 'bike' ? 'bike' : 'pedestrian') ?? '#CC3311'
	);
	let detailPeriod = $state('weekly');

	function toggleDetailPeriod() {
		detailPeriod = detailPeriod === 'weekly' ? 'monthly' : 'weekly';
	}

	let availableLocations = $derived.by(() => {
		if (!allLocations.length) {
			return [{ value: null, label: 'All sites — overview', id: null }];
		}

		const locations = allLocations
			.filter((location) => location.travelModes?.includes(selectedMode))
			.map((location) => {
				const id = Number(location.id);
				return {
					value: Number.isFinite(id) ? id : location.id,
					label: location.name || `Site ${location.id}`,
					id: Number.isFinite(id) ? id : location.id
				};
			})
			.sort((a, b) => String(a.label).localeCompare(String(b.label)));

		return [{ value: null, label: 'All sites — overview', id: null }, ...locations];
	});

	const locationSelectValue = $derived(
		selectedLocationId != null ? String(selectedLocationId) : 'null'
	);

	async function handleBarChartSiteSelect(siteId) {
		const location = allLocations.find((loc) => String(loc.id) === String(siteId));
		if (location) {
			await ecoCounterProvider.setSelectedLocation(location);
		}
	}

	async function handleLocationChange(event) {
		const target = event.target;
		const newValue = target.value === 'null' ? null : parseInt(target.value, 10);

		if (newValue != null && !Number.isNaN(newValue)) {
			const location = allLocations.find((loc) => Number(loc.id) === newValue);
			if (location) {
				await ecoCounterProvider.setSelectedLocation(location);
			}
		} else {
			await ecoCounterProvider.setSelectedLocation(null);
		}
	}

	const dailyStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.monthlyData || !selectedLocation?.travelModes) {
			return [{ label: 'daily count', value: '0' }];
		}

		const currentMode = ecoCounterProvider.selectedMode;
		const monthlyData = selectedLocationTimeSeriesData.monthlyData[currentMode];

		if (!monthlyData || monthlyData.length === 0) {
			return [{ label: 'daily count', value: '0' }];
		}

		const last12Months = monthlyData.slice(-12);
		const totalLast12Months = last12Months.reduce((sum, month) => sum + month.value, 0);
		const dailyAverage = Math.round(totalLast12Months / 365);

		return [{ label: 'daily count', value: dailyAverage.toLocaleString() }];
	});

	const changeStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.monthlyData || !selectedLocation?.travelModes) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const currentMode = ecoCounterProvider.selectedMode;
		const monthlyData = selectedLocationTimeSeriesData.monthlyData[currentMode];

		if (!monthlyData || monthlyData.length < 24) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const recentYear = monthlyData.slice(-12);
		const previousYear = monthlyData.slice(-24, -12);
		const currentYearTotal = recentYear.reduce((sum, month) => sum + month.value, 0);
		const previousYearTotal = previousYear.reduce((sum, month) => sum + month.value, 0);

		if (previousYearTotal === 0) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const percentageChange = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
		const formattedChange =
			percentageChange >= 0 ? `+${percentageChange.toFixed(1)}%` : `${percentageChange.toFixed(1)}%`;

		return [{ label: 'change', value: formattedChange }];
	});
</script>

<div class="info-panel">
	<div class="panel-header">
		<div class="header-inline">
			<span class="area-label">Eco-Counter data for</span>

			<select
				id="eco-location-select"
				class="location-dropdown"
				value={locationSelectValue}
				onchange={handleLocationChange}
			>
				{#each availableLocations as location}
					<option value={location.value == null ? 'null' : String(location.value)}>
						{location.label}
					</option>
				{/each}
			</select>
		</div>
	</div>

	{#if loadError}
		<p class="status-msg error">{loadError}</p>
	{:else if isLoading}
		<p class="status-msg">Loading eco-counter data…</p>
	{:else if !selectedLocation}
		{#if networkView?.kpis}
			<div class="cards-container">
				<DataCardSingle
					title="Total counts"
					stats={[
						{
							label: 'daily count',
							value: Math.round(networkView.kpis.avgDailyCount).toLocaleString()
						}
					]}
					explanation="Most recent complete UTC-day total across all induction-loop sites for the selected mode."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
				<DataCardSingle
					title="Busiest day (last 30 days)"
					stats={[
						ecoNetworkDailyLoading
							? { label: '', value: 'Loading...' }
							: {
									label:
										networkView.kpis.busiestDayTotal != null
											? `${networkView.kpis.busiestDayTotal.toLocaleString()} daily count`
											: '— daily count',
									value: networkView.kpis.busiestDayLabel ?? '—'
								}
					]}
					explanation="Calendar day (UTC) in the rolling last 30 days when the sum of counts for the selected mode across all active induction-loop sites was highest (from merged daily Eco-Counter history)."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
			</div>

			<div class="citywide-sensor-chart-wrap">
				<VivacityCitywideSensorBars
					items={networkView.countsBySensorBars || []}
					barColor={seriesColor}
					onSelectSensor={handleBarChartSiteSelect}
					explanation="Estimated volume per site for the selected mode over roughly one month (average daily traffic × 30), from Eco-Counter last-month ADT. Bars are scaled to the busiest site. Click a row to open that site on the map and in the detail view."
				/>
				<VivacityCitywideMonthlyChart
					items={networkView.monthlyNetworkBars || []}
					barColor={seriesColor}
					explanation="Total counts for the selected travel mode summed across all active induction-loop sites, by calendar month (last twelve months). Values normally come from Eco-Counter monthly aggregated history (~3-year window per site); if that endpoint returns nothing usable, the same chart is built by summing daily raw counts over a longer window (~14 months of days) instead."
				/>
			</div>
		{:else}
			<p class="status-msg">Network overview is not available for this mode.</p>
		{/if}
	{:else if ecoTimeSeriesLoading}
		<p class="status-msg">Loading site data…</p>
	{:else if !selectedLocationTimeSeriesData}
		<div class="no-data">
			<p>Eco-counter data is currently not available for the selected location. Please try another.</p>
		</div>
	{:else}
		{#if dailyStats[0].value != '0'}
			<div class="cards-container">
				<DataCardSingle
					title="Counts"
					stats={dailyStats}
					explanation="The average daily count of pedestrians or cyclists recorded at this induction sensor over the last year."
					mode={selectedMode}
				/>

				<DataCardSingle
					title="Percentage change"
					stats={changeStats}
					explanation="The percentage change in total counts between the last 12 months and the previous 12 months."
					mode={selectedMode}
				/>
			</div>
		{/if}

		{#if selectedLocation?.travelModes}
			{#if selectedLocation.travelModes.includes('pedestrian') && selectedMode == 'pedestrian'}
				<EcoCounterTimeSeries
					travelMode="pedestrian"
					chartType="hourly"
					title="Counts by hour"
					explanation="The average daily counts of pedestrians or cyclists recorded at this induction sensor over the last 30 days, by hour."
				/>
				<EcoCounterTimeSeries
					travelMode="pedestrian"
					chartType={detailPeriod}
					title={detailPeriod === 'weekly' ? 'Counts by week' : 'Counts by month'}
					titleClickable={true}
					underlineWord={detailPeriod === 'weekly' ? 'week' : 'month'}
					onTitleClick={toggleDetailPeriod}
					explanation={
						detailPeriod === 'weekly'
							? 'The total weekly counts of pedestrians or cyclists recorded at this induction sensor over the last year.'
							: 'The total monthly counts of pedestrians or cyclists recorded at this induction sensor over the last 2 years.'
					}
				/>
			{/if}

			<div class="time-series-container">
				{#if selectedLocation.travelModes.includes('bike') && selectedMode == 'bike'}
					<EcoCounterTimeSeries
						travelMode="bike"
						chartType="hourly"
						title="Counts by hour"
						explanation="The average counts by hour over the last 30 days"
					/>
					<EcoCounterTimeSeries
						travelMode="bike"
						chartType={detailPeriod}
						title={detailPeriod === 'weekly' ? 'Counts by week' : 'Counts by month'}
						titleClickable={true}
						underlineWord={detailPeriod === 'weekly' ? 'week' : 'month'}
						onTitleClick={toggleDetailPeriod}
						explanation={
							detailPeriod === 'weekly'
								? 'The total weekly counts of cyclists recorded at this induction sensor over the last year.'
								: 'Monthly counts over the last 2 years'
						}
					/>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.status-msg {
		margin: 0;
		padding: 12px 0;
		font-size: 15px;
		color: #444;
	}

	.status-msg.error {
		color: #b91c1c;
	}

	.citywide-sensor-chart-wrap {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

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

	.panel-header {
		flex-shrink: 0;
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
		background: #eef2f6;
		color: #000;
		border: 0px solid #e5e5e5;
		border-radius: 0px;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: border-color 0.2s ease;
		border-bottom: 1px solid #000;
		max-width: 330px;
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
