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
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		height: calc(100% - 80px);
        min-width: 600px;
		width: 600px;
		padding: 20px;
		overflow-y: auto;
	}



	@media (max-width: 1300px) {
		.data-box {
			min-width: 310px;
			width: 310px;
		}
	}

</style>
