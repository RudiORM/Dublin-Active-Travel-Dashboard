<script>

import SingleItemTimeSeries from '$lib/components/shared/SingleItemTimeSeries.svelte';
import { getRouteColor } from '$lib/utils/strava/strava-colors.js';

	// Props
	let {
		title,
		explanation,
		timeSeriesData,
		routeName,
		totals
	} = $props();

	let showExplanation = $state(false);
	let explanationButton;

	// Transform the time series data for the chart component
	const chartData = $derived.by(() => {
		if (!timeSeriesData || timeSeriesData.length === 0) {
			return [];
		}
		
		// Filter to only include last 24 data points
		const filteredData = timeSeriesData.slice(-24);
		
		return filteredData.map((item) => ({
			date: item.date,
			value: item.value
		}));
	});

	// Get the color for the selected route
	const routeColor = $derived.by(() => {
		return getRouteColor(routeName);
	});
</script>

<div class="stats-section">
	<div class="info-position">
		<button
			bind:this={explanationButton}
			class="info-button"
			class:expanded={showExplanation}
			onclick={() => {
				showExplanation = !showExplanation;
				if (showExplanation) {
					// Reset scroll to top when opening
					setTimeout(() => {
						if (explanationButton) {
							explanationButton.scrollTop = 0;
						}
					}, 10);
				}
			}}
		>
			{#if showExplanation}
				<div class="explanation-content">
					<p>{explanation}</p>
				</div>
			{:else}
				<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 187.39 187.53">
					<path d="M93.78,13.7c44.15,0,80.07,35.92,80.07,80.07s-35.92,80.07-80.07,80.07S13.71,137.92,13.71,93.77,49.63,13.7,93.78,13.7M93.78.24C42.12.24.24,42.11.24,93.77s41.88,93.53,93.53,93.53,93.53-41.88,93.53-93.53S145.43.24,93.78.24h0Z"/>
					<path d="M82.72,53.87c0-5.64,4.91-10.22,10.95-10.22s10.95,4.58,10.95,10.22-4.98,10.22-10.95,10.22-10.95-4.51-10.95-10.22ZM83.71,76.78h19.91v65.19h-19.91v-65.19Z"/>
				</svg>
			{/if}
		</button>
	</div>
	<div class="stats-section-header">
		<h4 class="title">{title}</h4>
	</div>

	<div class="chart-section">
		{#if chartData.length > 0}
			<SingleItemTimeSeries 
				data={chartData} 
				color={routeColor}
				height={200}
				showLabels={true}
			/>
		{:else}
			<div class="no-data">
				<p>No time series data available</p>
			</div>
		{/if}
	</div>


</div>

<style>
	.info-position {
		position: absolute;
		top: 0px;
		right: 20px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
		margin-top:-7px;
	}

	.chart-section{
		padding: 20px;
		min-height: 160px;
		height: calc(100svh - 690px);
		max-height: 240px;
	}

	.stats-section {
		background: #fff;
		padding: 0px;
		border-radius: 10px;
		max-width: 570px;
		position: relative;
	}

	.stats-section-header {
		display: grid;
		grid-template-columns: 70% 30%;
		align-items: center;
		border-radius: 10px 10px 0 0;
		padding-left: 15px;
		background: #A8E9DA;
		min-height: 60px;
		height: 60px;
	}

	.title {
		margin: 0;
		color: #333;
		font-size: 16px;
		font-weight: 400;
	}

	.info-button {
		justify-self: right;
		width: 20px;
		height: 20px;
		border: none;
		background: none;
		color: #000;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		padding: 0;
	}

	.info-button svg {
		width: 100%;
		height: 100%;
		fill: #000;
	}

	.info-button.expanded {
		width: 560px;	
		border-radius: 10px;
		background-color: #FFD249;
		backdrop-filter: blur(5px);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		margin-right: -20px;
		border: 0px solid white;
		overflow-y: scroll;
		padding: 0px;
		transform: translateY(50%);
		min-height: 220px;
		height: calc(100svh - 630px);
		max-height: 300px;
		margin-top: -46px;
	}

	.explanation-content {
		padding: 0px;
		text-align: center;
		max-width: 90%;
	}

	.explanation-content p {
		margin: 0;
		font-size: 16px;
		line-height: 1.5;
		color: #333;
		font-weight: 400;
	}


	@media (max-width: 1200px) {
		.info-button.expanded {
			width: 270px;	
		}
	}

	@media (max-width: 950px) {
		.info-button.expanded {
			width: calc(100vw - 340px);
		}

		.stats-section {
			max-width: 100%;
		}
	}

	@media (max-width: 650px) {
		.info-button.expanded {
			width: calc(100vw - 80px);
		}

		
	}


@media (min-width: 651px) and (max-height: 750px) {

	.info-button svg {
		width: 90%;
		height: 90%;
		fill: #000;
	}

	.stats-section-header {
		height: 50px;
		min-height: 50px;
	}

	.title {
		font-weight: 400;
		font-size: 14px;
	}

	.chart-section{
		padding: 20px;
		min-height: 150px;
		height: 150px;
	}

	.info-button.expanded{
		margin-top: -46px;
		height: 200px;
		min-height: 200px;
		width: 460px;
	}



}


@media (max-width: 1200px) and (max-height: 750px) {
		.info-button.expanded {
			width: 220px;	
		}
	}

	

	@media (max-width: 950px) and (max-height: 750px) {
		.info-button.expanded {
			width: calc(100vw - 340px);
		}}


		@media (max-width: 650px) and (max-height: 750px) {
		.info-button.expanded {
			width: calc(100vw - 80px);
		}

		
	}


</style>