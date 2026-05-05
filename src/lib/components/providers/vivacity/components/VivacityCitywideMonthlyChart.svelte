<script>
	/**
	 * Vertical bars: one column per UTC calendar month (network total for selected mode).
	 * Layout aligned with SingleItemTimeSeries (Counts by day): fixed plot height, grid, rounded bars.
	 */
	let {
		items = [],
		barColor = '#CC3311',
		explanation =
			'Total counts for the selected travel mode summed across all Dublin Vivacity countlines, by UTC calendar month (last twelve months; the current month is partial up to today).'
	} = $props();

	let showExplanation = $state(false);
	let explanationButton;

	const maxRaw = $derived.by(() => {
		if (!items.length) return 1;
		return Math.max(1, ...items.map((i) => i.total));
	});

	/** Top of scale — slight headroom like SingleItemTimeSeries */
	const niceMax = $derived.by(() => Math.ceil(maxRaw * 1.1));

	const yAxisValues = $derived.by(() => {
		const top = niceMax;
		return [0, Math.round(top / 3), Math.round((top * 2) / 3), Math.round(top)];
	});

	const scaleMax = $derived.by(() => yAxisValues[yAxisValues.length - 1] || 1);

	function formatNumber(num) {
		if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
		if (num >= 1000) return `${Math.round(num / 1000)}k`;
		return String(num);
	}

	/** `YYYY-MM` → `01/25` */
	function formatMonthKeyAsMMYY(monthKey) {
		const parts = String(monthKey).split('-');
		if (parts.length !== 2) return String(monthKey);
		const y = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		if (!Number.isFinite(y) || !Number.isFinite(m)) return String(monthKey);
		return `${String(m).padStart(2, '0')}/${String(y).slice(-2)}`;
	}

	let tooltipVisible = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	let tooltipLabel = $state('');
	let tooltipValue = $state(0);

	function showTooltip(event, col) {
		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
		tooltipX = clientX;
		tooltipY = clientY - 90;
		tooltipLabel = formatMonthKeyAsMMYY(col.monthKey);
		tooltipValue = col.total;
		tooltipVisible = true;
	}

	function hideTooltip() {
		tooltipVisible = false;
	}
</script>

<div class="monthly-chart" class:explanation-open={showExplanation}>
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
	<div class="monthly-chart-header">
		<h4 class="title">Monthly totals (network)</h4>
	</div>
	<div class="monthly-chart-body">
		{#if items.length === 0}
			<p class="empty">No monthly totals for this mode.</p>
		{:else}
			<div class="chart-inner" role="img" aria-label="Monthly network totals bar chart">
				<div class="bars-container">
					<div class="grid-lines" style="height: var(--monthly-plot-h);">
						{#each yAxisValues as value, i}
							<div
								class="grid-line"
								style="bottom: calc({(i / (yAxisValues.length - 1)) * 100}% - 1px);"
							></div>
							<div class="y-axis-label" style="bottom: {(i / (yAxisValues.length - 1)) * 100}%">
								{formatNumber(value)}
							</div>
						{/each}
					</div>

					<div class="plot-area">
						<div class="bars-wrapper">
							{#each items as col (col.monthKey)}
								{@const barHeight = scaleMax > 0 ? (col.total / scaleMax) * 100 : 0}
								{@const mmYY = formatMonthKeyAsMMYY(col.monthKey)}
								<div class="date-column">
									<div
										class="bar"
										role="img"
										aria-label="{mmYY}: {col.total.toLocaleString()}"
										style="height: {barHeight}%; background-color: {barColor};"
										title="{mmYY}: {col.total.toLocaleString()}"
										onmouseenter={(e) => showTooltip(e, col)}
										onmouseleave={hideTooltip}
										ontouchstart={(e) => showTooltip(e, col)}
										ontouchend={hideTooltip}
									></div>
								</div>
							{/each}
						</div>
					</div>

					<div class="x-labels-row">
						{#each items as col, labelIndex (col.monthKey)}
							<span class="month-label" title="{formatMonthKeyAsMMYY(col.monthKey)}">
								{#if labelIndex % 2 === 0}{formatMonthKeyAsMMYY(col.monthKey)}{/if}
							</span>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

{#if tooltipVisible}
	<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
		<div class="tooltip-content">
			<div class="tooltip-line">{tooltipLabel}</div>
			<div class="tooltip-total">Counts: {tooltipValue.toLocaleString()}</div>
		</div>
	</div>
{/if}

<style>
	.monthly-chart {
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

	.monthly-chart.explanation-open .info-position {
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

	.monthly-chart-header {
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

	.monthly-chart-body {
		padding: 16px;
		box-sizing: border-box;
	}

	.chart-inner {
		width: 100%;
		--monthly-plot-h: 140px;
	}

	/* Explicit plot height so bar % heights resolve (matches SingleItemTimeSeries pattern) */
	.bars-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
		position: relative;
		padding-left: 38px;
	}

	.plot-area {
		position: relative;
		display: flex;
		width: 100%;
		height: var(--monthly-plot-h);
		min-height: var(--monthly-plot-h);
	}

	.bars-wrapper {
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		flex: 1;
		min-height: 0;
		width: 100%;
		box-sizing: border-box;
		gap: 8px;
	}

	.grid-lines {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		pointer-events: none;
		overflow: hidden;
	}

	.grid-line {
		position: absolute;
		left: 0;
		height: 0.5px;
		background-color: #000;
		width: 100%;
	}

	.grid-line:first-child {
		height: 2px;
	}

	.y-axis-label {
		position: absolute;
		left: 0;
		transform: translateY(200%);
		font-size: 12px;
		color: #000;
		text-align: right;
		white-space: nowrap;
		margin-top: 10px;
		margin-bottom: 10px;
	}

	.date-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		flex: 1 1 0;
		min-width: 0;
	}

	.bar {
		width: 55%;
		max-width: 26px;
		margin-left: auto;
		margin-right: auto;
		min-height: 2px;
		transition: opacity 0.2s ease;
		border-radius: 4px 4px 0 0;
		z-index: 2;
	}

	.bar:hover {
		cursor: pointer;
		opacity: 0.92;
	}

	.x-labels-row {
		display: flex;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		margin-top: 6px;
		padding-right: 4px;
		box-sizing: border-box;
	}

	.month-label {
		flex: 1 1 0;
		min-width: 0;
		font-size: 12px;
		color: #6b7280;
		font-weight: 500;
		text-align: center;
		line-height: 1.2;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		margin: 0;
		color: #666;
		font-size: 14px;
		text-align: center;
		padding: 16px 8px;
	}

	.tooltip {
		position: fixed;
		z-index: 1000;
		pointer-events: none;
		transform: translateX(-50%);
	}

	.tooltip-content {
		background: rgba(0, 0, 0, 0.9);
		color: white;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 12px;
		line-height: 1.4;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		white-space: nowrap;
	}

	.tooltip-line {
		font-weight: 500;
		margin-bottom: 2px;
	}

	.tooltip-total {
		font-weight: 400;
		opacity: 0.9;
	}

	@media (max-width: 950px) {
		.monthly-chart {
			max-width: 100%;
		}

		.month-label {
			font-size: 10px;
		}

		.y-axis-label {
			font-size: 11px;
		}
	}

	@media (min-width: 651px) and (max-height: 750px) {
		.chart-inner {
			--monthly-plot-h: 110px;
		}
	}
</style>
