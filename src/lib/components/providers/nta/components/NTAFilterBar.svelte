<script>
	import { getContext } from 'svelte';
	
	// Props
	let { 
		selectedRoute = $bindable('NTA'),
		onFilterChange = () => {}
	} = $props();
	
	// Get NTA context to access switchDataSource function
	const nta = getContext('nta');
	
	function cycleDataSource() {
		nta.switchDataSource();
		onFilterChange();
	}
</script>

<div class="filter-bar">
	<div class="filter-group">
		<button class="filter-select" onclick={cycleDataSource}>{selectedRoute}</button>
		<span class="filter-label"> data</span>
	</div>
	

</div>

<style>
	.filter-bar {
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

	.filter-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		width: 100%;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
	}

	.toggle-checkbox {
		display: none;
	}

	.toggle-slider {
		position: relative;
		width: 40px;
		height: 20px;
		background-color: #ccc;
		border-radius: 20px;
		transition: background-color 0.3s;
	}

	.toggle-slider::before {
		content: '';
		position: absolute;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background-color: white;
		top: 2px;
		left: 2px;
		transition: transform 0.3s;
	}

	.toggle-checkbox:checked + .toggle-slider {
		background-color: #4A90E2;
	}

	.toggle-checkbox:checked + .toggle-slider::before {
		transform: translateX(20px);
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
	@media (max-width: 1200px) {
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
			padding: 10px 20px;
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

	@media (min-width: 651px) and (max-height: 750px) {

.filter-select {
	font-size: 14px;
}

.filter-label {
	font-size: 14px;
}
	

}


@media (max-width: 650px) {
		.filter-bar {
			width: calc(100% - 40px);
			left: 20px;
			min-width: 300px;
		}
	}

	@media (min-width: 651px) and (max-height: 750px) {

.filter-select {
	font-size: 14px;
}

.filter-label {
	font-size: 14px;
}


}


@media (min-width: 1200px) and (max-height: 750px) {
		.filter-select {
			font-size: 14px;
			line-height: 1;
		}
		.filter-label {
			font-size: 14px;
			line-height: 1;
		}

		.filter-bar {
			width: calc(100% - 500px - 240px - 160px);
		}
		
		
	}

	@media (min-width: 951px) and (max-width: 1200px) and (max-height: 750px) {
		.filter-select {
			font-size: 14px;
			line-height: 1;
		}
		.filter-label {
			font-size: 14px;
			line-height: 1;
		}

		.filter-bar {
			width: calc(100% - 260px - 240px - 160px);
		}
		
		
	}





</style>
