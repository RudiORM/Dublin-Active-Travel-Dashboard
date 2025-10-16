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
		style="height: {height+15}px; border-radius: {borderRadius}px; margin: 0 15px; width: calc(100% - 30px);"
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
					<span class="segment-label inside">
						{segment.percentage.toFixed(0)}%
					</span>
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
		display: flex;
		overflow: visible;
	}

	.bar-segment {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		margin-bottom: 25px;

	}



	.segment-label.inside {
		color: black;
		font-size: 14px;
		font-weight: 500;
		padding: 0 8px;
		bottom: 0px;
		position: absolute;
		background-color: #ffffffaa;
		margin-bottom: -25px;
		overflow: visible;
		white-space: nowrap;
	}

	.labels-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
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
		font-size: 14px;
		color: #374151;
		font-weight: 400;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {

		.segment-label.inside{
			font-size: 14px;
		}
		
		.label-text {
			font-size: 14px;
		}

		.labels-grid {
			font-size: 14px;
			gap: 6px;
		}
	}

	@media (max-width: 1200px) {

		.segment-label.inside{
			font-size: 12px;
			margin-bottom: -20px;
		}

		.label-text {
			font-size: 12px;

		}

		.labels-grid {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 6px;
	
	}


		

	}


	@media (max-width: 950px) {

.segment-label.inside{
	font-size: 14px;
	margin-bottom: -25px;
}

.label-text {
	font-size: 14px;

}

}

@media (min-width: 651px) and (max-height: 750px) {

	.segment-label.inside{
	font-size: 14px;
	margin-bottom: -25px;
}

.label-text {
	font-size: 12px;

}

}



</style>
