<script>
	import { onMount } from 'svelte';
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';

	let mapContainer = $state();
	let map = $state();
	let geometryData = $state({}); // Store geometry by CSO_LEA
	let reshapedData = $state({}); // Store reshaped statistics
	let censusGeoJSON = $state(null); // Store original GeoJSON
	
	// Filter states
	let selectedMode = $state('cycling');
	let selectedPlace = $state('work');
	let selectedYear = $state('2022');
	let selectedArea = $state(null);

	// Helper function to extract mode of transport data
	function extractModeData(properties, mode, placeOfBusiness, year) {
		const yearSuffix = year === 2016 ? '_16' : '';
		let rawValue = 0;
		let totalValue = 0;
		
		// Determine the field names based on parameters
		let modeField = '';
		let totalField = '';
		
		// Map mode to actual field name
		const modeMap = {
			'cycling': 'Bicycle',
			'walking': 'On foot'
		};
		
		// Construct field names based on place of business
		if (placeOfBusiness === 'work_school_college') {
			// Total for both work and school/college
			modeField = `${modeMap[mode]} - Total${yearSuffix}`;
			totalField = `Total${yearSuffix}`;
		} else if (placeOfBusiness === 'work') {
			modeField = `${modeMap[mode]} - Work${yearSuffix}`;
			totalField = `Total - Work${yearSuffix}`;
		} else if (placeOfBusiness === 'school_college') {
			modeField = `${modeMap[mode]} - School, college or childcare${yearSuffix}`;
			totalField = `Total - School, college or childcare${yearSuffix}`;
		}
		
		// Get the values
		rawValue = properties[modeField] || 0;
		totalValue = properties[totalField] || 0;
		
		// Calculate percentage
		const percentage = totalValue > 0 ? (rawValue / totalValue) * 100 : 0;
		
		return {
			raw: rawValue,
			percentage: percentage,
			total: totalValue
		};
	}

	// Function to reshape the data with statistic-first hierarchy
	function reshapeData(features) {
		const reshaped = {};
		
		// Define all combinations
		const modes = ['cycling', 'walking'];
		const placesOfBusiness = ['work_school_college', 'work', 'school_college'];
		const years = [2016, 2022];
		
		// Initialize structure with statistic keys first
		modes.forEach(mode => {
			placesOfBusiness.forEach(place => {
				years.forEach(year => {
					const key = `${mode}_${place}_${year}`;
					reshaped[key] = {};
				});
			});
		});
		
		// Process each feature
		features.forEach(feature => {
			const areaName = feature.properties.CSO_LEA;
			
			// Store geometry
			geometryData[areaName] = feature.geometry;
			
			// Generate all 12 combinations for this area
			modes.forEach(mode => {
				placesOfBusiness.forEach(place => {
					years.forEach(year => {
						const key = `${mode}_${place}_${year}`;
						reshaped[key][areaName] = extractModeData(
							feature.properties, 
							mode, 
							place, 
							year
						);
					});
				});
			});
		});
		
		// Add totals for each statistic
		Object.keys(reshaped).forEach(statKey => {
			let totalRaw = 0;
			let totalPercentageSum = 0;
			let areaCount = 0;
			
			Object.keys(reshaped[statKey]).forEach(areaName => {
				if (areaName !== '_TOTAL') {
					totalRaw += reshaped[statKey][areaName].raw;
					totalPercentageSum += reshaped[statKey][areaName].percentage;
					areaCount++;
				}
			});
			
			// Add total as a special key
			reshaped[statKey]['_TOTAL'] = {
				raw: totalRaw,
				averagePercentage: areaCount > 0 ? totalPercentageSum / areaCount : 0,
				areaCount: areaCount
			};
		});
		
		return reshaped;
	}

	// Function to update the map based on selected filters
	function updateMapVisualization() {
		if (!map || !reshapedData || Object.keys(reshapedData).length === 0) return;
		
		const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
		const statData = reshapedData[statKey];
		
		if (!statData) return;
		
		// Get min and max values for the selected statistic (using percentages)
		const percentages = Object.keys(statData)
			.filter(key => key !== '_TOTAL')
			.map(areaName => statData[areaName].percentage);
		
		const maxPercentage = Math.max(...percentages);
		const minPercentage = Math.min(...percentages);
		
		// Define color scheme based on mode
		const colorSchemes = {
			cycling: [

'#d4e3ff',
'#c1d3f2',
'#afc2e5',
'#9cb3d8',
'#89a3cb',
'#7794bf',
'#6485b2',
'#5076a6',









			],
			walking: [
'#ffeaeb',
'#f9d9da',
'#f3c8ca',
'#ecb7b9',
'#e5a6a9',
'#de9599',
'#d6848a',
'#ce737a',
			]
		};
		
		const colors = colorSchemes[selectedMode];
		
		// Create color stops
		let colorStops = [];
		for (let i = 0; i < 8; i++) {
			const value = minPercentage + (maxPercentage - minPercentage) * (i / 7);
			colorStops.push([value, colors[i]]);
		}
		
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
		const source = map.getSource('census-data');
		if (source) {
			source.setData(updatedGeoJSON);
		}
		
		// Update the paint property
		map.setPaintProperty('census-choropleth', 'fill-color', [
			'case',
			['==', ['get', 'CSO_LEA'], selectedArea || ''],
			'#F8D463',
			[
				'interpolate',
				['linear'],
				['get', 'selected_percentage'],
				...colorStops.flat()
			]
		]);
	}

	// Function to handle filter changes and update visualization
	function handleFilterChange() {
		updateMapVisualization();
	}

	onMount(async () => {
		mapboxgl.accessToken = PUBLIC_MAPBOX_TOKEN;

		map = new mapboxgl.Map({
			container: mapContainer,
			style: 'mapbox://styles/mapbox/satellite-v9',
			center: [-6.0203, 53.3998], // Dublin coordinates
			zoom: 9.5
		});

		// Load the census data
		const response = await fetch('/census_data_lea.geojson');
		censusGeoJSON = await response.json();

		// Reshape the data with statistic-first hierarchy
		reshapedData = reshapeData(censusGeoJSON.features);
		
		// Log the reshaped data to verify structure
		console.log('Reshaped Data:', reshapedData);

		map.on('load', () => {
			// Add the census data as a source
			map.addSource('census-data', {
				type: 'geojson',
				data: censusGeoJSON
			});

			// Add the choropleth layer
			map.addLayer({
				id: 'census-choropleth',
				type: 'fill',
				source: 'census-data',
				paint: {
					'fill-color': '#cccccc',
					'fill-opacity': 0.8,
					'fill-outline-color': '#ffffff'
				}
			});

			// Initial visualization
			updateMapVisualization();

			// Add click handler
			map.on('click', 'census-choropleth', (e) => {
				if (e.features.length > 0) {
					const clickedFeature = e.features[0];
					selectedArea = clickedFeature.properties.CSO_LEA;
					
					// Update visualization to show selection
					updateMapVisualization();
					
					// Log the data for the selected area
					const statKey = `${selectedMode}_${selectedPlace}_${selectedYear}`;
					console.log(`${selectedArea} - ${statKey}:`, reshapedData[statKey][selectedArea]);
				}
			});

		
		});

		return () => {
			map?.remove();
		};
	});
</script>

<!-- Filter Bar -->
<div class="filter-bar">
	<div class="filter-group">
		<select bind:value={selectedMode} class="filter-select" onchange={handleFilterChange}>
			<option value="cycling">Cycling</option>
			<option value="walking">Walking</option>
		</select>
		<span class="filter-label">to</span>
		<select bind:value={selectedPlace} class="filter-select" onchange={handleFilterChange}>
			<option value="work">Work</option>
			<option value="school_college">School or college</option>
			<option value="work_school_college">Work, school or college</option>
		</select>
		<span class="filter-label">in</span>
		<select bind:value={selectedYear} class="filter-select" onchange={handleFilterChange}>
			<option value="2022">2022</option>
			<option value="2016">2016</option>
		</select>
	</div>
	
	{#if reshapedData[`${selectedMode}_${selectedPlace}_${selectedYear}`]}
		<div class="stats-display">
			<span class="stat-item">
				Total: {reshapedData[`${selectedMode}_${selectedPlace}_${selectedYear}`]['_TOTAL'].raw.toLocaleString()}
			</span>
			<span class="stat-item">
				Average: {reshapedData[`${selectedMode}_${selectedPlace}_${selectedYear}`]['_TOTAL'].averagePercentage.toFixed(1)}%
			</span>
		</div>
	{/if}
</div>

<div bind:this={mapContainer} class="map-container"></div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}

	:global(#svelte) {
		height: 100vh;
	}

	.map-container {
		width: 100vw;
		height: 100vh;
		position: fixed;
		top: 0;
		left: 0;
	}
	
	.filter-bar {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		padding: 15px 25px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 20px;
	}
	
	.filter-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	
	.filter-select {
		padding: 8px 12px;
		border: none;
		background: #f0f0f0;
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		transition: background 0.2s;
		min-width: 100px;
	}
	
	.filter-select:hover {
		background: #e0e0e0;
	}
	
	.filter-select:focus {
		outline: 2px solid #4292c6;
		outline-offset: 2px;
	}
	
	.filter-label {
		color: #666;
		font-size: 16px;
	}
	
	.stats-display {
		display: flex;
		gap: 15px;
		padding-left: 20px;
		border-left: 1px solid #ddd;
	}
	
	.stat-item {
		color: #333;
		font-size: 14px;
		font-weight: 500;
	}
</style>