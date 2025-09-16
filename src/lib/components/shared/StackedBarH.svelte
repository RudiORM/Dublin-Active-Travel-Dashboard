<script>
	// Props
	let { 
		data = [],  // Array of { label: string, value: number, color?: string }
		height = 40,
		borderRadius = 4,
		showLabels = true,
		labelPosition = 'inside' // 'inside' or 'outside'
	} = $props();

	// Calculate total value for percentage calculations
	const total = $derived(data.reduce((sum, item) => sum + item.value, 0));

	// Generate default colors if not provided
	const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

	// Process data with percentages and colors
	const processedData = $derived(data.map((item, index) => ({
		...item,
		percentage: total > 0 ? (item.value / total) * 100 : 0,
		color: item.color || defaultColors[index % defaultColors.length]
	})));

	// Filter out items with 0 or very small values for display
	const visibleData = $derived(processedData.filter(item => item.percentage >= 0.5));
</script>

<div class="stacked-bar-container">
	<div 
		class="stacked-bar" 
		style="height: {height}px; border-radius: {borderRadius}px;"
	>
		{#each visibleData as segment}
			<div 
				class="bar-segment" 
				style="
					width: {segment.percentage}%; 
					background-color: {segment.color};
					{segment === visibleData[0] ? `border-top-left-radius: ${borderRadius}px; border-bottom-left-radius: ${borderRadius}px;` : ''}
					{segment === visibleData[visibleData.length - 1] ? `border-top-right-radius: ${borderRadius}px; border-bottom-right-radius: ${borderRadius}px;` : ''}
				"
				title="{segment.label}: {segment.value} ({segment.percentage.toFixed(1)}%)"
			>
				{#if showLabels && labelPosition === 'inside' && segment.percentage > 8}
					<span class="segment-label inside">
						{segment.label}
					</span>
				{/if}
			</div>
		{/each}
	</div>

	{#if showLabels && labelPosition === 'outside'}
		<div class="labels-grid">
			{#each visibleData as segment}
				<div class="label-item">
					<div 
						class="label-color-indicator" 
						style="background-color: {segment.color};"
					></div>
					<span class="label-text">
						{segment.label}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.stacked-bar-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stacked-bar {
		width: 100%;
		display: flex;
		overflow: hidden;
	}

	.bar-segment {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}



	.segment-label.inside {
		color: white;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 4px;
	}

	.labels-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 8px;
		margin-top: 8px;
		width: 100%;
	}

	.label-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.label-color-indicator {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.label-text {
		font-size: 12px;
		color: #374151;
		font-weight: 400;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.segment-label.inside {
			font-size: 10px;
		}

		.label-text {
			font-size: 11px;
		}

		.labels-grid {
			gap: 6px;
		}
	}
</style>
