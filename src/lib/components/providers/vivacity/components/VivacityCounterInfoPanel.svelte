<script>
	import { getContext } from 'svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	import VivacityCounterTimeSeries from './VivacityCounterTimeSeries.svelte';
	import VivacityCitywideSensorBars from './VivacityCitywideSensorBars.svelte';
	import VivacityCitywideMonthlyChart from './VivacityCitywideMonthlyChart.svelte';
	import { getVivacityCounterColor } from '../../../../utils/vivacity-counter/vivacity-counter-colors.js';

	const vivacityCounterProvider = getContext('vivacityCounterProvider');

	const data = $derived(vivacityCounterProvider?.data || []);
	const allLocations = $derived(vivacityCounterProvider?.allLocations || []);
	const selectedLocation = $derived(vivacityCounterProvider?.selectedLocation);
	const selectedLocationId = $derived(vivacityCounterProvider?.selectedLocationId);
	const selectedLocationTimeSeriesData = $derived(vivacityCounterProvider?.selectedLocationTimeSeriesData);
	const selectedMode = $derived(vivacityCounterProvider?.selectedMode);
	const citywideView = $derived(vivacityCounterProvider?.citywideView);
	const citywideError = $derived(vivacityCounterProvider?.citywideError);
	const citywideLoading = $derived(vivacityCounterProvider?.citywideLoading);

	const seriesColor = $derived.by(
		() => getVivacityCounterColor(selectedMode === 'bike' ? 'bike' : 'pedestrian') ?? '#CC3311'
	);
	let detailPeriod = $state('weekly');

	function toggleDetailPeriod() {
		detailPeriod = detailPeriod === 'weekly' ? 'monthly' : 'weekly';
	}

	let availableLocations = $derived.by(() => {
		if (!data || data.length === 0) return [];

		const locations = data
			.filter((location) => location.travelModes && location.travelModes.includes(selectedMode))
			.map((location) => ({
				value: location.id,
				label: location.name,
				id: location.id
			}))
			.sort((a, b) => a.label.localeCompare(b.label));

		return [{ value: null, label: 'All Dublin — overview', id: null }, ...locations];
	});

	async function handleBarChartSensorSelect(sensorId) {
		const location = allLocations.find((loc) => String(loc.id) === String(sensorId));
		if (location) {
			await vivacityCounterProvider.setSelectedLocation(location);
		}
	}

	async function handleLocationChange(event) {
		const target = event.target;
		const newValue = target.value === 'null' ? null : target.value;

		if (newValue) {
			const location = data.find((loc) => String(loc.id) === String(newValue));
			if (location) {
				await vivacityCounterProvider.setSelectedLocation(location);
			}
		} else {
			await vivacityCounterProvider.setSelectedLocation(null);
		}
	}

	const dailyStats = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.summary || !selectedLocation?.travelModes) {
			return [{ label: 'detected traffic', value: '0' }];
		}

		const currentMode = vivacityCounterProvider.selectedMode;
		const dataString = currentMode === 'pedestrian' ? 'pedestrianPercentage' : 'cyclistPercentage';

		return [{ label: 'share of traffic', value: selectedLocationTimeSeriesData.summary[dataString].toFixed(1) + '%' }];
	});

	const dailyTotals = $derived.by(() => {
		if (!selectedLocationTimeSeriesData || !selectedLocationTimeSeriesData.summary || !selectedLocation?.travelModes) {
			return [{ label: 'daily count', value: '0' }];
		}

		const currentMode = vivacityCounterProvider.selectedMode;
		const dataString = currentMode === 'pedestrian' ? 'totalPedestrianCount' : 'totalCyclistCount';

		return [
			{
				label: 'daily count',
				value: Math.round(selectedLocationTimeSeriesData.summary[dataString] / 30).toLocaleString()
			}
		];
	});

</script>

<div class="info-panel">
	<div class="panel-header">
		<div class="header-inline">
			<span class="area-label">Vivacity sensor data for</span>

			<select
				id="vivacity-location-select"
				class="location-dropdown"
				value={selectedLocationId ?? 'null'}
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

	{#if !selectedLocation}
		{#if citywideLoading}
			<p class="status-msg">Loading citywide counts…</p>
		{:else if citywideError}
			<p class="status-msg error">{citywideError}</p>
		{:else if citywideView?.kpis}
			<div class="cards-container">
				<DataCardSingle
					title="Total counts"
					stats={[
						{
							label: 'daily count',
							value: Math.round(citywideView.kpis.avgDailyCount).toLocaleString()
						}
					]}
					explanation="Average daily count for the selected mode across all Dublin Vivacity sensors, estimated from the last four weekly buckets in the offline snapshot (total ÷ 28 days)."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
				<DataCardSingle
					title="Percentage change"
					stats={[
						{
							label: citywideView.kpis.yoyPeriodLabel ?? '—',
							value: citywideView.kpis.yoyFormatted ?? 'N/A'
						}
					]}
					explanation="Year-on-year change in network totals for the last completed calendar month vs the same month one year earlier. Only sensors with counts greater than zero in both months are included."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
			</div>

			<div class="citywide-sensor-chart-wrap">
				<VivacityCitywideSensorBars
					items={citywideView.countsBySensorBars || []}
					barColor={seriesColor}
					onSelectSensor={handleBarChartSensorSelect}
					explanation="Total counts for the selected travel mode at each Dublin Vivacity sensor over the last four complete weeks, from the offline weekly snapshot. Click a row to open that sensor."
				/>
				<VivacityCitywideMonthlyChart
					items={citywideView.monthlyNetworkBars || []}
					barColor={seriesColor}
					explanation="Network totals for the selected travel mode by calendar month (last twelve complete months), summed across all sensors from the offline weekly snapshot."
				/>
			</div>
		{:else}
			<p class="status-msg">Citywide data is not available yet.</p>
		{/if}
	{:else}
		{#if dailyStats[0].value != '0'}
			<div class="cards-container">
				<DataCardSingle
					title="Counts"
					stats={dailyTotals}
					explanation="Average daily count over the last 30 days from live hourly Vivacity API data (pedestrian or cycling modes only)."
					mode={selectedMode ? selectedMode : 'walking'}
				/>

				<DataCardSingle
					title="Share of traffic"
					stats={dailyStats}
					explanation="Walking or cycling as a percentage of total traffic at this sensor over the last 30 days (from live hourly Vivacity API)."
					mode={selectedMode ? selectedMode : 'walking'}
				/>
			</div>
		{/if}

		{#if selectedLocationTimeSeriesData}
			{#if selectedLocation?.travelModes}
				{#if selectedLocation.travelModes.includes('pedestrian') && selectedMode == 'pedestrian'}
					<div class="time-series-container sensor-detail-charts">
						<VivacityCounterTimeSeries
							travelMode="pedestrian"
							chartType="hourly"
							title="Counts by hour"
							explanation="Average pedestrian counts by hour of day over roughly the last 30 days from this sensor (aggregated across its countlines)."
						/>

						<VivacityCounterTimeSeries
							travelMode="pedestrian"
							chartType={detailPeriod}
							title={detailPeriod === 'weekly' ? 'Counts by week' : 'Counts by month'}
							titleClickable={true}
							underlineWord={detailPeriod === 'weekly' ? 'week' : 'month'}
							onTitleClick={toggleDetailPeriod}
							explanation={
								detailPeriod === 'weekly'
									? 'Weekly totals for this sensor from the offline weekly snapshot (current incomplete week excluded).'
									: 'Monthly totals for this sensor, rolled up from the offline weekly snapshot (current incomplete month excluded).'
							}
						/>
					</div>
				{/if}

				{#if selectedLocation.travelModes.includes('bike') && selectedMode == 'bike'}
					<div class="time-series-container sensor-detail-charts">
						<VivacityCounterTimeSeries
							travelMode="bike"
							chartType="hourly"
							title="Counts by hour"
							explanation="Average cycling counts by hour of day over roughly the last 30 days from this sensor (pedestrian and cycle modes are separate views)."
						/>

						<VivacityCounterTimeSeries
							travelMode="bike"
							chartType={detailPeriod}
							title={detailPeriod === 'weekly' ? 'Counts by week' : 'Counts by month'}
							titleClickable={true}
							underlineWord={detailPeriod === 'weekly' ? 'week' : 'month'}
							onTitleClick={toggleDetailPeriod}
							explanation={
								detailPeriod === 'weekly'
									? 'Weekly totals for this sensor from the offline weekly snapshot (current incomplete week excluded).'
									: 'Monthly totals for this sensor, rolled up from the offline weekly snapshot (current incomplete month excluded).'
							}
						/>
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</div>

<style>
	.status-msg {
		padding: 12px 0;
		color: #444;
		font-size: 15px;
	}

	.status-msg.error {
		color: #b91c1c;
	}

	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: 100%;
	}

	.time-series-container {
		padding-bottom: 20px;
		margin-bottom: 20px;
	}

	.sensor-detail-charts {
		display: flex;
		flex-direction: column;
		gap: 20px;
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
		max-width: 303px;
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

	.citywide-sensor-chart-wrap {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
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
		}
	}
</style>
