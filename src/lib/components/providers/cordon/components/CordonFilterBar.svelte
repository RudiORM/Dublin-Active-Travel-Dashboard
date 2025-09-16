<script>
	// Props
	let { 
		selectedMode = $bindable('walking'),
		selectedYear = $bindable('2023'),
		onFilterChange = () => {}
	} = $props();

	// Options for each filter
	const modeOptions = [
		{ value: 'walking', label: 'Walking' },
		{ value: 'cycling', label: 'Cycling' },
		{ value: 'cars', label: 'Cars' },
		{ value: 'motorcycles', label: 'Motorcycles' },
		{ value: 'taxis', label: 'Taxis' },
		{ value: 'hgvs', label: 'HGVs' },
		{ value: 'bus', label: 'Bus' }
	];

	const yearOptions = [
		{ value: '2023', label: '2023' },
		{ value: '2022', label: '2022' }
	];

	function cycleMode() {
		const currentIndex = modeOptions.findIndex(opt => opt.value === selectedMode);
		const nextIndex = (currentIndex + 1) % modeOptions.length;
		selectedMode = modeOptions[nextIndex].value;
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
	const yearLabel = $derived(yearOptions.find(opt => opt.value === selectedYear)?.label || selectedYear);
</script>

<div class="filter-bar">
	<div class="filter-group">
		<span class="filter-select" onclick={cycleMode}>{modeLabel}</span>
		<span class="filter-label">counts in</span>
		<span class="filter-select" onclick={cycleYear}>{yearLabel}</span>
	</div>
</div>

<style>
	.filter-bar {
		position: fixed;
		top: 40px;
		left: calc(240px + 80px);
		background: white;
		padding: 15px 25px;
		border-radius: 8px;
		z-index: 10;
		display: flex;
		align-items: center;
		width: calc(100% - 600px - 240px - 160px);
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
		color: #000;
		background: white;
		border-bottom: 1px solid #000;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: all 0.2s ease;
		position: relative;
		display: inline-block;
	}

	.filter-select:hover {
		background: #EBF1F7;
	}

	.filter-select:focus {
		outline: none;
		border-color: #999;
	}
	
	.filter-label {
		color: #666;
		font-size: 16px;
	}

	/* Responsive Styles */
	@media (max-width: 1300px) {
		.filter-bar {
			width: calc(100% - 310px - 240px - 160px);
		}
	}

	@media (max-width: 950px) {
		.filter-bar {
			width: calc(100% - 40px);
			left: 20px;
			min-height: 40px;
			bottom: calc(40% + 110px);
			border-radius: 8px 8px 0px 0px;
			top: auto;
			font-size: 14px;
		}

		.filter-label {
			font-size: 14px;
		}

		.filter-select {
			font-size: 16px;
		}
	}
</style>
