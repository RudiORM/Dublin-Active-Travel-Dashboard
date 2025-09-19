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

	// Options for each filter
	const modeOptions = [
		{ value: 'cycling', label: 'Cycling' },
		{ value: 'walking', label: 'Walking' }
	];

	const placeOptions = [
		{ value: 'work', label: 'Work' },
		{ value: 'school_college', label: 'School or college' },
		{ value: 'work_school_college', label: 'Work, school or college' }
	];

	const yearOptions = [
		{ value: '2022', label: '2022' },
		{ value: '2016', label: '2016' }
	];

	function cycleMode() {
		const currentIndex = modeOptions.findIndex(opt => opt.value === selectedMode);
		const nextIndex = (currentIndex + 1) % modeOptions.length;
		selectedMode = modeOptions[nextIndex].value;
		onFilterChange();
	}

	function cyclePlace() {
		const currentIndex = placeOptions.findIndex(opt => opt.value === selectedPlace);
		const nextIndex = (currentIndex + 1) % placeOptions.length;
		selectedPlace = placeOptions[nextIndex].value;
		onFilterChange();
	}

	function cycleYear() {
		const currentIndex = yearOptions.findIndex(opt => opt.value === selectedYear);
		const nextIndex = (currentIndex + 1) % yearOptions.length;
		selectedYear = yearOptions[nextIndex].value;
		onFilterChange();
	}

	// Get display labels
	const modeLabel = $derived(modeOptions.find(opt => opt.value === selectedMode)?.label || selectedMode);
	const placeLabel = $derived(placeOptions.find(opt => opt.value === selectedPlace)?.label || selectedPlace);
	const yearLabel = $derived(yearOptions.find(opt => opt.value === selectedYear)?.label || selectedYear);

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

<!-- Mobile: Combined layout -->
<div class="filter-legend-bar mobile-combined">
	<!-- Filter Section -->
	<div class="filter-section">
		<div class="filter-group">
			<span class="filter-select" onclick={cycleMode}>{modeLabel}</span>
			<span class="filter-label">to</span>
			<span class="filter-select" onclick={cyclePlace}>{placeLabel}</span>
			<span class="filter-label">in</span>
			<span class="filter-select" onclick={cycleYear}>{yearLabel}</span>
		</div>
	</div>

	<!-- Legend Section -->
	<div class="legend-section">
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
</div>

<!-- Desktop: Split layout -->
<div class="filter-bar desktop-split">
	<div class="filter-group">
		<span class="filter-select" onclick={cycleMode}>{modeLabel}</span>
		<span class="filter-label">to</span>
		<span class="filter-select" onclick={cyclePlace}>{placeLabel}</span>
		<span class="filter-label">in</span>
		<span class="filter-select" onclick={cycleYear}>{yearLabel}</span>
	</div>
</div>

<div class="legend-bar desktop-split">
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
	/* Mobile: Combined layout (default, hidden on desktop) */
	.filter-legend-bar.mobile-combined {
		position: fixed;
		bottom: 40px;
		left: calc(240px + 80px);
		background: #EEF2F6;
		padding: 15px 25px;
		border-radius: 8px;
		z-index: 10;
		display: none; /* Hidden by default, shown on mobile */
		flex-direction: column;
		gap: 15px;
		width: calc(100% - 600px - 240px - 160px);
		min-height: 92px;
		min-width: 300px;
	}

	/* Desktop: Split layout */
	.filter-bar.desktop-split {
		position: fixed;
		top: 40px;
		left: calc(240px + 80px);
		background: #EEF2F6;
		padding: 30px;
		border-radius: 8px;
		z-index: 10;
		display: flex;
		align-items: center;
		width: calc(100% - 600px - 240px - 160px);
	}

	.legend-bar.desktop-split {
		position: fixed;
		bottom: 40px;
		left: calc(240px + 80px);
		background: #EEF2F6;
		padding: 30px;
		border-radius: 8px;
		z-index: 10;
		display: flex;
		align-items: center;
		width: calc(100% - 600px - 240px - 160px);
		min-height: 92px;
	}

	/* Filter Section Styles */
	.filter-section {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		width: 100%;
	}
	
	.filter-select {
		font-size: 22px;
		font-weight: 400;
		padding-bottom: 2px;
		margin-top: 3px;
		color: #000;
		background: #EEF2F6;
		border-bottom: 1px solid #000;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: all 0.2s ease;
		position: relative;
		display: inline-block;
	}

	.filter-select:hover {
		background: #fff;
	}

	.filter-select:focus {
		outline: none;
		border-color: #999;
	}

	.filter-label {
		font-size: 22px;
	}

	/* Legend Section Styles */
	.legend-section {
		display: flex;
		align-items: center;
		width: 100%;
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
		font-weight: 400;
		color: #6b7280;
	}

	.legend-label {
		font-size: 12px;
		font-weight: 500;
		color: #374151;
		font-family: 'Inter', sans-serif;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
		text-align: left;
		margin-top:10px;
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
		font-weight: 700;
		color: #000;
	}

	/* Responsive Styles */
	@media (max-width: 1300px) {
		.filter-bar.desktop-split,
		.legend-bar.desktop-split {
			width: calc(100% - 310px - 240px - 160px);
		}
		
		.filter-legend-bar.mobile-combined {
			width: calc(100% - 310px - 240px - 160px);
		}
	}

	@media (max-width: 950px) {
		/* Hide desktop split layout */
		.filter-bar.desktop-split,
		.legend-bar.desktop-split {
			display: none;
		}

		/* Show mobile combined layout */
		.filter-legend-bar.mobile-combined {
			display: flex;
			width: calc(100% - 40px - 240px - 20px);
			left: 280px;
			bottom: calc(40% + 20px);
			border-radius: 8px 8px 8px 8px;
			flex-direction: column;
			gap: 10px;
			padding: 10px 15px;
		}

		.filter-select {
			font-size: 16px;
		}

		.filter-label {
			font-size: 16px;
		}
	}

	@media (max-width: 650px) {
		.filter-legend-bar.mobile-combined {
			width: calc(100% - 40px);
			left: 20px;
			min-width: 300px;

		}
	}
</style>


