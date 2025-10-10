<script>
	import { googleColorSchemes, generateGoogleColorStops } from '$lib/utils/google/google-colors.js';

	// Props
	let { 
		selectedMode = $bindable('walking'),
		selectedMetric = $bindable('trips'),
		selectedScope = $bindable('full'),
		selectedFilter = $bindable('all'),
		onFilterChange = () => {},
		googleContext
	} = $props();

	// Options for each filter
	const modeOptions = [
		{ value: 'walking', label: 'Walking' },
		{ value: 'cycling', label: 'Cycling' },
		{ value: 'automobile', label: 'Automobile' },
		{ value: 'public', label: 'Public Transport' }
	];

	

	function cycleMode() {
		const currentIndex = modeOptions.findIndex(opt => opt.value === selectedMode);
		const nextIndex = (currentIndex + 1) % modeOptions.length;
		selectedMode = modeOptions[nextIndex].value;
		onFilterChange();
	}


    

	// Get display labels
	const modeLabel = $derived(modeOptions.find(opt => opt.value === selectedMode)?.label || selectedMode);
	
	// Map Google modes to available color schemes
	function getMappedMode(googleMode) {
		const modeMapping = {
			'walking': 'walking',
			'cycling': 'cycling',
			'automobile': 'automobile',
			'public': 'public',
			'bus': 'public',
			'rail': 'public',
			'tram': 'public'
		};
		return modeMapping[googleMode] || 'walking';
	}

	// Calculate min/max values from actual data
	const dataRange = $derived.by(() => {
		if (!googleContext?.reshapedData) return { minValue: 0, maxValue: 100 };
		
		const totals = googleContext.reshapedData.totals;
		if (!totals || !totals[selectedMode] || !totals[selectedMode][selectedMetric] || !totals[selectedMode][selectedMetric][selectedScope]) {
			return { minValue: 0, maxValue: 100 };
		}
		
		// Get values from all areas for the selected mode/metric/scope
		const values = [];
		Object.keys(googleContext.reshapedData.byArea || {}).forEach(areaName => {
			const areaData = googleContext.reshapedData.byArea[areaName];
			if (areaData && areaData[selectedMode] && areaData[selectedMode][selectedMetric] && areaData[selectedMode][selectedMetric][selectedScope]) {
				const value = selectedMetric === 'trips' && areaData[selectedMode][selectedMetric][selectedScope].percentage !== undefined
					? areaData[selectedMode][selectedMetric][selectedScope].percentage
					: areaData[selectedMode][selectedMetric][selectedScope].raw;
				values.push(value);
			}
		});
		
		if (values.length === 0) return { minValue: 0, maxValue: 100 };
		
		const maxValue = Math.max(...values);
		const minValue = Math.min(...values);
		
		return { minValue, maxValue };
	});

	// Generate filter options dynamically based on actual data range
	const filterOptions = $derived.by(() => {
		const mappedMode = getMappedMode(selectedMode);
		const colors = googleColorSchemes[mappedMode] || googleColorSchemes.walking;
		const { minValue, maxValue } = dataRange;
		
		// Generate color stops
		const colorStops = generateGoogleColorStops(mappedMode, minValue, maxValue);
		
		// Create legend items: "All" plus one for each color stop
		const options = [
			{ value: 'all', label: 'All', color: null }
		];
		
		// Add items for each color stop
		colorStops.forEach((stop, index) => {
			const [value, color] = stop;
			const displayValue = selectedMetric === 'trips' ? `${Math.round(value)}%` : Math.round(value).toLocaleString();
			options.push({
				value: value.toString(),
				label: displayValue,
				color: color
			});
		});
		
		return options;
	});

	// Filter selection
	function selectFilter(value) {
		selectedFilter = value;
        console.log(value);
		onFilterChange();
	}

	// Determine text color based on background
	function getTextColor(bgColor) {
		if (!bgColor) return '#333';
		
		// Convert hex to RGB
		const hex = bgColor.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Calculate brightness
		const brightness = (r * 299 + g * 587 + b * 114) / 1000;
		
		// Return dark text for light backgrounds, light text for dark backgrounds
		return brightness > 128 ? '#333' : '#fff';
	}

	// Get current mode text for display
	const modeText = $derived(selectedMode === 'cycling' ? 'cycling' : selectedMode);
</script>

<!-- Mobile combined layout (≤ 950px) -->

<!-- Mobile: Combined layout -->
<div class="filter-legend-bar mobile-combined">
	<!-- Filter Section -->
	<div class="filter-section">
		<div class="filter-group">
			<span class="filter-select" onclick={cycleMode}>{modeLabel}</span>
			<span class="filter-label">trips in 2023</span>
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
		<span class="filter-label">trips in 2023</span>
	
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
		padding: 20px;
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
		padding: 20px;
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
	@media (max-width: 1200px) {
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

		}}

		@media (min-width: 651px) and (max-height: 750px) {

.filter-select {
	font-size: 16px;
}

.filter-label {
	font-size: 16px;
}
	

}



		
	
</style>


