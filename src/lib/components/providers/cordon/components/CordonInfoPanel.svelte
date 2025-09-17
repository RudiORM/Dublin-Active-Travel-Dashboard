<script lang="ts">
	import StackedBarH from '$lib/components/shared/StackedBarH.svelte';
	import StackedBarTimeSeries from '$lib/components/shared/StackedBarTimeSeries.svelte';
	import { cordonColorSchemes } from '$lib/utils/cordon/cordon-colors.js';

	// Props passed from parent
	let { 
		reshapedData,
		selectedMode,
		selectedYear,
		selectedLocation,
		cordonContext
	} = $props();

	// Get available locations, sorted by value for selected mode/year
	let availableLocations = $derived.by(() => {
		if (!reshapedData || !reshapedData.byLocation) return [];
		
		const locations = Object.keys(reshapedData.byLocation)
			.filter(locationName => {
				const location = reshapedData.byLocation[locationName];
				return location.data[selectedMode]?.[selectedYear]?.raw > 0;
			})
			.map(locationName => {
				const location = reshapedData.byLocation[locationName];
				const value = location.data[selectedMode]?.[selectedYear]?.raw || 0;
				return {
					value: locationName,
					label: locationName,
					count: value
				};
			})
			.sort((a, b) => b.count - a.count); // Sort by count descending
		
		return [
			{ value: null, label: 'All Locations', count: 0 },
			...locations
		];
	});

	// Handle dropdown change
	function handleLocationChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newValue = target.value === 'null' ? null : target.value;
		cordonContext.selectedLocation = newValue;
	}

	// Get display name for selected location
	const displayName = $derived.by(() => {
		if (!selectedLocation) return 'All Locations';
		return selectedLocation;
	});

	// Get total counts for all modes at selected location (or overall totals)
	const modeData = $derived.by(() => {
		if (!reshapedData) return [];

		// Individual modes from data
		const individualModes = ['walking', 'cycling', 'cars', 'motorcycles', 'taxis', 'hgvs', 'bus'];
		
		// Group into categories
		const categories = {
			walking: 0,
			cycling: 0,
			automobile: 0,
			public: 0
		};

		individualModes.forEach(mode => {
			let value = 0;
			
			if (selectedLocation) {
				// Get value for specific location
				value = reshapedData.byLocation[selectedLocation]?.data[mode]?.[selectedYear]?.raw || 0;
			} else {
				// Get total for all locations
				value = reshapedData.totals[mode]?.[selectedYear] || 0;
			}

			// Map to categories according to your mapping
			if (mode === 'walking') {
				categories.walking += value;
			} else if (mode === 'cycling') {
				categories.cycling += value;
			} else if (['cars', 'motorcycles', 'taxis', 'hgvs'].includes(mode)) {
				categories.automobile += value;
			} else if (mode === 'bus') {
				categories.public += value;
			}
		});

		// Create data array for chart
		const data: Array<{label: string, value: number, color: string}> = [];
		
		Object.entries(categories).forEach(([category, value]) => {
			if (value > 0) {
				let label = category.charAt(0).toUpperCase() + category.slice(1);
				if (category === 'public') label = 'Public Transport';
				if (category === 'automobile') label = 'Automobile';
				
				// Get the primary color directly from the color scheme
				const colors = cordonColorSchemes[category as keyof typeof cordonColorSchemes] || cordonColorSchemes.walking;
				const primaryColor = colors[colors.length - 1]; // Last (darkest) color
				
				data.push({
					label: label,
					value: value,
					color: primaryColor
				});
			}
		});

		return data;
	});

	// Get stats for current selection
	const currentStats = $derived.by(() => {
		if (!reshapedData || !selectedMode || !selectedYear) return null;
		
		if (selectedLocation) {
			return reshapedData.byLocation[selectedLocation]?.data[selectedMode]?.[selectedYear];
		} else {
			return {
				raw: reshapedData.totals[selectedMode]?.[selectedYear] || 0,
				mode: selectedMode,
				year: selectedYear
			};
		}
	});

	// Get time series data using yearly totals for all modes
	const timeSeriesData = $derived.by(() => {
		if (!reshapedData || !reshapedData.totals) return [];

		const years = ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022', '2023'];
		const modes = ['walking', 'cycling', 'cars', 'motorcycles', 'taxis', 'hgvs', 'bus'];
		
		return years.map(year => {
			const values: Record<string, number> = {};
			
			modes.forEach(mode => {
				const value = reshapedData.totals[mode]?.[year] || 0;
				if (value > 0) {
					values[mode] = value;
				}
			});
			
			return {
				year,
				values
			};
		}).filter(yearData => Object.keys(yearData.values).length > 0);
	});
</script>

<div class="info-panel">
	<div class="panel-header">
		<div class="header-inline">
			<span class="location-label">Cordon counts for</span>
			<select 
				id="location-select" 
				class="location-dropdown" 
				value={selectedLocation || 'null'} 
				onchange={handleLocationChange}
			>
				{#each availableLocations as location}
					<option value={location.value || 'null'}>
						{location.label}
						{#if location.count > 0}({location.count}){/if}
					</option>
				{/each}
			</select>
		</div>
	</div>

	{#if currentStats && modeData.length > 0}
		<div class="stats-section">
			<h4>Transportation Mode Distribution</h4>
			<StackedBarH 
				data={modeData}
				height={50}
				showLabels={true}
				labelPosition="outside"
			/>
		</div>

		<div class="current-selection">
			<div class="stat-card">
				<div class="stat-value">{currentStats.raw.toLocaleString()}</div>
				<div class="stat-label">
					{selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} 
					counts in {selectedYear}
				</div>
			</div>
		</div>

		{#if timeSeriesData.length > 0}
			<div class="time-series-section">
				<h4>Time Series - All Cordon Locations Combined (2006-2023)</h4>
				<StackedBarTimeSeries 
					data={timeSeriesData}
					height={250}
					showLabels={true}
					showYearLabels={true}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: 100%;
	}

	.header-inline {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.location-label {
		font-size: 22px;
		font-weight: 400;
		color: #000;
		white-space: nowrap;
	}

	.location-dropdown {
		font-size: 22px;
		font-weight: 400;
		padding-bottom: 2px;
		color: #000;
		background: white;
		border: 0px solid #e5e5e5;
		border-radius: 0px;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: border-color 0.2s ease;
		border-bottom: 1px solid #000;
		max-width: 300px;
	}

	.location-dropdown:hover {
		border-color: #d1d5db;
	}

	.location-dropdown:focus {
		outline: none;
		border-color: #999;
	}

	.location-dropdown option {
		padding: 8px;
		font-size: 16px;
	}

	.stats-section {
		background: #f9fafb;
		padding: 20px;
		border-radius: 8px;
	}

	.stats-section h4 {
		margin: 0 0 15px 0;
		font-size: 16px;
		font-weight: 500;
		color: #374151;
	}

	.time-series-section {
		background: #f9fafb;
		padding: 20px;
		border-radius: 8px;
	}

	.time-series-section h4 {
		margin: 0 0 15px 0;
		font-size: 16px;
		font-weight: 500;
		color: #374151;
	}

	.current-selection {
		display: flex;
		gap: 15px;
	}

	.stat-card {
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		flex: 1;
		text-align: center;
	}

	.stat-value {
		font-size: 32px;
		font-weight: 600;
		color: #111827;
		margin-bottom: 8px;
	}

	.stat-label {
		font-size: 14px;
		color: #6b7280;
		font-weight: 400;
	}

	@media (max-width: 1300px) {
		.location-dropdown {
			max-width: 250px;
		}
	}

	@media (max-width: 950px) {
		.stats-section {
			padding: 15px;
		}

		.time-series-section {
			padding: 15px;
		}

		.stat-card {
			padding: 15px;
		}

		.stat-value {
			font-size: 24px;
		}
	}
</style>
