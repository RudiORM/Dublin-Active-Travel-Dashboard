<script>
	// Props
	let { 
		selectedDataSource = $bindable('census'),
		onDataSourceChange = () => {}
	} = $props();

	function handleDataSourceChange() {
		onDataSourceChange();
	}
</script>

<div class="sidebar">
	<div class="sidebar-header">
		<h3>Data Sources</h3>
	</div>
	
	<div class="data-source-selector">
		<select bind:value={selectedDataSource} class="data-source-select" onchange={handleDataSourceChange}>
			<option value="census">Census Data</option>
			<option value="google">Google Mobility</option>
			<!-- Future data sources will be added here -->
		</select>
	</div>
</div>

<style>
	.sidebar {
		position: fixed;
		top: 20px;
		left: 20px;
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		z-index: 10;
		min-width: 200px;
	}
	
	.sidebar-header h3 {
		margin: 0 0 15px 0;
		color: #333;
		font-size: 18px;
	}
	
	.data-source-select {
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: #f0f0f0;
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		transition: background 0.2s;
	}
	
	.data-source-select:hover {
		background: #e0e0e0;
	}
	
	.data-source-select:focus {
		outline: 2px solid #4292c6;
		outline-offset: 2px;
	}
</style>
