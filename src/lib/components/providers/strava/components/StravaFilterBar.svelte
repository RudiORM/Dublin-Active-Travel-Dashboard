<script>
	// Props
	let { 
		selectedRoute = $bindable('Clontarf to City Center'),
		onFilterChange = () => {}
	} = $props();

	// Options for route filter
	const routeOptions = [
		{ value: 'Clontarf to City Center', label: 'Clontarf to City Center' },
		{ value: 'Dun Laoghaire Coastal', label: 'Dun Laoghaire Coastal' },
		{ value: 'Dodder Greenway', label: 'Dodder Greenway' },
		{ value: 'Portmarnock Greenway', label: 'Portmarnock Greenway' }
	];

	function cycleRoute() {
		const currentIndex = routeOptions.findIndex(opt => opt.value === selectedRoute);
		const nextIndex = (currentIndex + 1) % routeOptions.length;
		selectedRoute = routeOptions[nextIndex].value;
		onFilterChange();
	}

	// Get display label
	const routeLabel = $derived(routeOptions.find(opt => opt.value === selectedRoute)?.label || selectedRoute);
</script>

<div class="filter-bar">
	<div class="filter-group">
		<button class="filter-select" onclick={cycleRoute}>{routeLabel}</button>
		<span class="filter-label">route data</span>
	</div>
</div>

<style>
	.filter-bar {
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
		border: none;
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

	/* Responsive Styles */
	@media (max-width: 1300px) {
		.filter-bar {
			width: calc(100% - 310px - 240px - 160px);
		}
	}

	@media (max-width: 950px) {
		.filter-bar {
			width: calc(100% - 40px - 240px - 20px);
			left: 280px;
			bottom: calc(40% + 20px);
			top: auto;
			border-radius: 8px 8px 8px 8px;
			padding: 20px 20px;
		}

		.filter-select {
			font-size: 16px;
		}

		.filter-label {
			font-size: 16px;
		}
	}

	@media (max-width: 650px) {
		.filter-bar {
			width: calc(100% - 40px);
			left: 20px;
			min-width: 300px;
		}
	}
</style>
