<script>
	import { onMount, setContext } from 'svelte';
	import { getContext } from 'svelte';
	import { fetchVivacityCounterLocations, fetchVivacityCounterTraffic, fetchVivacityCounterTimeSeries } from '../../../services/vivacity-counter/vivacity-counter-api.js';
	import { loadCitywideData, peekCitywideCache } from '../../../services/vivacity-counter/vivacity-citywide-load.js';
	import { processCitywideVivacityResponse, processVivacityCounterLocations, processVivacityCounterTraffic, combineVivacityCounterData, processVivacityCounterTimeSeriesData } from '../../../services/vivacity-counter/vivacity-counter-processor.js';
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
	let citywideRaw = $state(null);
	let citywideError = $state(null);
	let citywideLoading = $state(false);

	const citywideView = $derived.by(() => {
		if (!citywideRaw) return null;
		return processCitywideVivacityResponse(citywideRaw, selectedMode);
	});

	// Filter data based on selected mode
	function updateFilteredData() {
		// Always filter by selected mode (pedestrian or bike)
		filteredVivacityCounterData = vivacityCounterData.filter(location => 
			location.travelModes && location.travelModes.includes(selectedMode)
		);
		
		// Update map visualization when filter changes (only update data, don't recreate layers)
		if (map && map.getSource('vivacity-counter-markers')) {
			
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
		/** All sensors (unfiltered); use for lookups e.g. bar chart → map selection */
		get allLocations() { return vivacityCounterData; },
		get selectedLocation() { return selectedLocation; },
		get selectedLocationId() { return selectedLocationId; },
		get selectedLocationTimeSeriesData() { return selectedLocationTimeSeriesData; },
		get selectedMode() { return selectedMode; },
		get isLoading() { return isLoading; },
		get error() { return error; },
		get citywideView() { return citywideView; },
		get citywideError() { return citywideError; },
		get citywideLoading() { return citywideLoading; },
		setSelectedLocation: async (location) => {
			selectedLocation = location;
			selectedLocationId = location?.id || null;
			updateMapVisualization();
			
			if (location && location.id) {
				try {
					await fetchLocationTimeSeries(location.id);
				} catch (e) {
					console.error('[VivacityCounterProvider] time series failed', location.id, e);
					selectedLocationTimeSeriesData = null;
				}
			} else {
				selectedLocationTimeSeriesData = null;
			}
		},
		setSelectedMode: (mode) => {
			selectedMode = mode;
			updateFilteredData();
		}
	});

	async function loadCitywideSnapshot() {
		if (!vivacityCounterData.length) return;
		const sensors = vivacityCounterData
			.map((loc) => ({
				id: String(loc.id),
				name: loc.name,
				countlineIds: (loc.countlines || [])
					.map((c) => String(c?.id ?? c?.countline_id ?? c?.countlineId ?? '').trim())
					.filter((id) => id.length > 0 && id !== 'undefined')
			}))
			.filter((s) => s.countlineIds.length > 0);
		if (sensors.length === 0) {
			citywideError =
				'No countlines found for sensors (check hardware metadata). Citywide view needs countline IDs.';
			return;
		}

		const cached = peekCitywideCache(sensors);
		if (cached) {
			citywideRaw = cached;
			citywideError = null;
			return;
		}

		citywideLoading = true;
		citywideError = null;
		try {
			citywideRaw = await loadCitywideData(sensors);
		} catch (e) {
			citywideError = e?.message || 'Citywide data failed to load';
			citywideRaw = null;
		} finally {
			citywideLoading = false;
		}
	}

	// Use map directly like other providers do

	// Load vivacity-counter data
	async function loadVivacityCounterData() {
		
		isLoading = true;
		error = null;

		try {
			// Check if we have server data
			if (!serverData) {
				throw new Error('No server data available');
			}


			// Check for server errors
			if (serverData.vivacityCounterError) {
				throw new Error(serverData.vivacityCounterError);
			}

			// Get the data from server
			const sitesData = serverData.vivacityCounterSites;
			const trafficData = serverData.vivacityCounterTraffic;
			const markersData = serverData.vivacityMarkers;

			// Use the static markers data with pedestrian_total values
			if (markersData && Array.isArray(markersData) && markersData.length > 0) {
				
				// Transform the markers data to the expected format
				vivacityCounterData = markersData.map(marker => {
					const transformed = {
						id: marker.sensor_id,
						name: marker.name || `Sensor ${marker.sensor_id}`,
						description: `Vivacity sensor at ${marker.lat}, ${marker.long}`,
						latitude: marker.lat,
						longitude: marker.long,
						pedestrian_total: marker.pedestrian_total,
						cyclist_total: marker.cyclist_total,
						countlines: marker.countlines || [], // Include countlines from server processing
						travelModes: ['pedestrian', 'bike']
					};
					return transformed;
				});
				
			} else {
				vivacityCounterData = [];
			}

			// Citywide does not need the map — fetch as soon as we have countlines (not gated on map).
			if (vivacityCounterData.length > 0) {
				void loadCitywideSnapshot();
			}

			// Add markers to map directly like other providers (only once)
			if (map && vivacityCounterData.length > 0) {
				addVivacityCounterMarkers(map, vivacityCounterData);
				setupMapInteractions();

				updateFilteredData();
			}

		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	// Setup map click interactions
	function setupMapInteractions() {
		if (!map) return;


		// Add click handler for markers
		map.on('click', 'vivacity-counter-markers', async (e) => {
			if (e.features && e.features.length > 0) {
				const feature = e.features[0];
				const locationId = feature.properties.id;
				const location = filteredVivacityCounterData.find(
					(loc) => String(loc.id) === String(locationId)
				);
				
				if (location) {
					// Use the setSelectedLocation from context which handles time series fetching
					selectedLocation = location;
					selectedLocationId = locationId;
					updateMapVisualization();
					
					// Fetch time series data for the selected location
					try {
						await fetchLocationTimeSeries(locationId);
					} catch {
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

			
			// Find the location to get its countlines
			const location = vivacityCounterData.find(
				(loc) => String(loc.id) === String(locationId)
			);
			if (!location || !location.countlines || location.countlines.length === 0) {
				throw new Error(`No countlines available for location ${locationId}`);
			}
			
			// Use all countline IDs for the location
			const countlineIds = (location.countlines || [])
				.map((cl) => cl?.id ?? cl?.countline_id ?? cl?.countlineId)
				.filter((id) => id != null && String(id).trim() !== '');
			
			// Pass sensor id so the API can merge static snapshot + small incremental Vivacity pulls
			const timeSeriesData = await fetchVivacityCounterTimeSeries(countlineIds, location.id);
			
			// Process the time series data
			const processedData = processVivacityCounterTimeSeriesData(timeSeriesData);
			
			// Store the processed data
			selectedLocationTimeSeriesData = processedData;
			
			return processedData;
		} catch (error) {
			console.error('[VivacityCounterProvider] fetchLocationTimeSeries', locationId, error);
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
		
		// Load data when component mounts
		await loadVivacityCounterData();
		
		// Notify parent that provider is initialized
		onInitialized();
	});
</script>

{@render children()}
