<script>
	// Props
	let { 
		data = [],  // Array of { date: string, value: number } or { x: number, value: number }
		color = 'black', // Single color for the bars
		showLabels = true,
		height = 200,
		niceMax = 75000,
		date = true, // If true, treat x-axis as dates; if false, treat as numbers

	} = $props();

	// Process data and extract values
	const processedData = $derived.by(() => {
		
		const processed = data.map((item, index) => {
			let displayLabel = '';
			let xValue = '';
			
			if (date) {
				// Date mode - only show labels for start, middle, and end
				if (item.date) {
					xValue = item.date;
					const parts = item.date.split('/');
					
					// Determine which labels to show
					const dataLength = data.length;
					const middleIndex = Math.floor(dataLength / 2);
					
					if (index === 0 || index === middleIndex || index === dataLength - 1) {
						if (parts.length === 3) {
							const day = parts[0];
							const month = parts[1];
							const year = parts[2].slice(-2); // Get last 2 digits of year
							// Format as DD/MM/YY for better readability
							displayLabel = `${day}/${month}/${year}`;
						} else {
							// Fallback to original date if format is different
							displayLabel = xValue;
						}
					}
				}
			} else {
				// Numeric mode - use x value directly
				xValue = item.x || index;
				// Show every nth label to avoid crowding (adjust as needed)
				if (index % Math.ceil(data.length / 10) === 0 || index === data.length - 1) {
					displayLabel = xValue.toString();
				}
			}
			
			return {
				xValue: xValue,
				value: item.value || 0,
				displayLabel: displayLabel
			};
		});
		
		return processed;
	});

	// Get maximum value for scaling
	const maxValue = $derived.by(() => {
		const values = processedData.map(d => d.value);
		const max = Math.max(...values);
		// Add 10% padding to prevent cutoff
		return max * 1.1;
	});

	// Calculate nice round numbers for y-axis
	const yAxisValues = $derived.by(() => {
		if (maxValue === 0) return [0];
		
		// Round up to nearest nice number
		const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
		const normalized = maxValue / magnitude;
		
		
		// Create 4 values (0, 1/3, 2/3, max)
		return [
			0,
			Math.round(niceMax / 3),
			Math.round(niceMax * 2 / 3),
			Math.round(niceMax)
		];
	});

	// Use the nice max for scaling
	const scaleMax = $derived.by(() => {
		return yAxisValues[yAxisValues.length - 1];
	});

	// Fixed chart width and bar calculations
	const chartWidth = 560-60;
	const yAxisPadding = 35; // Space for y-axis labels
	const availableWidth = chartWidth - yAxisPadding;
	
	// Calculate bar width and gap based on the number of data points
	let barWidth = $derived.by(() => {
		if (processedData.length === 0) return 20;
		
		// We want gap = barWidth/8
		// Total width = n * barWidth + (n-1) * gap
		// Total width = n * barWidth + (n-1) * (barWidth/8)
		// Total width = barWidth * (n + (n-1)/8)
		// Total width = barWidth * ((8n + n - 1)/8)
		// Total width = barWidth * ((9n - 1)/8)
		// barWidth = (Total width * 8) / (9n - 1)
		
		const n = processedData.length;
		const calculatedWidth = (availableWidth * 8) / (9 * n - 1);
		
		return Math.max(calculatedWidth, 2); // Minimum 2px width
	});
	
	let gapWidth = $derived.by(() => {
		return barWidth / 8;
	});

	// Format numbers for y-axis labels
	const formatNumber = (num) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
		return num.toString();
	};

	// Tooltip state
	let tooltipVisible = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let tooltipData = $state({ xValue: '', value: 0 });

	// Show tooltip
	function showTooltip(event, dataPoint) {
		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
		
		tooltipX = clientX;
		tooltipY = clientY - 100;
		tooltipData = { 
			xValue: dataPoint.xValue, 
			value: dataPoint.value
		};
		tooltipVisible = true;
	}

	// Hide tooltip
	function hideTooltip() {
		tooltipVisible = false;
	}
</script>

<div class="time-series-container" style="height: {height}px;">
	<div class="chart-wrapper">
		<!-- Chart area -->
		<div class="chart-container">
			<!-- Bars -->
			<div class="bars-container" style="width: {chartWidth}px;">
				
				<!-- Grid lines and Y-axis labels moved inside bars-container -->
				<div class="grid-lines">
					{#each yAxisValues as value, i}
						<div 
							class="grid-line" 
							style="bottom: calc({(i / (yAxisValues.length - 1)) * 100}% - 1px);"
						></div>
						<div class="y-axis-label" style="bottom: {(i / (yAxisValues.length - 1)) * 100}%">
							{formatNumber(value)}
						</div>
					{/each}
				</div>

				<div class="bars-wrapper" style="gap: {gapWidth}px;">
					{#each processedData as dataPoint, index}
						{@const barHeight = scaleMax > 0 ? (dataPoint.value / scaleMax) * 100 : 0}
						<div class="date-column">
							<div 
								class="bar" 
								style="
									height: {barHeight}%;
									background-color: {color};
									width: {barWidth}px;
								"
								title="{dataPoint.xValue}: {dataPoint.value.toLocaleString()}"
								onmouseenter={(e) => showTooltip(e, dataPoint)}
								onmouseleave={hideTooltip}
								ontouchstart={(e) => showTooltip(e, dataPoint)}
								ontouchend={hideTooltip}
							>
							</div>
							
							{#if showLabels}
								<div class="date-label">
									{dataPoint.displayLabel}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Tooltip -->
	{#if tooltipVisible}
		<div 
			class="tooltip" 
			style="left: {tooltipX}px; top: {tooltipY}px;"
		>
			<div class="tooltip-content">
				<div class="tooltip-year">{date ? 'Date' : 'Hour'}: {tooltipData.xValue}</div>
				<div class="tooltip-total">Counts: {tooltipData.value.toLocaleString()}</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.time-series-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		overflow: hidden;
	}

	.chart-wrapper {
		display: flex;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.chart-container {
		position: relative;
		flex: 1;
		height: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		padding-bottom: 10px;
		padding-top: 10px;
		box-sizing: border-box;
	}

	.bars-container {
		height: calc(100% - 30px); /* Account for date labels */
		box-sizing: border-box;
		position: relative;
		padding-left: 35px; /* Space for y-axis labels */
	}

	.bars-wrapper {
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		height: 100%;
		width: 100%;
		box-sizing: border-box;
	}

	.grid-lines {
		position: absolute;
		top: 0px;
		left: 0;
		bottom: 0px;
		width: 100%;
		pointer-events: none;
		overflow: hidden;
	}

	.grid-line {
		position: absolute;
		left: 0;
		height: .5px;
		background-color: #000;
		width: 100%;
	}

	.grid-line:first-child {
		height: 2px;
	}

	.y-axis-label {
		position: absolute;
		left: 0px;
		transform: translateY(200%);
		font-size: 12px;
		color: #000;
		text-align: right;
		white-space: nowrap;
		margin-top: 10px;
		margin-bottom: 10px;
	}

	.date-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		flex-shrink: 0;
	}

	.bar {
		min-height: 2px; /* Minimum height for very small values */
		transition: opacity 0.2s ease;
		border-radius: 2px 2px 0 0;
		opacity: 1;
		z-index: 2;
	}

	.bar:hover {
		opacity: 1;
		cursor: pointer;
	}

	.date-label {
		font-size: 12px;
		color: #6B7280;
		font-weight: 500;
		text-align: center;
		margin-top: 8px;
		flex-shrink: 0;
		position: absolute;
		bottom: -20px;
		white-space: nowrap;
	}

	/* Tooltip styles */
	.tooltip {
		position: fixed;
		z-index: 1000;
		pointer-events: none;
		transform: translateX(-50%);
	}

	.tooltip-content {
		background: rgba(0, 0, 0, 0.9);
		color: white;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 12px;
		line-height: 1.4;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		white-space: nowrap;
	}

	.tooltip-year {
		font-weight: 500;
		margin-bottom: 2px;
	}

	.tooltip-total {
		font-weight: 400;
		opacity: 0.9;
	}

	/* Simplified responsive adjustments */
	@media (max-width: 640px) {
		.date-label {
			font-size: 10px;
		}
		
		.tooltip-content {
			font-size: 11px;
			padding: 6px 10px;
		}
	}
</style>