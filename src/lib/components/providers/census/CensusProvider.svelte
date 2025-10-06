<script>
	import { onMount, setContext } from 'svelte';
	import { fetchCensusData } from '$lib/services/census/census-api.js';
	import { reshapeData } from '$lib/services/census/census-processor.js';
	import { addGeoJSONSource, updateGeoJSONSource, zoomToFeature, resetMapView } from '$lib/services/map/mapbox-service.js';
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
	let selectedBoundaryType = $state('lea');

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
		get selectedBoundaryType() { return selectedBoundaryType; },
		set selectedBoundaryType(value) { selectedBoundaryType = value; },
		updateVisualization,
		loadBoundaryData
	};

	setContext('census', censusContext);

	// Function to update the map visualization
	function updateVisualization(skipSourceUpdate = false) {
		if (!map || !reshapedData || Object.keys(reshapedData).length === 0 || !censusGeoJSON) return;
		
		const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
		const statData = reshapedData[statKey];
		
		if (!statData) return;
		
		// Only update source data if needed (not when just changing selection)
		if (!skipSourceUpdate) {
			// Get the correct property name based on boundary type
			const areaProperty = selectedBoundaryType === 'ed' ? 'ED_ENGLISH' : 'CSO_LEA';
			
			// Create a new GeoJSON with percentage values
			const updatedGeoJSON = {
				...censusGeoJSON,
				features: censusGeoJSON.features.map((feature) => ({
					...feature,
					properties: {
						...feature.properties,
						selected_percentage: statData[feature.properties[areaProperty]]?.percentage || 0,
						selected_raw: statData[feature.properties[areaProperty]]?.raw || 0
					}
				}))
			};
			
			// Update the source data
			updateGeoJSONSource(map, 'census-data', updatedGeoJSON);
			
			// Update the censusGeoJSON state to match
			censusGeoJSON = updatedGeoJSON;
		}
		
		// Update visualization (paint properties)
		updateChoroplethVisualization(map, statData, selectedMode, selectedArea || '', selectedBoundaryType);
	}

	// Handle filter changes
	function handleFilterChange() {
		updateVisualization();
	}

	// Function to load boundary data
	async function loadBoundaryData(boundaryType) {
		if (!map) return;

		try {
			// Load the census data for the specified boundary type
			censusGeoJSON = await fetchCensusData(boundaryType);
			
			// Reshape the data with statistic-first hierarchy
			reshapedData = reshapeData(censusGeoJSON.features, boundaryType);
			
			// Store geometry data
			geometryData = {};
			const areaProperty = boundaryType === 'ed' ? 'ED_ENGLISH' : 'CSO_LEA';
			censusGeoJSON.features.forEach((feature) => {
				const areaName = feature.properties[areaProperty];
				geometryData[areaName] = feature.geometry;
			});
			
			// Reset selected area when switching boundary types
			selectedArea = null;

			// Prepare the GeoJSON with styling data BEFORE updating the map source
			const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
			const statData = reshapedData[statKey];
			
			if (statData) {
				// Create a new GeoJSON with percentage values already included
				const styledGeoJSON = {
					...censusGeoJSON,
					features: censusGeoJSON.features.map((feature) => ({
						...feature,
						properties: {
							...feature.properties,
							selected_percentage: statData[feature.properties[areaProperty]]?.percentage || 0,
							selected_raw: statData[feature.properties[areaProperty]]?.raw || 0
						}
					}))
				};
				
				// Update the source data with pre-styled GeoJSON
				if (map.getSource('census-data')) {
					updateGeoJSONSource(map, 'census-data', styledGeoJSON);
				} else {
					addGeoJSONSource(map, 'census-data', styledGeoJSON);
				}
				
				// Update the censusGeoJSON state to match what's on the map
				censusGeoJSON = styledGeoJSON;
			} else {
				// Fallback: update source first, then style
				if (map.getSource('census-data')) {
					updateGeoJSONSource(map, 'census-data', censusGeoJSON);
				} else {
					addGeoJSONSource(map, 'census-data', censusGeoJSON);
				}
			}

			// Update visualization (this will now just update the paint properties)
			updateVisualization();
			
		} catch (error) {
			console.error('Error loading boundary data:', error);
		}
	}

	onMount(async () => {
		if (!map) return;

		try {
			// Load initial boundary data (LEA)
			await loadBoundaryData(selectedBoundaryType);

			// Add the choropleth layer
			map.addLayer(createChoroplethLayer('census-data'));

			// Add border/outline layer
			map.addLayer(createBorderLayer('census-data'));
			
			// Update visualization after layers are added
			updateVisualization();
			
			// Notify parent that provider is initialized
			if (onInitialized) {
				onInitialized();
			}

			// Add click handler
			map.on('click', 'census-choropleth', (e) => {
				if (e.features.length > 0) {
					const clickedFeature = e.features[0];
					const areaProperty = selectedBoundaryType === 'ed' ? 'ED_ENGLISH' : 'CSO_LEA';
					const clickedAreaName = clickedFeature.properties[areaProperty];
					
					// Check if clicking on the same area (toggle zoom out)
					if (selectedArea === clickedAreaName) {
						// Zoom out to default view
						resetMapView(map);
						selectedArea = null;
					} else {
						// Zoom to the clicked feature
						zoomToFeature(map, clickedFeature, { padding: 100, maxZoom: 11 });
						selectedArea = clickedAreaName;
					}
					
					// Update visualization to show selection (skip source update, only change paint properties)
					updateVisualization(true);
					
					// Log the data for the selected area
					if (selectedArea && reshapedData) {
						const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
						const statData = reshapedData[statKey];
						if (statData && statData[selectedArea]) {
							console.log(`${selectedArea} - ${statKey}:`, $state.snapshot(statData[selectedArea]));
						}
					}
				}
			});

		} catch (error) {
			console.error('Error loading census data:', error);
		}
	});
</script>

{@render children()}