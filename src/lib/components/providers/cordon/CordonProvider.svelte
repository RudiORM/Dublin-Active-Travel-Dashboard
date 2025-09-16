<script>
	import { onMount, setContext } from 'svelte';
	import { fetchCordonData } from '$lib/services/cordon/cordon-api.js';
	import { reshapeCordonData, getWalkingData2023 } from '$lib/services/cordon/cordon-processor.js';
	import { addCordonMarkers, updateCordonMarkers } from '$lib/utils/cordon/cordon-layers.js';

	// Props
	let { map, children, onInitialized } = $props();

	// State
	let cordonData = $state(null);
	let reshapedData = $state({});
	let selectedMode = $state('walking');
	let selectedYear = $state('2023');
	let selectedLocation = $state(null);

	// Context for child components
	const cordonContext = {
		get map() { return map; },
		get cordonData() { return cordonData; },
		get reshapedData() { return reshapedData; },
		get selectedMode() { return selectedMode; },
		set selectedMode(value) { selectedMode = value; },
		get selectedYear() { return selectedYear; },
		set selectedYear(value) { selectedYear = value; },
		get selectedLocation() { return selectedLocation; },
		set selectedLocation(value) { selectedLocation = value; },
		updateVisualization
	};

	setContext('cordon', cordonContext);

	// Function to update the map visualization
	function updateVisualization() {
		if (!map || !reshapedData || Object.keys(reshapedData).length === 0) return;
		
		// Update markers with current selection
		updateCordonMarkers(map, reshapedData, selectedMode, selectedYear);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	onMount(async () => {
		if (!map) return;

		try {
			// Load the cordon data
			cordonData = await fetchCordonData();
			
			// Reshape the data
			reshapedData = reshapeCordonData(cordonData);
			
			console.log('Cordon Data loaded:', $state.snapshot(reshapedData));
			
			// Add initial markers (walking 2023 by default)
			const walkingData = getWalkingData2023(reshapedData);
			addCordonMarkers(map, walkingData);

			// Initial visualization update
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

			// Add click handler for markers
			map.on('click', 'cordon-circles', (e) => {
				if (e.features.length > 0) {
					const clickedFeature = e.features[0];
					selectedLocation = clickedFeature.properties.location;
					
					console.log(`${selectedLocation} - ${selectedMode} ${selectedYear}:`, 
						$state.snapshot(reshapedData.byLocation[selectedLocation]?.data[selectedMode]?.[selectedYear]));
				}
			});

			// Change cursor on hover
			map.on('mouseenter', 'cordon-circles', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'cordon-circles', () => {
				map.getCanvas().style.cursor = '';
			});

		} catch (error) {
			console.error('Error loading cordon data:', error);
		}
	});
</script>

{@render children(cordonContext)}
