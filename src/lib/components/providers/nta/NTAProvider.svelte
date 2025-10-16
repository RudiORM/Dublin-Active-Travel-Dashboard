<script>
	import { onMount, setContext } from 'svelte';
	import { fetchNTAData } from '$lib/services/nta/nta-api.js';
	import { fetchBusConnectsData } from '$lib/services/nta/busconnects-api.js';
	import { processInfrastructureData, } from '$lib/services/nta/nta-processor.js';
	import { addNTARoutes, updateNTARoutes,  } from '$lib/utils/nta/nta-layers.js';

	// Props
	let { map, children, onInitialized } = $props();

	// State
	let ntaData = $state(/** @type {any} */ (null));
	let busConnectsData = $state(/** @type {any} */ (null));
	let reshapedData = $state(/** @type {any} */ (null));
	let selectedDataSource = $state('nta'); // 'nta' or 'busconnects'
	let selectedRoute = $state('NTA');

	// Context for child components
	const ntaContext = {
		get map() { return map; },
		get ntaData() { return ntaData; },
		get busConnectsData() { return busConnectsData; },
		get reshapedData() { return reshapedData; },
		get selectedDataSource() { return selectedDataSource; },
		set selectedDataSource(value) { selectedDataSource = value; },
		get selectedRoute() { return selectedRoute; },
		set selectedRoute(value) { selectedRoute = value; },
		updateVisualization,
		switchDataSource,
	};

	setContext('nta', ntaContext);

	// Function to switch between data sources
	function switchDataSource() {
		const newDataSource = selectedDataSource === 'nta' ? 'busconnects' : 'nta';
		selectedDataSource = newDataSource;
		
		// Update route name
		selectedRoute = newDataSource === 'nta' ? 'NTA' : 'BusConnects';
		
		// Process the appropriate data
		const currentData = newDataSource === 'nta' ? ntaData : busConnectsData;
		if (currentData) {
			reshapedData = processInfrastructureData(currentData, newDataSource);
			updateVisualization();
		}
	}

	// Function to update the map visualization
	function updateVisualization() {
		if (!map || !reshapedData || !reshapedData?.geoJsonData) return;
		
		// Update cycling infrastructure with current data source
		updateNTARoutes(map, reshapedData, selectedDataSource);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	onMount(async () => {
		if (!map) return;

		try {
			// Load all datasets in parallel
			const [ntaDataResult, busConnectsDataResult] = await Promise.all([
				fetchNTAData(),
				fetchBusConnectsData(),
			]);
			
			ntaData = ntaDataResult;
			busConnectsData = busConnectsDataResult;
			
			// Process parking data
			
			// Start with NTA data by default
			reshapedData = processInfrastructureData(ntaData, selectedDataSource);
			
			console.log('Infrastructure Data loaded:', $state.snapshot(reshapedData));
			
			// Add cycling infrastructure to the map
			if (reshapedData) {
				addNTARoutes(map, reshapedData, selectedDataSource);
			}
			
			// Add parking stands to the map
		

			// Initial visualization update
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

		} catch (error) {
			console.error('Error loading infrastructure data:', error);
		}
	});
</script>

{@render children(ntaContext)}
