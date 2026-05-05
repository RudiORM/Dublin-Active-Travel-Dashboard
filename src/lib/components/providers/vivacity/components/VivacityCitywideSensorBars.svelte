<script>
	/**
	 * Horizontal bars: one row per sensor, sorted by total (desc).
	 */
	let {
		items = [],
		barColor = '#CC3311',
		explanation = 'Total counts for the selected travel mode (walking or cycling) at each Dublin Vivacity sensor over the last 30 days, summed across that sensor’s countlines. Bar length is relative to the busiest sensor in the list. Click a row to open that sensor on the map and in the detail view.',
		/** Called with sensor id when a row is activated (same as map pick) */
		onSelectSensor = undefined
	} = $props();

	let showExplanation = $state(false);
	let explanationButton;

	const maxTotal = $derived.by(() => {
		if (!items.length) return 1;
		return Math.max(1, ...items.map((i) => i.total));
	});
</script>

<div class="sensor-bars" class:explanation-open={showExplanation}>
	<div class="info-position">
		<button
			type="button"
			bind:this={explanationButton}
			class="info-button"
			class:expanded={showExplanation}
			aria-expanded={showExplanation}
			aria-label={showExplanation ? 'Close description' : 'About this chart'}
			onclick={() => {
				showExplanation = !showExplanation;
				if (showExplanation) {
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
				<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 187.39 187.53" aria-hidden="true">
					<path
						d="M93.78,13.7c44.15,0,80.07,35.92,80.07,80.07s-35.92,80.07-80.07,80.07S13.71,137.92,13.71,93.77,49.63,13.7,93.78,13.7M93.78.24C42.12.24.24,42.11.24,93.77s41.88,93.53,93.53,93.53,93.53-41.88,93.53-93.53S145.43.24,93.78.24h0Z"
					/>
					<path
						d="M82.72,53.87c0-5.64,4.91-10.22,10.95-10.22s10.95,4.58,10.95,10.22-4.98,10.22-10.95,10.22-10.95-4.51-10.95-10.22ZM83.71,76.78h19.91v65.19h-19.91v-65.19Z"
					/>
				</svg>
			{/if}
		</button>
	</div>
	<div class="sensor-bars-header">
		<h4 class="title">Counts by sensor</h4>
	</div>
	<div class="sensor-bars-body">
		{#if items.length === 0}
			<p class="empty">No sensor totals for this mode in the window.</p>
		{:else}
			<div class="sensor-bars-scroll">
				{#each items as row (String(row.id))}
					<button
						type="button"
						class="row"
						disabled={!onSelectSensor}
						onclick={() => onSelectSensor?.(row.id)}
						aria-label="Open sensor {row.name}"
					>
						<span class="label" title={row.name}>{row.name}</span>
						<div class="track" aria-hidden="true">
							<div
								class="fill"
								style:width="{(row.total / maxTotal) * 100}%"
								style:background-color={barColor}
							></div>
						</div>
						<span class="value">{row.total.toLocaleString()}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.sensor-bars {
		background: #fff;
		border-radius: 10px;
		overflow: hidden;
		max-width: 570px;
		position: relative;
	}

	.info-position {
		position: absolute;
		top: 0px;
		right: 20px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}

	/* Full card: mint header + white list (desktop and mobile) */
	.sensor-bars.explanation-open .info-position {
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		width: auto;
		height: auto;
		justify-content: flex-start;
		align-items: stretch;
		z-index: 10;
	}

	.sensor-bars-header {
		display: flex;
		align-items: center;
		border-radius: 10px 10px 0 0;
		padding-left: 15px;
		padding-right: 44px;
		background: #a8e9da;
		min-height: 50px;
		height: 50px;
	}

	.title {
		margin: 0;
		color: #333;
		font-size: 16px;
		font-weight: 400;
	}

	h4 {
		font-weight: 400;
	}

	.info-button {
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
		width: 100%;
		height: 100%;
		min-height: 0;
		border-radius: 10px;
		background-color: #ffd249;
		backdrop-filter: blur(5px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		font-size: 14px;
		margin-right: 0;
		border: 0px solid white;
		overflow-y: auto;
		padding: 20px 18px;
		transform: none;
		margin-top: 0;
		box-sizing: border-box;
	}

	.explanation-content {
		padding: 0;
		text-align: center;
		max-width: 100%;
		box-sizing: border-box;
	}

	.explanation-content p {
		margin: 0;
		font-size: 16px;
		line-height: 1.5;
		color: #333;
		font-weight: 400;
	}

	.sensor-bars-body {
		box-sizing: border-box;
		padding: 16px 15px 20px;
		display: flex;
		flex-direction: column;
		max-height: 200px;
		min-height: 0;
	}

	/* Scroll only the rows; bottom padding stays visible on the card at every scroll position */
	.sensor-bars-scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 8px;
	}

	button.row {
		all: unset;
		display: grid;
		grid-template-columns: minmax(100px, 38%) 1fr auto;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		width: 100%;
		box-sizing: border-box;
		border-radius: 6px;
		padding: 4px 2px;
		margin: 0 -2px;
		cursor: pointer;
	}

	button.row:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.04);
	}

	button.row:focus-visible {
		outline: 2px solid #333;
		outline-offset: 2px;
	}

	button.row:disabled {
		cursor: default;
	}

	.label {
		color: #111;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.track {
		height: 14px;
		background: #eef2f6;
		border-radius: 4px;
		overflow: hidden;
		min-width: 0;
	}

	.fill {
		height: 100%;
		border-radius: 4px;
		min-width: 2px;
		transition: width 0.2s ease;
	}

	.value {
		font-variant-numeric: tabular-nums;
		color: #333;
		text-align: right;
		min-width: 4.5rem;
	}

	.empty {
		margin: 0;
		color: #666;
		font-size: 14px;
	}

	@media (max-width: 950px) {
		.sensor-bars {
			max-width: 100%;
		}

		button.row {
			grid-template-columns: minmax(80px, 36%) 1fr auto;
			gap: 8px;
			font-size: 12px;
		}
	}

	@media (min-width: 651px) and (max-height: 750px) {
		.explanation-content p {
			font-size: 14px;
		}

		.info-button svg {
			width: 90%;
			height: 90%;
			fill: #000;
		}

		.sensor-bars-header {
			height: 50px;
			min-height: 50px;
		}

		.title {
			font-size: 14px;
		}

	}
</style>
