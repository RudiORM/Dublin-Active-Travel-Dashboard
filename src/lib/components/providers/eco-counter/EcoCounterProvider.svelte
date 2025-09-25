<script>
	import { onMount, setContext } from 'svelte';
	import { getContext } from 'svelte';
	import { fetchEcoCounterLocations, fetchEcoCounterTraffic, fetchEcoCounterTimeSeries } from '../../../services/eco-counter/eco-counter-api.js';
	import { processEcoCounterLocations, processEcoCounterTraffic, combineEcoCounterData, processEcoCounterTimeSeriesData } from '../../../services/eco-counter/eco-counter-processor.js';
	import { addEcoCounterMarkers, updateEcoCounterMarkers } from '../../../utils/eco-counter/eco-counter-layers.js';

	// Props
	let { map = null, children, onInitialized = () => {}, serverData = null } = $props();

	// Get map context
	const mapContext = getContext('map');

	// State for eco-counter data
	let ecoCounterData = $state([]);
	let filteredEcoCounterData = $state([]);
	let selectedLocation = $state(null);
	let selectedLocationId = $state(null);
	let selectedLocationTimeSeriesData = $state(null);
	let selectedMode = $state('pedestrian');
	let isLoading = $state(false);
	let error = $state(null);

	// Filter data based on selected mode
	function updateFilteredData() {
		// Always filter by selected mode (pedestrian or bike)
		filteredEcoCounterData = ecoCounterData.filter(location => 
			location.travelModes && location.travelModes.includes(selectedMode)
		);
		
		// Update map visualization when filter changes (only update data, don't recreate layers)
		if (map && map.getSource('eco-counter-markers')) {
			console.log(`Filtering eco-counter data: ${selectedMode} mode, ${filteredEcoCounterData.length} locations`);
			
			// Create new GeoJSON with filtered data and filter mode color
			const geojson = {
				type: 'FeatureCollection',
				features: filteredEcoCounterData.map(location => ({
					type: 'Feature',
					properties: {
						id: location.id,
						name: location.name,
						description: location.description,
						travelModes: location.travelModes,
						isSelected: location.id === selectedLocationId,
						filterMode: selectedMode, // Add filter mode for color styling
						total_7day_count: location.total_7day_count || 0 // Add activity data for marker sizing
					},
					geometry: {
						type: 'Point',
						coordinates: [location.longitude, location.latitude]
					}
				}))
			};
			
			// Update the existing source data
			map.getSource('eco-counter-markers').setData(geojson);
		}
	}

	// Set context for child components
	setContext('ecoCounterProvider', {
		get data() { return filteredEcoCounterData; },
		get selectedLocation() { return selectedLocation; },
		get selectedLocationId() { return selectedLocationId; },
		get selectedLocationTimeSeriesData() { return selectedLocationTimeSeriesData; },
		get selectedMode() { return selectedMode; },
		get isLoading() { return isLoading; },
		get error() { return error; },
		setSelectedLocation: async (location) => {
			selectedLocation = location;
			selectedLocationId = location?.id || null;
			updateMapVisualization();
			
			// Fetch time series data for the new location
			if (location && location.id) {
				try {
					await fetchLocationTimeSeries(location.id);
				} catch (error) {
					console.error('Failed to fetch time series data for selected location:', error);
				}
			}
		},
		setSelectedMode: (mode) => {
			selectedMode = mode;
			updateFilteredData();
		}
	});

	// Track previous mode to detect intentional mode switches
	let previousMode = $state('pedestrian');
	let userClickedLocation = $state(false);

	// Watch for selectedMode changes and auto-select default locations only on mode switches
	$effect(() => {
		if (selectedMode && ecoCounterData && ecoCounterData.length > 0) {
			// Only auto-select if the mode actually changed AND user didn't just click a location
			if (selectedMode !== previousMode && !userClickedLocation) {
				console.log('Mode switched from', previousMode, 'to', selectedMode, '- auto-selecting default location');
				
				// Define default locations for each mode
				const defaultLocations = {
					'pedestrian': 100006267,  // Default for walking
					'bike': 300040955         // Default for cycling
				};
				
				const defaultLocationId = defaultLocations[selectedMode];
				if (defaultLocationId) {
					const defaultLocation = ecoCounterData.find(loc => loc.id === defaultLocationId);
					
					// Only auto-select if the location exists and supports the current mode
					if (defaultLocation && defaultLocation.travelModes && defaultLocation.travelModes.includes(selectedMode)) {
						console.log(`Auto-selecting default location for ${selectedMode}:`, defaultLocation);
						selectedLocation = defaultLocation;
						selectedLocationId = defaultLocationId;
						updateMapVisualization();
						
						// Fetch time series data for the new default location
						fetchLocationTimeSeries(defaultLocationId).catch(err => {
							console.warn('Failed to fetch time series for default location:', err);
						});
					} else {
						console.warn(`Default location ${defaultLocationId} not found or doesn't support ${selectedMode} mode`);
					}
				}
			}
			
			// Update previous mode and reset click flag
			previousMode = selectedMode;
			userClickedLocation = false;
		}
	});

	// Use map directly like other providers do

	// Load eco-counter data
	async function loadEcoCounterData() {
		console.log('Loading eco-counter data from server...');
		isLoading = true;
		error = null;

		try {
			// Check if we have server data
			if (!serverData) {
				throw new Error('No server data available');
			}

			// Check for server errors
			if (serverData.ecoCounterError) {
				throw new Error(serverData.ecoCounterError);
			}

			// Get the data from server
			const sitesData = serverData.ecoCounterSites;
			const trafficData = serverData.ecoCounterTraffic;
			const counterActivity = serverData.counterActivity || [];

			if (!sitesData || !trafficData) {
				throw new Error('Incomplete server data');
			}

			// Process locations data and filter by activity
			const allLocations = processEcoCounterLocations(sitesData);
			
			// Filter locations to only include active ones with counter activity data
			const activeLocations = allLocations.filter(location => {
				const activityData = counterActivity.find(activity => activity.site_id === location.id);
				return activityData && activityData.is_active === true;
			});
			
			// Add activity data to locations for marker sizing
			const locationsWithActivity = activeLocations.map(location => {
				const activityData = counterActivity.find(activity => activity.site_id === location.id);
				return {
					...location,
					total_7day_count: activityData ? activityData.total_7day_count : 0
				};
			});
			
			ecoCounterData = locationsWithActivity;
			console.log('Eco-counter data loaded successfully from server:', ecoCounterData);

			// Add markers to map directly like other providers (only once)
			if (map && ecoCounterData.length > 0) {
				console.log('Adding eco-counter markers directly to map...');
				addEcoCounterMarkers(map, ecoCounterData);
				setupMapInteractions();
				
				// Initialize filtered data
				updateFilteredData();
				
				// Select default eco-counter location
				const defaultLocationId = 100006267;
				const defaultLocation = ecoCounterData.find(loc => loc.id === defaultLocationId);
				
				if (defaultLocation) {
					console.log('Setting default eco-counter location:', defaultLocation);
					selectedLocation = defaultLocation;
					selectedLocationId = defaultLocationId;
					updateMapVisualization();
					
					// Fetch time series data for the default location
					try {
						await fetchLocationTimeSeries(defaultLocationId);
					} catch (error) {
						console.error('Failed to fetch time series data for default location:', error);
					}
				} else {
					console.warn(`Default eco-counter location with ID ${defaultLocationId} not found`);
				}
			}

		} catch (err) {
			console.error('Error loading eco-counter data:', err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	// Setup map click interactions
	function setupMapInteractions() {
		if (!map) return;

		console.log('Setting up eco-counter map interactions');

		// Add click handler for markers
		map.on('click', 'eco-counter-markers', async (e) => {
			if (e.features && e.features.length > 0) {
				const feature = e.features[0];
				const locationId = feature.properties.id;
				const location = filteredEcoCounterData.find(loc => loc.id === locationId);
				
				if (location) {
					console.log('Eco-counter location selected:', location);
					userClickedLocation = true; // Flag that user manually clicked a location
					selectedLocation = location;
					selectedLocationId = locationId;
					updateMapVisualization();
					
					// Fetch time series data for the selected location
					try {
						await fetchLocationTimeSeries(locationId);
					} catch (error) {
						console.error('Failed to fetch time series data:', error);
					}
				}
			}
		});

		// Add hover effects
		map.on('mouseenter', 'eco-counter-markers', () => {
			map.getCanvas().style.cursor = 'pointer';
		});

		map.on('mouseleave', 'eco-counter-markers', () => {
			map.getCanvas().style.cursor = '';
		});
	}

	// Fetch time series data for a specific location
	async function fetchLocationTimeSeries(locationId) {
		try {
			console.log(`Fetching time series data for location: ${locationId}`);
			const timeSeriesData = await fetchEcoCounterTimeSeries(locationId);
			console.log(`Raw time series data for location ${locationId}:`, timeSeriesData);
			
			// Process the time series data
			const processedData = processEcoCounterTimeSeriesData(timeSeriesData);
			console.log(`Processed time series data for location ${locationId}:`, processedData);
			
			// Store the processed data
			selectedLocationTimeSeriesData = processedData;
			
			return processedData;
		} catch (error) {
			console.error(`Error fetching time series data for location ${locationId}:`, error);
			throw error;
		}
	}

	// Update map visualization based on selection
	function updateMapVisualization() {
		if (map) {
			updateEcoCounterMarkers(map, selectedLocationId);
		}
	}

	onMount(async () => {
		console.log('EcoCounterProvider mounted');
		
		// Load data when component mounts
		await loadEcoCounterData();
		
		// Notify parent that provider is initialized
		onInitialized();
	});
</script>

{@render children()}
