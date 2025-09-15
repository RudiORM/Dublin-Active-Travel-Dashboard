<script lang="ts">
	// Props
	let { 
		selectedDataSource = $bindable('census'),
		onDataSourceChange = () => {}
	} = $props();

	// Hierarchy state
	let expandedSections: Record<string, boolean> = $state({
		boundary: true,
		location: false,
		route: false
	});

	// Define the hierarchy structure
	const hierarchy = {
		boundary: {
			label: 'Boundary',
			items: [
				{ id: 'census', label: 'Census' },
				{ id: 'google', label: 'Google trips' },
				{ id: 'canal', label: 'Canal cordon counts' }
			]
		},
		location: {
			label: 'Location',
			items: []
		},
		route: {
			label: 'Route',
			items: []
		}
	};

	function toggleSection(section: string) {
		expandedSections[section] = !expandedSections[section];
	}

	function selectDataSource(dataSource: string) {
		selectedDataSource = dataSource;
		onDataSourceChange();
	}
</script>

<div class="sidebar-container">

<div class="sidebar">
	<div class="sidebar-header">
		<h3>Data</h3>
		<!-- <div class="info-icon">ⓘ</div> -->
	</div>

	<div class="data-content">
		{#each Object.entries(hierarchy) as [sectionKey, section]}
			<div class="hierarchy-section">
				<button 
					class="section-header" 
					class:expanded={expandedSections[sectionKey]}
					onclick={() => toggleSection(sectionKey)}
				>
					<span class="section-label">{section.label}</span>
					<span class="expand-icon">{expandedSections[sectionKey] ? '−' : '+'}</span>
				</button>
				
				{#if expandedSections[sectionKey] && section.items.length > 0}
					<div class="section-items">
						{#each section.items as item}
							<button 
								class="item-button"
								class:selected={selectedDataSource === item.id}
								onclick={() => selectDataSource(item.id)}
							>
								{item.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
	
</div>




</div>

<style>
	.sidebar-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}


	.data-content {
		font-size: 17px;
		background: #E4E4EF;
		border-radius: 8px;
		padding: 15px;
		height: calc(100% - 40px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-height: calc(100% - 40px);
		overflow-y: scroll;
	}

	.hierarchy-section {
		display: flex;
		flex-direction: column;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 12px 15px;
		background: #EBF1F7;
		border: none;
		border-radius: 8px;
		font-size: 17px;
		font-weight: 400;
		color: #333;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 2px;
	}

	.section-header:hover {
		background: #f8f8f8;
	}

	.section-header.expanded {
		background: #EBF1F7;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		margin-bottom: 0;
		border-bottom: 1px solid #000;
	}

	.section-label {
		font-weight: 500;
	}

	.expand-icon {
		font-size: 16px;
		font-weight: bold;
		color: #666;
	}

	.section-items {
		background: #EBF1F7;
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		padding: 0;
		margin-bottom: 2px;
		display: flex;
		flex-direction: column;
	}

	.item-button {
		width: 100%;
		padding: 10px 30px;
		background: transparent;
		border: none;
		text-align: left;
		font-size: 17px;
		font-weight: 400;
		color: #333;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.item-button:hover {
		background: #f8f8f8;
	}

	.item-button.selected {
		text-decoration: underline;
		
	}

	.item-button:last-child {
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
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
	
	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}

	.sidebar-header h3 {
		margin: 0;
		color: #333;
		font-size: 18px;
		font-weight: 500;
	}

    @media (max-width: 1000px) {
        .sidebar-container{
            display: none;
        }
    }


	
</style>
