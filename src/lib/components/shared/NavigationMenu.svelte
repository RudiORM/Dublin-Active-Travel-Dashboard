<script lang="ts">
    import Page from "../../../routes/+page.svelte";

    let clicked = $state(false);

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

	// Mobile modal state
	let showMobileModal = $state(false);

	// Define the hierarchy structure
	const hierarchy = {
		boundary: {
			label: 'Boundary',
			items: [
				{ id: 'census', label: 'Census' },
				{ id: 'google', label: 'Google trips' },
				{ id: 'cordon', label: 'Canal cordon counts' }
			]
		},
		location: {
			label: 'Location',
			items: [
				{ id: 'eco-counter', label: 'Induction sensors' },
				{ id: 'vivacity-counter', label: 'Computer vision' }
			]
		},
		route: {
			label: 'Route',
			items: [
				{ id: 'nta', label: 'Infrastructure' },
				{ id: 'strava', label: 'Strava' },
			]
		}
	};

	function toggleSection(section: string) {
		const isCurrentlyExpanded = expandedSections[section];
		
		// Close all sections first
		Object.keys(expandedSections).forEach(key => {
			expandedSections[key] = false;
		});
		
		// If the clicked section wasn't expanded, expand it
		if (!isCurrentlyExpanded) {
			expandedSections[section] = true;
		}
	}

	function selectDataSource(dataSource: string) {
		selectedDataSource = dataSource;
		onDataSourceChange();
		// Close mobile modal after selection
		if (showMobileModal) {
			showMobileModal = false;
		}
	}

	function toggleMobileModal() {
		showMobileModal = !showMobileModal;
	}
</script>

<!-- Mobile hamburger button (only visible < 650px) -->
<button class="mobile-menu-button" onclick={toggleMobileModal}>
	<div class="hamburger-line"></div>
	<div class="hamburger-line"></div>
	<div class="hamburger-line"></div>
</button>

<!-- Desktop layout (>= 650px) -->
<div class="desktop-layout">
	<!-- Title/Menu Section -->
	<div class="menu">
		<div class="menu-header">
			<img src="/svgs/DATD-logo-v3-outlinestroke.svg" alt="Logo" class="logo" />
		</div>
		<div class="menu-content" onclick={() => clicked = true}>
			<img class='sd-logo' src="/svgs/Smart-Dublin-Logo-light-2-blackandwhite.svg" alt="Logo" />
			<p>About</p>
		</div>
	</div>

    {#if clicked}
    <div class='menu-overlay' onclick={() => clicked = false}>
        <p>The Dublin Active Travel Dashboard brings together live and historical data to correlate active travel patterns with infrastructure use, public health projections and climate impact in Dublin. </p>
        <p>Click on a data source to explore the data.</p>
    </div>
    {/if}

	<!-- Data Menu Section -->
	<div class="sidebar">
		<!-- Logo section for short height screens -->
		<div class="sidebar-logo">
			<img src="/svgs/DATD-logo-v3-outlinestroke.svg" alt="Logo" class="logo" />
		</div>
		<div class="sidebar-header">
			<h3>Data</h3>
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
		<!-- About button moved to bottom for short height screens -->
		<div class="sidebar-about">
			<div class="menu-content" onclick={() => clicked = true}>
				<img class='sd-logo' src="/svgs/Smart-Dublin-Logo-light-2-blackandwhite.svg" alt="Logo" />
				<p>About</p>
			</div>
		</div>
	</div>
</div>

<!-- Mobile Modal (only visible when showMobileModal is true) -->
{#if showMobileModal}
	<div class="modal-overlay" onclick={toggleMobileModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<!-- Close button -->
			<button class="modal-close" onclick={toggleMobileModal}>×</button>
			
			<!-- Top section with logo and data menu -->
			<div class="modal-top-section">
				<!-- Title/Menu Section in Modal -->
				<div class="modal-menu">
					<div class="menu-header">
						<img src="/svgs/DATD-logo-v3-outlinestroke.svg" alt="Logo" class="logo" />
					</div>
				</div>

				<!-- Data Menu Section in Modal -->
				<div class="modal-sidebar">
					<div class="sidebar-header">
						<h3>Data</h3>
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

			<!-- Bottom section with menu-content -->
			<div class="modal-bottom-section">
                <div class="menu-content" onclick={() => {console.log('clicked'); clicked = true}}>
					<img class='sd-logo' src="/svgs/Smart-Dublin-Logo-light-2-blackandwhite.svg" alt="Logo" />
					<p>About</p>
				</div>
			</div>
		</div>
	</div>

    {#if clicked}
    <div class='modal-overlay-2' onclick={() => {console.log('clicked'); clicked = false}}>
        <p>The Dublin Active Travel Dashboard brings together live and historical data to correlate active travel patterns with infrastructure use, public health projections and climate impact in Dublin. </p>
        <p>Click on a data source to explore the data.</p>
    </div>
    {/if}
{/if}

<style>
	/* Mobile hamburger button */
	.mobile-menu-button {
		display: none;
		position: fixed;
		top: 20px;
		left: 20px;
		z-index: 1000;
		background: #EEF2F6;
		border: none;
		border-radius: 8px;
		padding: 12px;
		cursor: pointer;
		flex-direction: column;
		gap: 3px;
		width: 48px;
		height: 48px;
		justify-content: center;
		align-items: center;
	}

	.hamburger-line {
		width: 20px;
		height: 2px;
		background: #333;
		transition: all 0.3s ease;
	}

	/* Desktop layout */
	.desktop-layout {
		display: flex;
		flex-direction: column;
		gap: 20px;
        min-height: 600px;
	}

	/* Menu (Title) styles */
	.menu {
		position: fixed;
		top: 40px;
		left: 40px;
		background: #EEF2F6;
		padding: 20px;
		border-radius: 8px;
		z-index: 10;
		width: 240px;
		height: calc(45% - 60px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
        min-height: 300px;
	}

    .menu-overlay {
		position: fixed;
		top: 40px;
		left: 40px;
		background: #FFD249;
		border-radius: 8px;
		z-index: 10;
		width: 240px;
		height: calc(45% - 60px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
        text-align: left;
        padding: 20px;
        display: flex;
		font-size: 16px;
		line-height: 22px;	
	}


	.menu-content {
		font-size: 17px;
		background: #A8E9DA;
		border-radius: 8px;
		padding: 12px 15px;
		display: flex;
		flex-direction: row;
		gap: 20px;
		justify-content: space-between;
		max-width: 100%;
		width: 100%;
		cursor: pointer;
	}

	.sd-logo {
		width: 70px;
	}

	/* Sidebar (Data Menu) styles */
	.sidebar {
		position: fixed;
		bottom: 40px;
		left: 40px;
		background: #EEF2F6;
		padding: 20px;
		border-radius: 8px;
		z-index: 10;
		width: 240px;
		height: calc(55% - 60px);
        min-height: 300px;
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
		font-weight: 400;
	}

	.data-content {
		font-size: 16px;
		border-radius: 8px;
		padding: 0px;
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
		background: #A8E9DA;
		border: none;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 400;
		color: #333;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 2px;
	}

	.section-header.expanded {
		background: #A8E9DA;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		margin-bottom: 0;
	}

	.section-label {
		font-weight: 400;
	}

	.expand-icon {
		font-size: 16px;
		font-weight: bold;
		color: #666;
	}

	.section-items {
		background: #fff;
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		padding: 0;
		margin-bottom: 2px;
		display: flex;
		flex-direction: column;
	}

	.item-button {
		width: 100%;
		padding: 10px 20px;
		background: transparent;
		border: none;
		text-align: left;
		font-size: 16px;
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

	/* Sidebar logo section (hidden by default, shown on short height screens) */
	.sidebar-logo {
		display: none;
		margin-bottom: 20px;
		flex-shrink: 0;
		width: 100%;
	}

	.sidebar-logo .logo {
		max-width: 120px;
		height: auto;
		display: block;
		margin: 0 auto;
	}

	/* Sidebar about section (hidden by default, shown on short height screens) */
	.sidebar-about {
		display: none;
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px solid #ddd;
	}

	/* Modal styles */
	.modal-overlay {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		justify-content: center;
		align-items: center;
        min-width: 300px;
	}

    .modal-overlay-2 {
		position: fixed;
		top: 20px;
		left: 20px;
		padding: 30px;
		width: calc(100% - 40px);
		height: calc(100% - 40px);
		border-radius: 8px;
		background: #FFD249;
		z-index: 1001;
		justify-content: center;
		align-items: center;
        min-width: 300px;
        font-size: 16px;
        line-height: 1.5;
	}

	.modal-content {
		background: #EEF2F6;
		border-radius: 12px;
		padding: 30px;
		width: calc(100% - 40px);
		height: calc(100% - 40px);
		overflow-y: auto;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	
		.logo{
            max-width: 180px;
            position: relative;
            margin: auto;
            left: 50%;
            transform: translateX(-50%);
			margin-top: 10px;
       
        }

	

	.modal-close {
		position: absolute;
		top: 15px;
		right: 20px;
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #666;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-top-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 30px;
	}

	.modal-bottom-section {
		flex-shrink: 0;
		margin-top: 20px;
	}

	.modal-menu {
		flex-shrink: 0;
	}

	.modal-sidebar {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.modal-sidebar .sidebar-header {
		margin-bottom: 15px;
		flex-shrink: 0;
	}

	.modal-sidebar .data-content {
		flex: 1;
		max-height: none;
		overflow-y: auto;
	}

	/* Responsive styles */
	@media (max-width: 950px) {
		.menu {
			left: 20px;
			top: 20px;
			height: calc(50% - 30px);
		}

		.sidebar {
			left: 20px;
			bottom: 20px;
			height: calc(50% - 30px);
		}
	}

	@media (max-width: 650px) {

        .logo{
            max-width: 180px;
            position: relative;
            margin: auto;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 20px;
        }

        
		/* Hide desktop layout on mobile */
		.desktop-layout {
			display: none;
		}

		/* Show mobile menu button */
		.mobile-menu-button {
			display: flex;
		}

		/* Show modal overlay when active */
		.modal-overlay {
			display: flex;
		}
	}

	/* Short height responsive styles - under 650px height */
	@media (max-height: 750px) and (min-width: 651px) {
		.menu {
			display: none; /* Hide the separate menu element */
		}

		.sidebar {
			top: 40px; /* Position at top instead of bottom */
			bottom: auto;
			height: calc(100vh - 80px); /* Take up full height minus margins */
			display: flex;
			flex-direction: column;
		}

		.sidebar-logo {
			display: flex; /* Show the logo in sidebar with flex centering */
			justify-content: center;
			align-items: center;
			flex-shrink: 0;
			width: calc(100% + 40px); /* Account for sidebar padding */
			margin-left: -20px; /* Offset the sidebar padding */
			margin-right: -20px; /* Offset the sidebar padding */
		}

		.logo{
            position: relative;
            margin: auto;
            left: 0%;
            transform: translateX(0%);
			margin-top: 10px;
       
        }

		.sidebar-header {
			flex-shrink: 0;
		}

		.sidebar-header h3 {
			font-size: 16px; /* Reduce font size */
		}

		.data-content {
			flex: 1;
			font-size: 16px; /* Reduce font size */
			overflow-y: auto;
		}

		.section-header {
			font-size: 16px; /* Reduce font size */
		}

		.item-button {
			font-size: 16px; /* Reduce font size */
		}

		.sidebar-about {
			display: block; /* Show the about button in sidebar */
			flex-shrink: 0;
			margin-top: 0px;
		}

		.sidebar-about .menu-content {
			font-size: 16px; /* Reduce font size */
			padding: 0px 12px; /* Reduce padding to make it less tall */
		}

		.sidebar-about .sd-logo {
			width: 40px; /* Smaller logo for compact layout */
		}
	}

	/* Responsive styles */
	@media (max-width: 950px) {
		.menu {
			left: 20px;
			top: 20px;
			height: calc(50% - 30px);
		}

		.sidebar {
			left: 20px;
			bottom: 20px;
			height: calc(50% - 30px);
		}
	}

	/* Desktop mode under 650px height */
	@media (min-width: 651px) and (max-height: 750px) {
		.menu {
			display: none;
		}

		.menu-overlay {
			display: none;
		}

		.sidebar {
			top: 40px;
			bottom: 40px;
			height: calc(100% - 80px);
			display: flex;
			flex-direction: column;
		}


		.sidebar .sidebar-header {
			margin-bottom: 10px;
			flex-shrink: 0;
		}

		.sidebar .sidebar-header h3 {
			font-size: 16px;
		}

		.sidebar .data-content {
			flex: 1;
			font-size: 16px;
			margin-bottom: 0px;
			overflow-y: auto;
		}

		.sidebar .section-header {
			font-size: 16px;
			padding: 10px 12px;
		}

		.sidebar .item-button {
			font-size: 16px;
			padding: 8px 16px;
		}

		.sidebar .expand-icon {
			font-size: 16px;
		}
	}
</style>
