<script>
	// Props
	let { 
		selectedMode = $bindable('walking'),
		selectedMetric = $bindable('trips'),
		selectedScope = $bindable('full'),
		onFilterChange = () => {}
	} = $props();

	function handleFilterChange() {
		onFilterChange();
	}
</script>

<div class="filter-bar">
	<div class="filter-group">
		<select bind:value={selectedMode} class="filter-select" onchange={handleFilterChange}>
			<option value="walking">Walking</option>
			<option value="cycling">Cycling</option>
		</select>
		<span class="filter-label">% of Total Trips</span>
	</div>
</div>

<style>
	.filter-bar {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		padding: 15px 25px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 20px;
	}
	
	.filter-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	
	.filter-select {
		padding: 8px 12px;
		border: none;
		background: #f0f0f0;
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		transition: background 0.2s;
		min-width: 100px;
	}
	
	.filter-select:hover {
		background: #e0e0e0;
	}
	
	.filter-select:focus {
		outline: 2px solid #4292c6;
		outline-offset: 2px;
	}
	
	.filter-label {
		color: #666;
		font-size: 16px;
	}
</style>
