<script>
	// Props
	let { children } = $props();
</script>

<div class="data-box">
	{@render children()}
</div>

<style>
	.data-box {
		position: fixed;
		top: 40px;
		right: 40px;
		background: #EEF2F6;
		border-radius: 8px;
		height: calc(100% - 80px);
        min-width: 500px;
		width: 500px;
		padding: 20px;
		overflow-y: auto;
	}



	@media (max-width: 1200px) {
		.data-box {
			min-width: 310px;
			width: 310px;
		}
	}
	@media (max-width: 950px) {
		.data-box {
			width: calc(100% - 40px - 240px - 20px);
			top: 60%;
			font-size: 16px;
			height: calc(40% - 20px);
			right: 20px;
		}
	}

	@media (max-width: 650px) {
		.data-box {
			width: calc(100% - 40px);
			top: 60%;
			font-size: 16px;
			height: calc(40% - 20px);
			overflow-y: scroll;
			left: 20px;
			min-width: 300px;

		}
	}


</style>
