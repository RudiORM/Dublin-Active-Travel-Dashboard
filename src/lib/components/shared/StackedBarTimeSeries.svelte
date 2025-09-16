<script lang="ts">
	import { getCordonPrimaryColor } from '$lib/utils/cordon/cordon-colors.js';

	// Props
	let { 
		data = [],  // Array of { year: string, values: { [mode]: number } }
		height = 300,
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

	// Generate default colors using cordon color scheme
	const defaultColors: ColorMap = {
		walking: getCordonPrimaryColor('walking'),
		cycling: getCordonPrimaryColor('cycling'), 
		cars: getCordonPrimaryColor('cars'),
		motorcycles: getCordonPrimaryColor('motorcycles'),
		taxis: getCordonPrimaryColor('taxis'),
		hgvs: getCordonPrimaryColor('hgvs'),
		bus: getCordonPrimaryColor('bus')
	};

	// Get all unique modes across all years
	const allModes = $derived.by(() => {
		const modes = new Set<string>();
		data.forEach((yearData: YearData) => {
			Object.keys(yearData.values || {}).forEach(mode => modes.add(mode));
		});
		return Array.from(modes).sort();
	});

	// Process data for each year
	const processedData = $derived.by(() => {
		return data.map((yearData: YearData) => {
			const yearValues = yearData.values || {};
			const total = Object.values(yearValues).reduce((sum, val) => sum + (val || 0), 0);
			
			const segments = allModes.map(mode => {
				const value = yearValues[mode] || 0;
				return {
					mode,
					value,
					percentage: total > 0 ? (value / total) * 100 : 0,
					color: defaultColors[mode] || '#9CA3AF'
				};
			}).filter(segment => segment.value > 0);

			return {
				year: yearData.year,
				total,
				segments
			};
		});
	});

	// Get maximum total for consistent scaling
	const maxTotal = $derived.by(() => {
		return Math.max(...processedData.map(d => d.total), 1);
	});

	// Calculate minimum width needed for all bars
	const minWidthNeeded = $derived.by(() => {
		const numBars = processedData.length;
		const gapWidth = Math.max(0, numBars - 1) * 4; // 4px gap between bars
		return (numBars * 20) + gapWidth; // 20px per bar + gaps
	});
</script>

<div class="time-series-container">
	<div class="chart-container" style="height: {height}px;">
		<div class="bars-container" style="min-width: {minWidthNeeded}px;">
			{#each processedData as yearData, index}
				<div class="year-column">
					<div 
						class="stacked-bar-vertical" 
						style="
							height: {(yearData.total / maxTotal) * (height - 60)}px;
						"
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

<style>
	.time-series-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 100%;
		overflow-x: auto;
		overflow-y: visible;
	}

	.chart-container {
		position: relative;
		width: 100%;
		overflow: visible;
	}

	.bars-container {
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		height: 100%;
		gap: 4px;
		padding: 20px 0 30px 0;
		width: 100%;
	}

	.year-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1 1 20px;
		min-width: 20px;
	}

	.stacked-bar-vertical {
		width: 100%;
		display: flex;
		flex-direction: column-reverse;
		overflow: hidden;
		margin-bottom: 8px;
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
		margin-top: 4px;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.bars-container {
			gap: 4px;
		}

		.year-label {
			font-size: 10px;
		}
	}
</style>
