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
	const maxTotal = 110000

	// Calculate nice round numbers for y-axis
	const yAxisValues = $derived.by(() => {
		// Add 5% padding to prevent cutoff
		const paddedMax = maxTotal * 1.05;
		
		// Round up to nearest nice number
		const magnitude = Math.pow(10, Math.floor(Math.log10(paddedMax)));
		const normalized = paddedMax / magnitude;
		let niceMax = 120000;
		
		
		
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

	// Calculate minimum width needed for all bars
	const minWidthNeeded = $derived.by(() => {
		const numBars = processedData.length;
		const gapWidth = Math.max(0, numBars - 1) * 4; // 4px gap between bars
		return (numBars * 20) + gapWidth; // 20px per bar + gaps
	});

	// Format numbers for y-axis labels
	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
		return num.toString();
	};
</script>

<div class="time-series-container">
	<div class="chart-wrapper">
		<!-- Y-axis -->
	

		<!-- Chart area -->
		<div class="chart-container">
			<!-- Grid lines -->
			

			<!-- Bars -->
			<div class="bars-container" style="min-width: {minWidthNeeded}px;">

				<!-- <div class="y-axis">
					{#each yAxisValues.slice().reverse() as value, i}
						<div class="y-axis-label" style="bottom: {((yAxisValues.length - 1 - i) / (yAxisValues.length - 1)) * 100}%">
							{formatNumber(value)}
						</div>
					{/each}
				</div> -->


				<div class="grid-lines" >
					{#each yAxisValues as value, i}
						<div 
							class="grid-line" 
							style="bottom: calc({(i / (yAxisValues.length - 1)) * 100}% - 1px); "
						></div>

						<div class="y-axis-label" style="bottom: {(i / (yAxisValues.length - 1)) * 100}%">
							{formatNumber(value)}
						</div>


					{/each}
				</div>
				{#each processedData as yearData, index}
					<div class="year-column">
						<div 
							class="stacked-bar-vertical" 
							style="height: {(yearData.total / scaleMax) * 100}%;"
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

	.y-axis {
		width: 45px;
		position: relative;
		flex-shrink: 0;
		/* Align with chart area */
		padding-bottom: 30px; /* Space for year labels */
		box-sizing: border-box;
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

	.chart-container {
		position: relative;
		flex: 1;
		height: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		/* Add padding to match y-axis */
		padding-bottom: 10px;
		padding-top: 10px;
		box-sizing: border-box;
	}

	.grid-lines {
		position: absolute;
		top: 0px;
		left: 0;
		bottom: 0px; /* Stop at year labels */
		width: 100%;
		pointer-events: none;
		overflow: hidden;
	}

	.grid-line {
		position: absolute;
		left: 0;
		height: .5px;
		background-color: #000;
		width: 100vw;
	}

	.grid-line:first-child {
		height: 2px;
	}

	.bars-container {
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		height: calc(100% - 30px); /* Account for year labels */
		gap: 3.2px;
		width: 100%;
		box-sizing: border-box;
		position: relative;
		padding-left: 35px; /* Shift all bars to the right to make room for y-axis labels */
	}

	.year-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		flex: 1 1 20px;
		min-width: 24px;
		height: 100%;
	}

	.stacked-bar-vertical {
		width: 100%;
		display: flex;
		flex-direction: column-reverse;
		overflow: hidden;
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
		bottom: -20px; /* Position below bars */
	}

	@media (max-width: 1300px) {
		.grid-lines {
			width: 120%;
		}
	}

	@media (max-width: 950px) {
		.grid-lines {
			width: 100%;
		}
	}


	@media (max-width: 850px) {
		.grid-lines {
			width: 120%;
		}
	}


	

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.bars-container {
			gap: 4px;
		}

		.grid-lines {
			width: 100vw;
		}

		.grid-line {
			width: 100vw;
			overflow: visible;
		}



		.year-label {
			font-size: 12px;
		}

	

	
	}
</style>