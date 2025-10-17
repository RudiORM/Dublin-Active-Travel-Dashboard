<script lang="ts">
	import { getContext } from 'svelte';
	import NTAStacked from './NTAStacked.svelte';
	import DataCardSingle from '$lib/components/shared/DataCardSingle.svelte';
	import { getInfrastructureStats, getParkingStats } from '$lib/services/nta/nta-processor.js';
	
	// Props
	let { 
		reshapedData,
		selectedRoute,
		selectedLocation,
		ntaContext
	} = $props();

	// Get context to access selected data source
	const nta = getContext('nta');

	// Get parking statistics
	const parkingStats = $derived.by(() => {
		if (!nta?.parkingData) return null;
		return getParkingStats(nta.parkingData);
	});

	// Get infrastructure statistics based on the selected data source
	const infrastructureStats = $derived.by(() => {
		if (!reshapedData || !nta?.selectedDataSource) {
			return null;
		}
		return /** @type {any} */ (getInfrastructureStats(reshapedData, nta.selectedDataSource));
	});

	// Total length stats
	const totalLengthStats = $derived.by(() => {
		if (!infrastructureStats) return [{ label: "km", value: "0" }];
		
		// Convert from meters to kilometers and format appropriately
		const lengthInKm = infrastructureStats.totalLength / 1000;
		
		let formattedLength;
		if (lengthInKm >= 100) {
			// For lengths >= 100km, show whole numbers
			formattedLength = Math.round(lengthInKm).toLocaleString();
		} else if (lengthInKm >= 10) {
			// For lengths >= 10km, show 1 decimal place
			formattedLength = lengthInKm.toFixed(1);
		} else {
			// For lengths < 10km, show 2 decimal places
			formattedLength = lengthInKm.toFixed(2);
		}
		
		return [{ label: "km", value: formattedLength }];
	});

	// Primary category stats (BIKE types for NTA, cdo_1 for BusConnects)
	const primaryCategoryStats = $derived.by(() => {
		if (!infrastructureStats) return [];
		
		if (nta?.selectedDataSource === 'busconnects') {
			// Show surface types for BusConnects
			const surfaceTypes = infrastructureStats.surfaceTypes || {};
			return Object.entries(surfaceTypes)
				.sort(([,a], [,b]) => b - a) // Sort by count descending
				.slice(0, 3) // Show top 3
				.map(([type, count]) => ({
					label: type.toLowerCase().replace(/([A-Z])/g, ' $1').trim(),
					value: count.toString()
				}));
		} else {
			// Show bike types for NTA
			const bikeTypes = infrastructureStats.bikeTypes || {};
			return Object.entries(bikeTypes)
				.sort(([,a], [,b]) => b - a) // Sort by count descending
				.slice(0, 3) // Show top 3
				.map(([type, count]) => ({
					label: type.toLowerCase().replace(/_/g, ' '),
					value: count.toString()
				}));
		}
	});

	// Secondary category stats (directions for NTA, twoway for BusConnects)
	const secondaryCategoryStats = $derived.by(() => {
		if (!infrastructureStats) return [];
		
		if (nta?.selectedDataSource === 'busconnects') {
			// Show twoway types for BusConnects
			const twowayTypes = infrastructureStats.twowayTypes || {};
			return Object.entries(twowayTypes)
				.sort(([,a], [,b]) => b - a)
				.map(([type, count]) => ({
					label: type.toLowerCase(),
					value: count.toString()
				}));
		} else {
			// Show directions for NTA
			const directions = infrastructureStats.directions || {};
			return Object.entries(directions)
				.sort(([,a], [,b]) => b - a)
				.map(([direction, count]) => ({
					label: direction.toLowerCase().replace(/-/g, ' '),
					value: count.toString()
				}));
		}
	});

	// Get the most common primary category
	const mostCommonCategory = $derived.by(() => {
		if (!primaryCategoryStats || primaryCategoryStats.length === 0) {
			return { type: "N/A", count: "0" };
		}
		const top = primaryCategoryStats[0];
		return { type: top.label, count: top.value };
	});

	// Total segregated bike lane distance stats
	const segregatedLaneStats = $derived.by(() => {
		if (!reshapedData || !nta?.selectedDataSource) return [{ label: "km", value: "0" }];
		
		let segregatedLength = 0;
		
		if (nta.selectedDataSource === 'busconnects') {
			// Filter for "SegregatedCycleLane" in BusConnects data
			const features = reshapedData.geoJsonData?.features || [];
			features.forEach((feature: any) => {
				if (feature.properties?.cdo_1 === 'SegregatedCycleLane') {
					// BusConnects length needs to be multiplied by 1000 to convert to meters
					segregatedLength += (feature.properties?.Shape_Leng || 0) * 1000;
				}
			});
		} else {
			// Filter for "BIKE_LANE" in NTA data
			const features = reshapedData.geoJsonData?.features || [];
			features.forEach((feature: any) => {
				if (feature.properties?.BIKE === 'BIKE_LANE') {
					segregatedLength += feature.properties?.Shape_Leng || 0;
				}
			});
		}
		
		// Convert from meters to kilometers and format
		const lengthInKm = segregatedLength / 1000;
		
		let formattedLength;
		if (lengthInKm >= 100) {
			formattedLength = Math.round(lengthInKm).toLocaleString();
		} else if (lengthInKm >= 10) {
			formattedLength = lengthInKm.toFixed(1);
		} else {
			formattedLength = lengthInKm.toFixed(2);
		}
		
		return [{ label: "km", value: formattedLength }];
	});

	// Total parking spaces stats
	
</script>

<div class="info-panel">
	<div class="panel-header">
		<div class="header-inline">
			<span class="area-label">{nta?.selectedDataSource === 'busconnects' ? 'BusConnects' : 'NTA'} Cycling infrastructure</span>
		</div>
	</div>

	{#if infrastructureStats}
		<NTAStacked 
			title={nta?.selectedDataSource === 'busconnects' ? 'Infastructure type' : 'Infrastructure type'}
			explanation={nta?.selectedDataSource === 'busconnects' 
				? 'Distribution of different surface change types in the BusConnects dataset showing the breakdown of infrastructure modifications.' 
				: 'Distribution of different cycling infrastructure types in the NTA dataset showing the variety of bike facilities available.'}
			reshapedData={reshapedData}
			selectedDataSource={nta?.selectedDataSource}
		/>

		<div class="stats-grid">
			<DataCardSingle 
				title={nta?.selectedDataSource === 'busconnects' ? 'Total length' : 'Total length'}
				stats={totalLengthStats}
				explanation={nta?.selectedDataSource === 'busconnects' 
					? 'Total length of BusConnects cycling infrastructure modifications in kilometers.' 
					: 'Total length of cycling infrastructure in the NTA dataset in kilometers.'}
			/>

			<DataCardSingle 
				title={nta?.selectedDataSource === 'busconnects' ? 'Segregated lanes' : 'Bike lanes'}
				stats={segregatedLaneStats}
				explanation={nta?.selectedDataSource === 'busconnects' 
					? 'Total length of segregated cycle lanes in the BusConnects dataset in kilometers.' 
					: 'Total length of bike lanes in the NTA dataset in kilometers.'}
			/>
			
			
		</div>

		
	{:else}
		<div class="no-data">
			<p>No infrastructure data available.</p>
		</div>
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
		width: 100%;
	}

	.area-label {
		font-size: 22px;
		font-weight: 400;
		color: #000;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.no-data {
		text-align: center;
		padding: 40px 20px;
		color: #6b7280;
	}

	.no-data p {
		margin: 0;
		font-size: 14px;
	}

	@media (max-width: 1200px) {
		.stats-grid {
			grid-template-columns: 1fr;
			padding-bottom: 30px;
		}
	}

	@media (max-width: 950px) {
		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}

		

		.area-label {
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

.area-label {
	font-size: 14px;
}


}
</style>
