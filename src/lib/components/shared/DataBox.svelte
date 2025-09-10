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
		top: 20px;
		right: 20px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.15);
		height: calc(100% - 80px);
		width: 31%;
        min-width: 400px;
		padding: 20px;
		overflow-y: auto;
	}
</style>
