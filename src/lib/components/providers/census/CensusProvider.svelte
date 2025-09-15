<script>
	import { onMount, setContext } from 'svelte';
	import { fetchCensusData } from '$lib/services/census/census-api.js';
	import { reshapeData } from '$lib/services/census/census-processor.js';
	import { addGeoJSONSource, updateGeoJSONSource } from '$lib/services/map/mapbox-service.js';
	import { createChoroplethLayer, createBorderLayer, updateChoroplethVisualization } from '$lib/utils/census/census-layers.js';

	// Props
	let { map, children, onInitialized } = $props();

	// State
	let censusGeoJSON = $state(null);
	let reshapedData = $state({});
	let geometryData = $state({});
	let selectedMode = $state('cycling');
	let selectedPlace = $state('work');
	let selectedYear = $state('2022');
	let selectedArea = $state(null);
	let selectedFilter = $state('all');

	// Context for child components
	const censusContext = {
		get map() { return map; },
		get censusGeoJSON() { return censusGeoJSON; },
		get reshapedData() { return reshapedData; },
		get geometryData() { return geometryData; },
		get selectedMode() { return selectedMode; },
		set selectedMode(value) { selectedMode = value; },
		get selectedPlace() { return selectedPlace; },
		set selectedPlace(value) { selectedPlace = value; },
		get selectedYear() { return selectedYear; },
		set selectedYear(value) { selectedYear = value; },
		get selectedArea() { return selectedArea; },
		set selectedArea(value) { selectedArea = value; },
		get selectedFilter() { return selectedFilter; },
		set selectedFilter(value) { selectedFilter = value; },
		updateVisualization
	};

	setContext('census', censusContext);

	// Function to update the map visualization
	function updateVisualization() {
		if (!map || !reshapedData || Object.keys(reshapedData).length === 0) return;
		
		const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
		const statData = reshapedData[statKey];
		
		if (!statData) return;
		
		// Create a new GeoJSON with percentage values
		const updatedGeoJSON = {
			...censusGeoJSON,
			features: censusGeoJSON.features.map(feature => ({
				...feature,
				properties: {
					...feature.properties,
					selected_percentage: statData[feature.properties.CSO_LEA]?.percentage || 0,
					selected_raw: statData[feature.properties.CSO_LEA]?.raw || 0
				}
			}))
		};
		
		// Update the source data
		updateGeoJSONSource(map, 'census-data', updatedGeoJSON);
		
		// Update visualization
		updateChoroplethVisualization(map, statData, selectedMode, selectedArea);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	onMount(async () => {
		if (!map) return;

		try {
			// Load the census data
			censusGeoJSON = await fetchCensusData();
			
			// Reshape the data with statistic-first hierarchy
			reshapedData = reshapeData(censusGeoJSON.features);
			
			// Store geometry data
			censusGeoJSON.features.forEach(feature => {
				const areaName = feature.properties.CSO_LEA;
				geometryData[areaName] = feature.geometry;
			});
			
			// Add the census data as a source
			addGeoJSONSource(map, 'census-data', censusGeoJSON);

			// Add the choropleth layer
			map.addLayer(createChoroplethLayer('census-data'));

			// Add border/outline layer
			map.addLayer(createBorderLayer('census-data'));

			// Initial visualization
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

			// Add click handler
			map.on('click', 'census-choropleth', (e) => {
				if (e.features.length > 0) {
					const clickedFeature = e.features[0];
					selectedArea = clickedFeature.properties.CSO_LEA;
					
					// Update visualization to show selection
					updateVisualization();
					
					// Log the data for the selected area
					const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
					console.log(`${selectedArea} - ${statKey}:`, $state.snapshot(reshapedData[statKey][selectedArea]));
				}
			});

		} catch (error) {
			console.error('Error loading census data:', error);
		}
	});
</script>

{@render children()}