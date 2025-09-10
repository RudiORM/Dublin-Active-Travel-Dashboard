<script>
	// Props passed from parent
	let { 
		reshapedData,
		selectedMode,
		selectedPlace,
		selectedYear,
		selectedArea
	} = $props();

	// Reactive computed values using runes
	const currentStats = $derived(reshapedData[`${selectedMode}_${selectedPlace}_${selectedYear}`]);

	const selectedAreaData = $derived(selectedArea && currentStats ? currentStats[selectedArea] : null);
	const totalStats = $derived(currentStats ? currentStats['_TOTAL'] : null);
</script>

<div class="info-panel">
	<div class="panel-header">
		<h3>Census Data</h3>
		<div class="current-filters">
			<span class="filter-tag">{selectedMode}</span>
			<span class="filter-tag">{selectedPlace.replace('_', ' ')}</span>
			<span class="filter-tag">{selectedYear}</span>
		</div>
	</div>

	{#if totalStats}
	{console.log($state.snapshot(totalStats))}
		<div class="stats-section">
			<h4>Overall Statistics</h4>
			<div class="stat-grid">
				<div class="stat-item">
					<span class="stat-label">Total Count</span>
					<span class="stat-value">{totalStats.raw.toLocaleString()}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Average %</span>
					<span class="stat-value">{totalStats.averagePercentage.toFixed(1)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Areas</span>
					<span class="stat-value">{totalStats.areaCount}</span>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedArea && selectedAreaData}
		<div class="selected-area-section">
			<h4>Selected Area: {selectedArea}</h4>
			<div class="stat-grid">
				<div class="stat-item">
					<span class="stat-label">Count</span>
					<span class="stat-value">{selectedAreaData.raw.toLocaleString()}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Percentage</span>
					<span class="stat-value">{selectedAreaData.percentage.toFixed(2)}%</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Total Population</span>
					<span class="stat-value">{selectedAreaData.total.toLocaleString()}</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="no-selection">
			<p>Click on an area on the map to see detailed statistics</p>
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

	.panel-header {
		border-bottom: 1px solid #eee;
		padding-bottom: 15px;
	}

	.panel-header h3 {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 20px;
	}

	.current-filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.filter-tag {
		background: #f0f0f0;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: #666;
		text-transform: capitalize;
	}

	.stats-section,
	.selected-area-section {
		background: #f9f9f9;
		padding: 15px;
		border-radius: 6px;
	}

	.stats-section h4,
	.selected-area-section h4 {
		margin: 0 0 15px 0;
		color: #333;
		font-size: 16px;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-label {
		font-size: 12px;
		color: #666;
		text-transform: uppercase;
		font-weight: 500;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 600;
		color: #333;
	}

	.no-selection {
		text-align: center;
		color: #666;
		font-style: italic;
		padding: 40px 20px;
	}

	.no-selection p {
		margin: 0;
	}
</style>
