<script>
	import { onMount } from 'svelte';
	import { fetchGoogleData } from '$lib/services/google/google-api.js';
	import { reshapeGoogleData } from '$lib/services/google/google-processor.js';
	import { addGeoJSONSource, updateGeoJSONSource } from '$lib/services/map/mapbox-service.js';
	import { createGoogleChoroplethLayer, createGoogleBorderLayer, updateGoogleVisualization } from '$lib/utils/google/google-layers.js';

	// Props
	let { map, children, onInitialized } = $props();

	// State
	let googleGeoJSON = $state(null);
	let reshapedData = $state({});
	let selectedMode = $state('walking');
	let selectedMetric = $state('trips');
	let selectedScope = $state('full');
	let selectedArea = $state(null);

	// Function to update the map visualization
	function updateVisualization() {
		if (!map || !reshapedData || !reshapedData.byArea) return;
		
		// Create a new GeoJSON with selected values
		const updatedGeoJSON = {
			...googleGeoJSON,
			features: googleGeoJSON.features.map(feature => {
				const areaName = feature.properties.ENG_NAME_VALUE;
				const areaData = reshapedData.byArea[areaName]?.[selectedMode]?.[selectedMetric]?.[selectedScope];
				
				// For trips, use percentages; for other metrics, use raw values
				let selectedValue;
				if (selectedMetric === 'trips' && areaData?.percentage !== undefined) {
					selectedValue = areaData.percentage;
				} else {
					selectedValue = areaData?.raw || 0;
				}
				
				return {
					...feature,
					properties: {
						...feature.properties,
						selected_value: selectedValue
					}
				};
			})
		};
		
		// Update the source data
		updateGeoJSONSource(map, 'google-data', updatedGeoJSON);
		
		// Update visualization
		updateGoogleVisualization(map, reshapedData, selectedMode, selectedMetric, selectedScope, selectedArea);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	// Expose state and functions to child components
	const googleContext = {
		get reshapedData() { return reshapedData; },
		get selectedMode() { return selectedMode; },
		set selectedMode(value) { selectedMode = value; },
		get selectedMetric() { return selectedMetric; },
		set selectedMetric(value) { selectedMetric = value; },
		get selectedScope() { return selectedScope; },
		set selectedScope(value) { selectedScope = value; },
		get selectedArea() { return selectedArea; },
		set selectedArea(value) { selectedArea = value; },
		updateVisualization,
		handleFilterChange
	};

	onMount(async () => {
		if (!map) return;

		try {
			// Load the Google data
			googleGeoJSON = await fetchGoogleData();
			
			// Reshape the data
			reshapedData = reshapeGoogleData(googleGeoJSON.features);
			
			console.log('Google Data loaded:', $state.snapshot(reshapedData));
			
			// Add the Google data as a source
			addGeoJSONSource(map, 'google-data', googleGeoJSON);

			// Add the choropleth layer
			map.addLayer(createGoogleChoroplethLayer('google-data'));

			// Add border/outline layer
			map.addLayer(createGoogleBorderLayer('google-data'));

			// Initial visualization
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

			// Add click handler
			map.on('click', 'google-choropleth', (e) => {
				if (e.features.length > 0) {
					const clickedFeature = e.features[0];
					selectedArea = clickedFeature.properties.ENG_NAME_VALUE;
					
					// Update visualization to show selection
					updateVisualization();
					
					// Log the data for the selected area
					console.log(`${selectedArea} - ${selectedMode} ${selectedMetric} (${selectedScope}):`, 
						$state.snapshot(reshapedData.byArea[selectedArea]?.[selectedMode]?.[selectedMetric]?.[selectedScope]));
				}
			});

		} catch (error) {
			console.error('Error loading Google data:', error);
		}
	});
</script>

{@render children(googleContext)}
