<script>
	import { onMount, setContext } from 'svelte';
	import { getContext } from 'svelte';
	import { fetchVivacityCounterLocations, fetchVivacityCounterTraffic, fetchVivacityCounterTimeSeries } from '../../../services/vivacity-counter/vivacity-counter-api.js';
	import { processVivacityCounterLocations, processVivacityCounterTraffic, combineVivacityCounterData, processVivacityCounterTimeSeriesData } from '../../../services/vivacity-counter/vivacity-counter-processor.js';
	import { addVivacityCounterMarkers, updateVivacityCounterMarkers } from '../../../utils/vivacity-counter/vivacity-counter-layers.js';

	// Props
	let { map = null, children, onInitialized = () => {}, serverData = null } = $props();

	// Get map context
	const mapContext = getContext('map');

	// State for vivacity-counter data
	let vivacityCounterData = $state([]);
	let filteredVivacityCounterData = $state([]);
	let selectedLocation = $state(null);
	let selectedLocationId = $state(null);
	let selectedLocationTimeSeriesData = $state(null);
	let selectedMode = $state('pedestrian');
	let isLoading = $state(false);
	let error = $state(null);

	// Filter data based on selected mode
	function updateFilteredData() {
		// Always filter by selected mode (pedestrian or bike)
		filteredVivacityCounterData = vivacityCounterData.filter(location => 
			location.travelModes && location.travelModes.includes(selectedMode)
		);
		
		// Update map visualization when filter changes (only update data, don't recreate layers)
		if (map && map.getSource('vivacity-counter-markers')) {
			console.log(`Filtering vivacity-counter data: ${selectedMode} mode, ${filteredVivacityCounterData.length} locations`);
			
			// Create new GeoJSON with filtered data and filter mode color
			const geojson = {
				type: 'FeatureCollection',
				features: filteredVivacityCounterData.map(location => ({
					type: 'Feature',
					properties: {
						id: location.id,
						name: location.name,
						description: location.description,
						travelModes: location.travelModes,
						isSelected: location.id === selectedLocationId,
						filterMode: selectedMode, // Add filter mode for color styling
						pedestrian_total: location.pedestrian_total || 0 // MISSING! Add activity data for sizing
					},
					geometry: {
						type: 'Point',
						coordinates: [location.longitude, location.latitude]
					}
				}))
			};
			
			// Update the existing source data
			map.getSource('vivacity-counter-markers').setData(geojson);
		}
	}

	// Set context for child components
	setContext('vivacityCounterProvider', {
		get data() { return filteredVivacityCounterData; },
		get selectedLocation() { return selectedLocation; },
		get selectedLocationId() { return selectedLocationId; },
		get selectedLocationTimeSeriesData() { return selectedLocationTimeSeriesData; },
		get selectedMode() { return selectedMode; },
		get isLoading() { return isLoading; },
		get error() { return error; },
		setSelectedLocation: (location) => {
			selectedLocation = location;
			selectedLocationId = location?.id || null;
			updateMapVisualization();
		},
		setSelectedMode: (mode) => {
			selectedMode = mode;
			updateFilteredData();
		}
	});

	// Use map directly like other providers do

	// Load vivacity-counter data
	async function loadVivacityCounterData() {
		console.log('=== VIVACITY PROVIDER DATA LOADING ===');
		console.log('Loading vivacity-counter data from server...');
		console.log('Server data available:', !!serverData);
		console.log('Server data keys:', serverData ? Object.keys(serverData) : 'none');
		
		isLoading = true;
		error = null;

		try {
			// Check if we have server data
			if (!serverData) {
				throw new Error('No server data available');
			}

			console.log('Vivacity server data check:');
			console.log('- vivacityCounterSites:', !!serverData.vivacityCounterSites);
			console.log('- vivacityCounterTraffic:', !!serverData.vivacityCounterTraffic);
			console.log('- vivacityMarkers:', !!serverData.vivacityMarkers);
			console.log('- vivacityCounterError:', serverData.vivacityCounterError);

			// Check for server errors
			if (serverData.vivacityCounterError) {
				console.error('Server reported Vivacity error:', serverData.vivacityCounterError);
				throw new Error(serverData.vivacityCounterError);
			}

			// Get the data from server
			const sitesData = serverData.vivacityCounterSites;
			const trafficData = serverData.vivacityCounterTraffic;
			const markersData = serverData.vivacityMarkers;

			console.log('Raw server data:');
			console.log('- sitesData type:', typeof sitesData, 'available:', !!sitesData);
			console.log('- trafficData type:', typeof trafficData, 'available:', !!trafficData);
			console.log('- markersData type:', typeof markersData, 'available:', !!markersData);
			
			if (markersData) {
				console.log('- markersData structure:', Array.isArray(markersData) ? `Array(${markersData.length})` : Object.keys(markersData));
			}

			// Use the static markers data with pedestrian_total values
			if (markersData && Array.isArray(markersData) && markersData.length > 0) {
				console.log('Using static vivacity markers data...');
				
				// Transform the markers data to the expected format
				vivacityCounterData = markersData.map(marker => {
					console.log('Processing marker:', marker);
					const transformed = {
						id: marker.sensor_id,
						name: `Sensor ${marker.sensor_id}`,
						description: `Vivacity sensor at ${marker.lat}, ${marker.long}`,
						latitude: marker.lat,
						longitude: marker.long,
						pedestrian_total: marker.pedestrian_total,
						cyclist_total: marker.cyclist_total,
						countlines: marker.countlines || [], // Include countlines from server processing
						travelModes: ['pedestrian', 'bike']
					};
					console.log('Transformed marker with countlines:', transformed);
					return transformed;
				});
				
				console.log('Vivacity-counter data loaded from static markers:', vivacityCounterData.length, 'locations');
				console.log('Sample transformed location:', vivacityCounterData[0]);
			} else {
				console.warn('No vivacity markers data available');
				vivacityCounterData = [];
			}

			// Add markers to map directly like other providers (only once)
			if (map && vivacityCounterData.length > 0) {
				console.log('Adding vivacity-counter markers directly to map...');
				addVivacityCounterMarkers(map, vivacityCounterData);
				setupMapInteractions();
				
				// Initialize filtered data
				updateFilteredData();
				
				// Select default vivacity-counter location
				const defaultLocationId = '9712'; // Sensor 9712
				const defaultLocation = vivacityCounterData.find(loc => loc.id === defaultLocationId);
				
				if (defaultLocation) {
					console.log('Setting default vivacity-counter location:', defaultLocation);
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
					console.warn(`Default vivacity-counter location with ID ${defaultLocationId} not found`);
				}
			}

		} catch (err) {
			console.error('Error loading vivacity-counter data:', err);
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	// Setup map click interactions
	function setupMapInteractions() {
		if (!map) return;

		console.log('Setting up vivacity-counter map interactions');

		// Add click handler for markers
		map.on('click', 'vivacity-counter-markers', async (e) => {
			if (e.features && e.features.length > 0) {
				const feature = e.features[0];
				const locationId = feature.properties.id;
				const location = filteredVivacityCounterData.find(loc => loc.id === locationId);
				
				if (location) {
					console.log('Vivacity-counter location selected:', location);
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
		map.on('mouseenter', 'vivacity-counter-markers', () => {
			map.getCanvas().style.cursor = 'pointer';
		});

		map.on('mouseleave', 'vivacity-counter-markers', () => {
			map.getCanvas().style.cursor = '';
		});
	}

	// Fetch time series data for a specific location
	async function fetchLocationTimeSeries(locationId) {
		try {
			console.log(`Fetching time series data for location: ${locationId}`);

			console.log('vivacityCounterData', vivacityCounterData);
			
			// Find the location to get its countlines
			const location = vivacityCounterData.find(loc => loc.id === locationId);
			if (!location || !location.countlines || location.countlines.length === 0) {
				console.error(`No countlines found for location ${locationId}`);
				throw new Error(`No countlines available for location ${locationId}`);
			}
			
			// Use all countline IDs for the location
			const countlineIds = location.countlines.map(cl => cl.id);
			console.log(`Using countline IDs [${countlineIds.join(', ')}] for location ${locationId}`);
			
			// Fetch time series data for all countlines of this location
			const timeSeriesData = await fetchVivacityCounterTimeSeries(countlineIds);
			console.log(`Raw time series data for location ${locationId}:`, timeSeriesData);
			
			// Process the time series data
			const processedData = processVivacityCounterTimeSeriesData(timeSeriesData);
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
			updateVivacityCounterMarkers(map, selectedLocationId);
		}
	}

	onMount(async () => {
		console.log('VivacityCounterProvider mounted');
		
		// Load data when component mounts
		await loadVivacityCounterData();
		
		// Notify parent that provider is initialized
		onInitialized();
	});
</script>

{@render children()}
