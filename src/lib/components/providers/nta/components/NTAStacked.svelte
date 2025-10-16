<script lang="ts">
import NTATimeSeries from './NTATimeSeries.svelte';

	// Props
	let {
		title,
		explanation,
		reshapedData,
		selectedDataSource,
	} = $props();

	let showExplanation = $state(false);
	let explanationButton: HTMLButtonElement;
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
	<div class="stat-grid">
		<div class="chart-section">
			<NTATimeSeries 
				reshapedData={reshapedData}
				selectedDataSource={selectedDataSource}
			/>
		</div>
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
		height: 180px;
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
		margin-top: 192px;
		height: 240px;
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

	h4{
		font-weight: 400;
	}

	.stat-grid {
		display: flex;
		flex-direction: column;
	}







	@media (max-width: 1200px){
		.info-button.expanded {
			width: 270px;	
			margin-top: 192px;
			height: 240px;
	}}




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
			height: 240px;
			margin-top: 194px;
	}


	.chart-section
	{
		height: 180px;
	}

	}



@media (min-width: 651px) and (max-height: 750px) {
	.stats-section-header {
		height: 50px;
		min-height: 50px;
	}

	.title {
		font-weight: 400;
		font-size: 14px;
	}

	.chart-section
	{
		height: 160px;
	}


	.explanation-content p {
		font-size: 14px;
	}

	.info-button svg {
		width: 90%;
		height: 90%;
		fill: #000;
	}


}





@media (min-width: 1200px) and (max-height: 750px) {

.info-button.expanded {
	width: 460px;
	height: 200px;
	margin-top: 150px;
}

.chart-section
	{
		height: 150px;
	}
}


@media (min-width: 651px) and (max-height: 750px) {
	.stats-section-header {
		height: 50px;
		min-height: 50px;
	}

	.title {
		font-weight: 400;
		font-size: 14px;
	}


	.explanation-content p {
		font-size: 14px;
	}

	.info-button svg {
		width: 90%;
		height: 90%;
		fill: #372f2f;
	}



}


@media (min-width: 950px) and (max-width: 1200px) and (max-height: 750px) {

.info-button.expanded {
	width: 220px;
	height: 232px;
	margin-top: 184px;
}

.chart-section
	{
		height: 180px;
	}


}

@media (min-width: 1200px) and (max-height: 750px) {

.info-button.expanded {
	width: 460px;
	height: 200px;
	margin-top: 154px;
}

}




	

	



</style>
