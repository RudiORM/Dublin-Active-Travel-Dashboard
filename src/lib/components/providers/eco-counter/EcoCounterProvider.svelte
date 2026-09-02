<script>
	import { onMount, setContext } from 'svelte';
	import { fetchEcoCounterTimeSeries } from '../../../services/eco-counter/eco-counter-api.js';
	import {
		processEcoCounterTimeSeriesData,
		processEcoCounterNetworkView
	} from '../../../services/eco-counter/eco-counter-processor.js';
	import {
		buildEcoCounterCombinedFromServer,
		peekEcoCounterCombinedCache
	} from '../../../services/eco-counter/eco-counter-warm.js';
	import { addEcoCounterMarkers, updateEcoCounterMarkers } from '../../../utils/eco-counter/eco-counter-layers.js';

	// Props
	let { map = null, children, onInitialized = () => {}, serverData = null } = $props();

	/** Bike-only Fingal sites still shown when the pedestrian filter is active. */
	const ECO_ALWAYS_VISIBLE_SITE_IDS = new Set([
		100059508, // Coast Road Totem
		100064636 // Morton Stadium Swords
	]);

	function isEcoAlwaysVisible(location) {
		return ECO_ALWAYS_VISIBLE_SITE_IDS.has(Number(location?.id));
	}

	function locationMatchesMode(location, mode) {
		return Boolean(location?.travelModes?.includes(mode)) || isEcoAlwaysVisible(location);
	}

	// State for eco-counter data
	let ecoCounterData = $state([]);
	/** Merged network weekly buckets (last ~4 weeks) for citywide KPIs. */
	let ecoNetworkWeeklyRecent = $state(
		/** @type {null | Array<{ weekKey: string, pedestrian?: number, bike?: number }>} */ (null)
	);
	/** Last 12 merged calendar months from weekly snapshot (all sites). */
	let ecoNetworkMonthlyTotals = $state(
		/** @type {null | Array<{ monthKey: string, label?: string, pedestrian?: number, bike?: number }>} */ (
			null
		)
	);
	/** Per-site totals from last four weekly buckets in snapshot (citywide sensor bars). */
	let ecoPerSiteLast30d = $state(
		/** @type {null | Array<{ siteId: number, pedestrian?: number, bike?: number }>} */ (null)
	);
	/** Per-site weekly rows from snapshot (network YoY KPI). */
	let ecoPerSiteWeekly = $state(
		/** @type {null | Array<{ siteId: number, weekly?: Array<{ weekKey: string, pedestrian?: number, bike?: number }> }>} */ (null)
	);
	let filteredEcoCounterData = $state([]);
	let selectedLocation = $state(/** @type {null | Object} */ (null));
	let selectedLocationId = $state(/** @type {null | number} */ (null));
	let selectedLocationTimeSeriesData = $state(null);
	let selectedMode = $state('pedestrian');
	let isLoading = $state(false);
	/** True while POST /api/eco-counter/citywide is in flight. */
	let ecoNetworkDailyLoading = $state(false);
	/** True while fetching / processing time series for the selected site (avoids “no data” flash). */
	let ecoTimeSeriesLoading = $state(false);
	let error = $state(null);

	// Filter data based on selected mode
	function updateFilteredData() {
		filteredEcoCounterData = ecoCounterData.filter((location) =>
			locationMatchesMode(location, selectedMode)
		);

		// Update map visualization when filter changes (only update data, don't recreate layers)
		if (map && map.getSource('eco-counter-markers')) {
			
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
						filterMode: selectedMode,
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

	const networkView = $derived.by(() => {
		if (!ecoCounterData.length) return null;
		return processEcoCounterNetworkView(
			ecoCounterData,
			selectedMode,
			ecoNetworkWeeklyRecent ?? undefined,
			ecoNetworkMonthlyTotals ?? undefined,
			ecoPerSiteLast30d ?? undefined,
			ecoPerSiteWeekly ?? undefined
		);
	});

	// Clear selection if current site does not support the active mode
	$effect(() => {
		if (
			selectedLocation &&
			selectedMode &&
			!selectedLocation.travelModes?.includes(selectedMode) &&
			!isEcoAlwaysVisible(selectedLocation)
		) {
			selectedLocation = null;
			selectedLocationId = null;
			selectedLocationTimeSeriesData = null;
			ecoTimeSeriesLoading = false;
			updateMapVisualization();
		}
	});

	async function fetchAndStoreTimeSeries(locationId) {
		const timeSeriesData = await fetchEcoCounterTimeSeries(locationId);
		return processEcoCounterTimeSeriesData(timeSeriesData);
	}

	/** Single path for map, dropdown, and bar chart so loading state and IDs stay consistent. */
	async function applySelectedLocation(/** @type {null | Object} */ location) {
		// Bike-only always-visible sites: switch mode so charts/KPIs work.
		if (
			location?.travelModes?.length &&
			!location.travelModes.includes(selectedMode)
		) {
			const nextMode = location.travelModes.includes('bike')
				? 'bike'
				: location.travelModes[0];
			if (nextMode && nextMode !== selectedMode) {
				selectedMode = nextMode;
				updateFilteredData();
			}
		}

		selectedLocation = location;
		const rawId = location?.id;
		selectedLocationId =
			rawId != null && rawId !== '' ? Number(rawId) : null;
		if (selectedLocationId != null && Number.isNaN(selectedLocationId)) {
			selectedLocationId = null;
		}
		updateMapVisualization();

		if (!location || selectedLocationId == null) {
			ecoTimeSeriesLoading = false;
			selectedLocationTimeSeriesData = null;
			return;
		}

		ecoTimeSeriesLoading = true;
		selectedLocationTimeSeriesData = null;
		try {
			selectedLocationTimeSeriesData = await fetchAndStoreTimeSeries(selectedLocationId);
		} catch {
			selectedLocationTimeSeriesData = null;
		} finally {
			ecoTimeSeriesLoading = false;
		}
	}

	setContext('ecoCounterProvider', {
		get data() { return filteredEcoCounterData; },
		get allLocations() { return ecoCounterData; },
		get networkView() { return networkView; },
		get selectedLocation() { return selectedLocation; },
		get selectedLocationId() { return selectedLocationId; },
		get selectedLocationTimeSeriesData() { return selectedLocationTimeSeriesData; },
		get selectedMode() { return selectedMode; },
		get isLoading() { return isLoading; },
		get ecoNetworkDailyLoading() { return ecoNetworkDailyLoading; },
		get ecoTimeSeriesLoading() { return ecoTimeSeriesLoading; },
		get error() { return error; },
		setSelectedLocation: (location) => applySelectedLocation(location),
		setSelectedMode: (mode) => {
			selectedMode = mode;
			updateFilteredData();
		}
	});

	// Use map directly like other providers do

	async function fetchEcoNetworkSnapshot(siteIds) {
		if (!siteIds.length) {
			ecoNetworkWeeklyRecent = [];
			ecoNetworkMonthlyTotals = [];
			ecoPerSiteLast30d = [];
			ecoPerSiteWeekly = [];
			ecoNetworkDailyLoading = false;
			return;
		}
		ecoNetworkDailyLoading = true;
		try {
			const res = await fetch('/api/eco-counter/citywide', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ siteIds })
			});
			if (!res.ok) {
				ecoNetworkWeeklyRecent = null;
				ecoNetworkMonthlyTotals = null;
				ecoPerSiteLast30d = null;
				ecoPerSiteWeekly = null;
				return;
			}
			const j = await res.json();
			ecoNetworkWeeklyRecent = Array.isArray(j.networkWeeklyRecent) ? j.networkWeeklyRecent : [];
			ecoNetworkMonthlyTotals = Array.isArray(j.networkMonthlyTotals) ? j.networkMonthlyTotals : [];
			ecoPerSiteLast30d = Array.isArray(j.perSiteLast30d) ? j.perSiteLast30d : null;
			ecoPerSiteWeekly = Array.isArray(j.perSiteWeekly) ? j.perSiteWeekly : null;
		} catch {
			ecoNetworkWeeklyRecent = null;
			ecoNetworkMonthlyTotals = null;
			ecoPerSiteLast30d = null;
			ecoPerSiteWeekly = null;
		} finally {
			ecoNetworkDailyLoading = false;
		}
	}

	// Load eco-counter data
	async function loadEcoCounterData() {
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

			const combined =
				peekEcoCounterCombinedCache() ?? buildEcoCounterCombinedFromServer(serverData);

			if (combined === null || combined === undefined) {
				throw new Error('Incomplete server data');
			}

			ecoCounterData = combined;
			ecoNetworkWeeklyRecent = null;
			ecoNetworkMonthlyTotals = null;
			ecoPerSiteLast30d = null;
			ecoPerSiteWeekly = null;
			void fetchEcoNetworkSnapshot(combined.map((l) => l.id));

			if (map && ecoCounterData.length > 0) {
				addEcoCounterMarkers(map, ecoCounterData);
				setupMapInteractions();
				updateFilteredData();
				updateMapVisualization();
			}

		} catch (err) {
			error = err.message;
			ecoNetworkWeeklyRecent = null;
			ecoNetworkMonthlyTotals = null;
			ecoPerSiteLast30d = null;
			ecoPerSiteWeekly = null;
			ecoNetworkDailyLoading = false;
		} finally {
			isLoading = false;
		}
	}

	// Setup map click interactions
	function setupMapInteractions() {
		if (!map) return;


		// Add click handler for markers
		map.on('click', 'eco-counter-markers', async (e) => {
			if (e.features && e.features.length > 0) {
				const feature = e.features[0];
				const rawId = feature.properties?.id;
				const location =
					filteredEcoCounterData.find((loc) => String(loc.id) === String(rawId)) ||
					ecoCounterData.find((loc) => String(loc.id) === String(rawId));

				if (location) {
					await applySelectedLocation(location);
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

	// Update map visualization based on selection
	function updateMapVisualization() {
		if (map) {
			updateEcoCounterMarkers(map, selectedLocationId);
		}
	}

	onMount(async () => {
		
		// Load data when component mounts
		await loadEcoCounterData();
		
		// Notify parent that provider is initialized
		onInitialized();
	});
</script>

{@render children()}
