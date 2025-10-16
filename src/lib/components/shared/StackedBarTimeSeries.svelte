<script lang="ts">
	import { getCordonPrimaryColor } from '$lib/utils/cordon/cordon-colors.js';

	// Props
	let { 
		data = [],  // Array of { year: string, values: { [mode]: number } }
		showLabels = true,
		showYearLabels = true,
	} = $props();

	interface YearData {
		year: string;
		values: Record<string, number>;
	}

	interface ColorMap {
		[key: string]: string;
	}

	// Map individual modes to categories
	const modeToCategory: Record<string, string> = {
		walking: 'walking',
		pedestrians: 'walking',
		cycling: 'cycling',
		cyclists: 'cycling',
		cars: 'automobile',
		'cars / lvgs': 'automobile',
		motorcycles: 'automobile',
		taxis: 'automobile',
		hgvs: 'automobile',
		bus: 'public'
	};

	// Category colors
	const categoryColors: ColorMap = {
		walking: getCordonPrimaryColor('walking'),
		cycling: getCordonPrimaryColor('cycling'),
		automobile: getCordonPrimaryColor('cars'),
		public: getCordonPrimaryColor('bus')
	};

	// Process data for each year, grouping by category
	const processedData = $derived.by(() => {
		return data.map((yearData: YearData) => {
			const yearValues = yearData.values || {};
			
			// Group values by category
			const categoryTotals: Record<string, number> = {
				walking: 0,
				cycling: 0,
				automobile: 0,
				public: 0
			};
			
			// Sum up values by category
			Object.entries(yearValues).forEach(([mode, value]) => {
				const category = modeToCategory[mode.toLowerCase()] || 'automobile';
				categoryTotals[category] += value || 0;
			});
			
			// Calculate total
			const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
			
			// Create segments for non-zero categories
			const segments = Object.entries(categoryTotals)
				.filter(([_, value]) => value > 0)
				.map(([category, value]) => ({
					mode: category,
					value,
					percentage: total > 0 ? (value / total) * 100 : 0,
					color: categoryColors[category] || '#9CA3AF'
				}));

			return {
				year: yearData.year,
				total,
				segments
			};
		});
	});

	// Get maximum total for consistent scaling
	const maxTotal = 110000;

	// Calculate nice round numbers for y-axis
	const yAxisValues = $derived.by(() => {
		// Add 5% padding to prevent cutoff
		const paddedMax = maxTotal * 1.05;
		
		// Round up to nearest nice number
		const magnitude = Math.pow(10, Math.floor(Math.log10(paddedMax)));
		const normalized = paddedMax / magnitude;
		let niceMax = 240000;
		
		// Create 4 values (0, 1/3, 2/3, max)
		return [
			0,
			Math.round(niceMax / 3),
			Math.round(niceMax * 2 / 3),
			Math.round(niceMax)
		];
	});

	// Use the nice max for scaling (same as the highest y-axis value)
	const scaleMax = $derived.by(() => yAxisValues[yAxisValues.length - 1]);

	// Format numbers for y-axis labels
	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
		return num.toString();
	};

	// Tooltip state
	let tooltipVisible = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let tooltipData = $state({ year: '', total: 0, segments: [] });

	// Show tooltip
	function showTooltip(event: MouseEvent | TouchEvent, yearData: any) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
		
		tooltipX = clientX;
		tooltipY = clientY - 10;
		tooltipData = { 
			year: yearData.year, 
			total: yearData.total, 
			segments: yearData.segments 
		};
		tooltipVisible = true;
	}

	// Hide tooltip
	function hideTooltip() {
		tooltipVisible = false;
	}
</script>

<div class="time-series-container">
	<div class="chart-wrapper">
		<!-- Chart area -->
		<div class="chart-container">
			<!-- Bars -->
			<div class="bars-container">
				
				<!-- Grid lines and Y-axis labels -->
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

				<div class="bars-wrapper">
					{#each processedData as yearData, index}
						<div class="year-column">
							<div 
								class="stacked-bar-vertical" 
								style="height: {(yearData.total / scaleMax) * 100}%;"
								onmouseenter={(e) => showTooltip(e, yearData)}
								onmouseleave={hideTooltip}
								ontouchstart={(e) => showTooltip(e, yearData)}
								ontouchend={hideTooltip}
							>
								{#each yearData.segments as segment, segmentIndex}
									<div 
										class="bar-segment-vertical" 
										style="
											height: {segment.percentage}%; 
											background-color: {segment.color};
										"
										title="{segment.mode}: {segment.value.toLocaleString()} ({segment.percentage.toFixed(1)}%)"
									>
									</div>
								{/each}
							</div>
							
							{#if showYearLabels}
								<div class="year-label">
									{yearData.year.slice(2, 4)}
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
			style="left: {tooltipX}px; top: {tooltipY-100}px;"
		>
			<div class="tooltip-content">
				<div class="tooltip-year">Year: {tooltipData.year}</div>
				<div class="tooltiptotal">Total: {tooltipData.total.toLocaleString()}</div>
				{#if tooltipData.segments && tooltipData.segments.length > 0}
					<div class="tooltip-divider"></div>
					{#each tooltipData.segments as segment}
						<div class="tooltip-segment">
							<div class="tooltip-segment-color" style="background-color: {segment.color};"></div>
							<span class="tooltip-segment-label">{segment.mode}:</span>
							<span class="tooltip-segment-value">{segment.value.toLocaleString()}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.time-series-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
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
		height: calc(100% - 30px); /* Account for year labels */
		width: 100%;
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
		gap: 2px;
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

	.year-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		flex: 1 1 0;
		min-width: 12px;
	}

	.stacked-bar-vertical {
		display: flex;
		flex-direction: column-reverse;
		overflow: hidden;
		cursor: pointer;
		width: 100%;
	}

	.bar-segment-vertical {
		width: 100%;
		position: relative;
		transition: opacity 0.2s ease;
	}

	.bar-segment-vertical:hover {
		opacity: 0.8;
	}

	.year-label {
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

	.tooltip-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.3);
		margin: 6px 0;
	}

	.tooltip-segment {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 3px;
		font-size: 11px;
	}

	.tooltip-segment:last-child {
		margin-bottom: 0;
	}

	.tooltip-segment-color {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.tooltip-segment-label {
		font-weight: 500;
		text-transform: capitalize;
		min-width: 60px;
	}

	.tooltip-segment-value {
		font-weight: 600;
		margin-left: auto;
	}



	/* Simplified responsive adjustments */
	@media (max-width: 640px) {
		.year-label {
			font-size: 10px;
		}
		
		.tooltip-content {
			font-size: 11px;
			padding: 6px 10px;
		}
	}
</style>