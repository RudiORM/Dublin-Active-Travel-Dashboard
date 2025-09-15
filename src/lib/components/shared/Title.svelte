

<div class="sidebar-container">


<div class="menu">
	<div class="menu-header">
	</div>

	<div class="menu-content">
		<p>The dashboard showcases valuable data from the CSO, EcoCounters, Google, the Canal Cordon Count and Strava Metro. Additionally, it highlights the positive health and climate impacts of active travel in Dublin, by linking existing data to peer reviewed studies.
		</p>
	</div>
</div>


</div>

<style>
	.sidebar-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.menu-content{
		font-size: 14px;
		background: #E4E4EF;
		border-radius: 8px;
		padding: 10px 20px 10px 20px;
		display: none;

		
	}

	.menu {
		position: fixed;
		top: 40px;
		left: 40px;
		background: white;
		padding: 20px;
		border-radius: 8px;
		z-index: 10;
		width: 290px;
		height: calc(50% - 60px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.menu-header h3 {
		padding: 0;
		margin: 0;
		color: #333;
		font-size: 30px;
		font-weight: 400;
	}

	@media (max-width: 1000px) {
		.menu-content {
			display: none;
		}

		.menu{
			width: calc(100% - 40px);
			height: fit-content;
			font-size: 17px;
			top: 20px;
			left: 20px;
			display: none;

		}

		.menu-header h3 {
		font-size: 20px;
		font-weight: 400;
	}
	}
</style>
