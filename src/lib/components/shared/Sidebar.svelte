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

<div class="sidebar-container">

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

<div class="menu">
	<div class="menu-header">
		<h3>Dublin Region Active Travel Dashboard</h3>
	</div>

	<div class="menu-content">
		<p>The dashboard showcases valuable data from the CSO, EcoCounters, Google, the Canal Cordon Count and Strava Metro. Additionally, it highlights the positive health and climate impacts of active travel in Dublin, by linking existing data to peer reviewed studies.
		</p>
	</div>
	
	

	
</div>


</div>

<style>
	.sidebar-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.menu-content{
		font-size: 14px;
		background: #E4E4EF;
		border-radius: 8px;
		padding: 10px 20px 10px 20px;

		
	}

	.menu {
		position: fixed;
		top: 40px;
		left: 40px;
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		z-index: 10;
		width: 290px;
		height: calc(50% - 60px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.sidebar {
		position: fixed;
		bottom: 40px;
		left: 40px;
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		z-index: 10;
		width: 290px;
		height: calc(50% - 60px);
	}
	
	.sidebar-header h3 {
		margin: 0 0 15px 0;
		color: #333;
		font-size: 18px;
	}

	.menu-header h3 {
		padding: 0;
		margin: 0;
		color: #333;
		font-size: 30px;
		font-weight: 400;

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
