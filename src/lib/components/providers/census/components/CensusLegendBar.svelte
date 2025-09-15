<script>
	import { colorSchemes, generateColorStops } from '$lib/utils/census/census-colors.js';

	// Props
	let { 
		selectedMode = $bindable('cycling'),
		selectedPlace = $bindable('work'),
		selectedYear = $bindable('2022'),
		selectedFilter = $bindable('all'),
		onFilterChange = () => {},
		censusContext
	} = $props();

	// Calculate min/max percentages from actual data (same logic as the map)
	const dataRange = $derived.by(() => {
		if (!censusContext?.reshapedData) return { minPercentage: 0, maxPercentage: 25 };
		
		const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
		const statData = censusContext.reshapedData[statKey];
		
		if (!statData) return { minPercentage: 0, maxPercentage: 25 };
		
		// Get min and max values for the selected statistic (using percentages)
		const percentages = Object.keys(statData)
			.filter(key => key !== '_TOTAL')
			.map(areaName => statData[areaName].percentage);
		
		if (percentages.length === 0) return { minPercentage: 0, maxPercentage: 25 };
		
		const maxPercentage = Math.max(...percentages);
		const minPercentage = Math.min(...percentages);
		
		return { minPercentage, maxPercentage };
	});

	// Generate filter options dynamically based on actual data range
	const filterOptions = $derived.by(() => {
		const colors = colorSchemes[selectedMode] || colorSchemes.cycling;
		const { minPercentage, maxPercentage } = dataRange;
		
		// Generate color stops using the same logic as the map
		const colorStops = generateColorStops(selectedMode, minPercentage, maxPercentage);
		
		// Create legend items: "All" plus one for each color stop
		const options = [
			{ value: 'all', label: 'All', color: null }
		];
		
		// Add items for each color stop
		colorStops.forEach((stop, index) => {
			const [value, color] = stop;
			const percentage = Math.round(value * 10) / 10; // Round to 1 decimal place
			options.push({
				value: value.toString(),
				label: `${percentage.toFixed(0)}%`,
				color: color
			});
		});
		
		return options;
	});

	function selectFilter(filterValue) {
		selectedFilter = filterValue;
		updateMapFilter();
		onFilterChange();
	}

	function updateMapFilter() {
		if (!censusContext?.map || !censusContext?.reshapedData) return;
		
		const map = censusContext.map;
		const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
		const statData = censusContext.reshapedData[statKey];
		
		if (!statData) return;
		
		if (selectedFilter === 'all') {
			// Show all areas at full opacity
			map.setPaintProperty('census-choropleth', 'fill-opacity', 0.95);
		} else {
			// Filter based on selected percentage range
			const selectedValue = parseFloat(selectedFilter);
			const { minPercentage, maxPercentage } = dataRange;
			const colorStops = generateColorStops(selectedMode, minPercentage, maxPercentage);
			
			// Find the range for this color stop
			let rangeMin = selectedValue;
			let rangeMax = selectedValue;
			
			// Find the next color stop to determine the range
			const currentIndex = colorStops.findIndex(stop => stop[0] === selectedValue);
			const isLastColorStop = currentIndex === colorStops.length - 1;
			
			if (currentIndex >= 0 && currentIndex < colorStops.length - 1) {
				rangeMax = colorStops[currentIndex + 1][0];
			} else if (isLastColorStop) {
				rangeMax = maxPercentage;
			}
			
			// Create opacity expression: full opacity for areas in range, 20% for others
			if (isLastColorStop) {
				// For the highest color stop, include all values >= rangeMin
				map.setPaintProperty('census-choropleth', 'fill-opacity', [
					'case',
					['>=', ['get', 'selected_percentage'], rangeMin],
					0.95,  // Full opacity for areas >= this value
					0.2    // 20% opacity for other areas
				]);
			} else {
				// For other color stops, use range [rangeMin, rangeMax)
				map.setPaintProperty('census-choropleth', 'fill-opacity', [
					'case',
					[
						'all',
						['>=', ['get', 'selected_percentage'], rangeMin],
						['<', ['get', 'selected_percentage'], rangeMax]
					],
					0.95,  // Full opacity for areas in selected range
					0.2    // 20% opacity for other areas
				]);
			}
		}
	}

	// Get display text for the mode
	const modeText = $derived(selectedMode === 'cycling' ? 'cycling' : 'walking');
</script>

<div class="filter-bar">
	<div class="legend-content">
		<div class="legend-title">
			
             % of commuters {modeText}
		</div>
		<div class="legend-items">
			{#each filterOptions as option}
				<div 
					class="legend-item {selectedFilter === option.value ? 'active' : ''}"
					onclick={() => selectFilter(option.value)}
				>
					{#if option.color}
						<div class="color-rectangle" style="background-color: {option.color}"></div>
					{:else}
						<div class="color-rectangle all-option">All</div>
					{/if}
					<span class="legend-label">{option.label}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.filter-bar {
		position: fixed;
		bottom: 40px;
		left: calc(240px + 80px);
		background: white;
		padding: 15px 25px;
		border-radius: 8px;
		z-index: 10;
		display: flex;
		align-items: center;
		width: calc(100% - 600px - 240px - 160px);
        min-height: 92px;
	}

	.legend-content {
		display: flex;
		align-items: center;
		gap: 20px;
		width: 100%;
        flex-direction: column;
	}

	.legend-title {
		font-size: 16px;
		font-weight: 400;
		color: #000;
		font-family: 'Inter', sans-serif;
		width: 100%;
		flex-shrink: 0;
	}

	.legend-items {
		display: flex;
		gap: 4px;
		flex-wrap: nowrap;
		align-items: center;
		width: 100%;
		flex-shrink: 0;
	}

	.legend-item {
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.color-rectangle {
		width: 100%;
		height: 20px;
		border: 0px solid rgba(0, 0, 0, 0.2);
		transition: all 0.2s ease;
	}

	.color-rectangle.all-option {
		background: #f3f4f6;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 500;
		color: #6b7280;
	}

	.legend-label {
		font-size: 12px;
		font-weight: 400;
		color: #374151;
		font-family: 'Inter', sans-serif;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
		text-align: center;
	}

	.legend-item:hover .color-rectangle {
		border-color: rgba(0, 0, 0, 0.4);
		transform: translateY(-1px);
	}

	.legend-item.active .color-rectangle {
		border-color: #000;
		border-width: 2px;
		transform: scale(1.05);
	}

	.legend-item.active .legend-label {
		font-weight: 600;
		color: #000;
	}

	@media (max-width: 1300px) {
		.filter-bar {
			width: calc(100% - 310px - 240px - 160px);
		}
	}

	@media (max-width: 950px) {
		.filter-bar {
			width: calc(100% - 40px);
			left: 20px;
			bottom: calc(40svh + 20px);
			height: 10svh;

			font-size: 14px;
		}

	
	}



</style>
