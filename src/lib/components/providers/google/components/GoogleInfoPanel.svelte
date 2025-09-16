<script>

	import StackedBarH from '$lib/components/shared/StackedBarH.svelte';

	// Props passed from parent
	let { 
		reshapedData,
		selectedMode,
		selectedMetric,
		selectedScope,
		selectedArea
	} = $props();

	// Reactive computed values using runes
	const selectedAreaData = $derived(
		selectedArea && reshapedData.byArea?.[selectedArea]?.[selectedMode]?.[selectedMetric]?.[selectedScope] || null
	);
	const totalStats = $derived(
		reshapedData.totals?.[selectedMode]?.[selectedMetric]?.[selectedScope] || null
	);
</script>

<div class="info-panel">
	<div class="panel-header">
		<h3>Active Transport Share</h3>
		<div class="current-filters">
			<span class="filter-tag">{selectedMode} trips</span>
			<span class="filter-tag">{selectedScope} scope</span>
			<span class="filter-tag">% of total</span>
		</div>
	</div>

	{#if totalStats}
		<div class="stats-section">
			<h4>Overall Statistics</h4>
			<div class="stat-grid">
				<div class="stat-item">
					<span class="stat-label">Total {selectedMode} trips</span>
					<span class="stat-value">{totalStats.formatted}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Share of all trips</span>
					<span class="stat-value">{totalStats.formattedPercentage}</span>
				</div>
			</div>

			<StackedBarH 
  data={[
    { label: 'Cycling', value: 25, color: '#3B82F6' },
    { label: 'Walking', value: 15, color: '#10B981' },
    { label: 'Driving', value: 60, color: '#EF4444' }
  ]}
  height={50}
  showLabels={true}
  labelPosition="outside"
/>


		</div>
	{/if}

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

	.percentage-section {
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px solid #ddd;
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
