<script lang="ts">
	import StackedBarH from '$lib/components/shared/StackedBarH.svelte';
	import { cordonColorSchemes } from '$lib/utils/cordon/cordon-colors.js';
	import CordonStacked from './CordonStacked.svelte';
	import CordonTimeSeries from './CordonTimeSeries.svelte';
	import DataCard from '$lib/components/shared/DataCard.svelte';

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
		// Explicitly update visualization to match map click behavior
		cordonContext.updateVisualization();
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

	// Prepare the DataCard stats
	const statsData = $derived.by(() => {
		let walking2022, cycling2022, walking2023, cycling2023;

		if (selectedLocation) {
			// Get data for selected location
			walking2022 = reshapedData.byLocation[selectedLocation]?.data.walking?.['2022']?.raw || 0;
			cycling2022 = reshapedData.byLocation[selectedLocation]?.data.cycling?.['2022']?.raw || 0;
			walking2023 = reshapedData.byLocation[selectedLocation]?.data.walking?.['2023']?.raw || 0;
			cycling2023 = reshapedData.byLocation[selectedLocation]?.data.cycling?.['2023']?.raw || 0;
		} else {
			// Get totals for all locations
			walking2022 = reshapedData.totals.walking?.['2022'] || 0;
			cycling2022 = reshapedData.totals.cycling?.['2022'] || 0;
			walking2023 = reshapedData.totals.walking?.['2023'] || 0;
			cycling2023 = reshapedData.totals.cycling?.['2023'] || 0;
		}

		// Calculate percentage changes
		const walkingChange = walking2022 > 0 
			? ((walking2023 - walking2022) / walking2022 * 100).toFixed(1)
			: '0';
		const cyclingChange = cycling2022 > 0 
			? ((cycling2023 - cycling2022) / cycling2022 * 100).toFixed(1)
			: '0';

		// Format with + or - sign
		const formatChange = (value: string) => {
			const num = parseFloat(value);
			if (num > 0) return `+${value}%`;
			return `${value}%`;
		};

		return [
			{
				title: "Counts on a single day",
				stats: [
					{ label: "cycling counts", value: cycling2023.toLocaleString() },
					{ label: "walking counts", value: walking2023.toLocaleString() },
				],
				explanation: "The total number of cyclists and pedestrians counted at cordon locations at a single day in November 2023."
			},
			{
				title: "Change from 2022 to 2023",
				stats: [
					{ label: "change", value: formatChange(cyclingChange) },
					{ label: "change", value: formatChange(walkingChange) },
				],
				explanation: "The percentage change in cycling and walking counts from 2022 to 2023."
			}
		];
	});

	// Get time series data using yearly totals for all modes
	const timeSeriesData = $derived.by(() => {
		if (!reshapedData || !reshapedData.totals) return [];

		const years = ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022', '2023','2024'];
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
						
					</option>
				{/each}
			</select>
		</div>
	</div>

	{#if currentStats && modeData.length > 0}
	<CordonStacked 
		title="Transportation Mode Distribution"
		modeData={modeData}
		explanation="The distribution of transportation modes for all trips on a single day in 2023."
	/>

	<div class="stats-grid">
		{#each statsData as d}
		<DataCard 
			title={d.title}
			stats={d.stats}
			explanation={d.explanation}
		/>
		{/each}
	</div>

		{#if timeSeriesData.length > 0}
			<CordonTimeSeries 
				title="Time Series - All Cordon Locations"
				timeSeriesData={timeSeriesData}
				explanation="The historical distribution of transportation modes since 2006, summarised for all locations."
			/>
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
		background: #EEF2F6;
		color: #000;
		border: 0px solid #e5e5e5;
		border-radius: 0px;
		cursor: pointer;
		font-family: 'Inter', sans-serif;
		transition: border-color 0.2s ease;
		border-bottom: 1px solid #000;
		max-width: 300px;
	}

	.location-dropdown:hover {
		border-color: white;
	}

	.location-dropdown:focus {
		outline: none;
		border-color: #999;
	}

	.location-dropdown option {
		padding: 8px;
		font-size: 16px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	@media (max-width: 1200px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.location-dropdown {
			max-width: 250px;
		}
	}

	@media (max-width: 950px) {
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}

		.location-dropdown {
			max-width: 100%;
		}

	

		.location-label {
			font-size: 16px;
		}

		.location-dropdown {
			font-size: 16px;
		}
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 620px) {
		.stats-grid {
			margin-top: 10px;
		}
	}

	@media (min-width: 651px) and (max-height: 750px) {

.location-label {
	font-size: 16px;
}

.location-dropdown {
	font-size: 16px;
}


}


</style>