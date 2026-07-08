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

		if (!monthlyData || monthlyData.length < 1) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const parseMonth = (dateStr) => {
			const parts = String(dateStr).split('/');
			if (parts.length !== 3) return null;
			const month = Number(parts[1]);
			const year = Number(parts[2]);
			if (!Number.isFinite(month) || !Number.isFinite(year)) return null;
			return { month, year };
		};

		const lastMonth = monthlyData[monthlyData.length - 1];
		const lastParsed = parseMonth(lastMonth.date);
		if (!lastParsed) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const priorMonth = monthlyData.find((row) => {
			const p = parseMonth(row.date);
			return p && p.month === lastParsed.month && p.year === lastParsed.year - 1;
		});

		if (!priorMonth || priorMonth.value === 0) {
			return [{ label: 'change', value: 'N/A' }];
		}

		const percentageChange = ((lastMonth.value - priorMonth.value) / priorMonth.value) * 100;
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
					explanation="Average daily count for the selected mode across all active sites, estimated from the last four weekly buckets in the offline snapshot (total ÷ 28 days)."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
				<DataCardSingle
					title="Percentage change"
					stats={[
						ecoNetworkDailyLoading
							? { label: '', value: 'Loading...' }
							: {
									label: networkView.kpis.yoyPeriodLabel ?? '—',
									value: networkView.kpis.yoyFormatted ?? 'N/A'
								}
					]}
					explanation="Year-on-year change in network totals for the last completed calendar month vs the same month one year earlier. Only sites with counts greater than zero in both months are included."
					mode={selectedMode === 'bike' ? 'bike' : 'pedestrian'}
				/>
			</div>

			<div class="citywide-sensor-chart-wrap">
				<VivacityCitywideSensorBars
					items={networkView.countsBySensorBars || []}
					barColor={seriesColor}
					onSelectSensor={handleBarChartSiteSelect}
					explanation="Total counts for the selected travel mode at each induction-loop site over the last four weeks, from the offline weekly snapshot (sum of the most recent weekly buckets per site). Bars are scaled to the busiest site. Click a row to open that site."
				/>
				<VivacityCitywideMonthlyChart
					items={networkView.monthlyNetworkBars || []}
					barColor={seriesColor}
					explanation="Network totals for the selected travel mode by calendar month (last twelve months), summed across all active sites from the offline weekly snapshot and rolled up from weekly buckets."
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
					explanation="Average daily count over the last year, derived from monthly totals in the offline weekly snapshot."
					mode={selectedMode}
				/>

				<DataCardSingle
					title="Percentage change"
					stats={changeStats}
					explanation="Year-on-year change for the last completed calendar month vs the same month one year earlier (from the offline weekly snapshot)."
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
							? 'Weekly totals for this site from the offline weekly snapshot (~1 year).'
							: 'Monthly totals for this site, rolled up from the offline weekly snapshot.'
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
								? 'Weekly totals for this site from the offline weekly snapshot (~1 year).'
								: 'Monthly totals for this site, rolled up from the offline weekly snapshot.'
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
