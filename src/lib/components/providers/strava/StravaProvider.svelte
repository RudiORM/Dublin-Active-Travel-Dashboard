<script>
	import { onMount, setContext } from 'svelte';
	import { fetchStravaData } from '$lib/services/strava/strava-api.js';
	import { reshapeStravaData } from '$lib/services/strava/strava-processor.js';
	import { addStravaRoutes, updateStravaRoutes } from '$lib/utils/strava/strava-layers.js';

	// Props
	let { map, children, onInitialized } = $props();

	// State
	let stravaData = $state(null);
	let reshapedData = $state({});
	let selectedRoute = $state('Clontarf to City Center');
	let selectedLocation = $state(null);

	// Context for child components
	const stravaContext = {
		get map() { return map; },
		get stravaData() { return stravaData; },
		get reshapedData() { return reshapedData; },
		get selectedRoute() { return selectedRoute; },
		set selectedRoute(value) { selectedRoute = value; },
		get selectedLocation() { return selectedLocation; },
		set selectedLocation(value) { selectedLocation = value; },
		updateVisualization
	};

	setContext('strava', stravaContext);

	// Function to update the map visualization
	function updateVisualization() {
		if (!map || !reshapedData || Object.keys(reshapedData).length === 0) return;
		
		// Update routes with current selection
		updateStravaRoutes(map, reshapedData, selectedRoute);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	onMount(async () => {
		if (!map) return;

		try {
			// Load the strava data
			const data = await fetchStravaData();
			stravaData = data;
			
			// Reshape the data
			reshapedData = reshapeStravaData(data);
			
			console.log('Strava Data loaded:', $state.snapshot(reshapedData));
			
			// Add initial routes (Clontarf to City Center by default)
			addStravaRoutes(map, reshapedData);

			// Initial visualization update
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

			// Add click handler for routes (using the clickable layer)
			map.on('click', 'strava-routes-clickable', (e) => {
				if (e.features && e.features.length > 0) {
					const clickedFeature = e.features[0];
					const routeName = clickedFeature.properties?.route;
					
					if (routeName) {
						// Update the selected route
						selectedRoute = routeName;
						selectedLocation = routeName;
						
						// Update the visualization to show the new selection
						updateVisualization();
						
						console.log(`Route selected: ${routeName}`);
					}
				}
			});

			// Change cursor on hover (using both layers for better UX)
			map.on('mouseenter', 'strava-routes-clickable', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'strava-routes-clickable', () => {
				map.getCanvas().style.cursor = '';
			});

			map.on('mouseenter', 'strava-routes', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'strava-routes', () => {
				map.getCanvas().style.cursor = '';
			});

		} catch (error) {
			console.error('Error loading strava data:', error);
		}
	});
</script>

{@render children(stravaContext)}
