<script lang="ts">
	import { ProgressRadial, getModalStore } from '@skeletonlabs/skeleton';
	import { AuthService } from '$misc/authService';
	import { onMount } from 'svelte';
	import { isPro } from '$misc/stores';

	let authService: AuthService;
	const modalStore = getModalStore();

	onMount(async () => {
		authService = await AuthService.getInstance();

		// Try to refresh token every 5 seconds for 3 times
		let count = 0;
		const interval = setInterval(async () => {
			count++;
			if (count > 3) {
				clearInterval(interval);
				manualRefresh();
			} else {
				await authService.refreshToken(true);
			}
		}, 5000);

		// Sub to isPro store to check if user is pro
		isPro.subscribe((value) => {
			if (value) {
				clearInterval(interval);
				modalStore.close();
			}
		});
	});

	async function manualRefresh() {
		authService.logout();
	}
</script>

<div class="card variant-filled-surface-700 p-8 max-w-xl md:min-w-[500px] flex flex-col gap-4">
	<h3 class="h3">Processing subscription</h3>
	<div class="flex flex-col gap-2">
		<p>Thank you so much for your subscription! Please wait while we process your payment.</p>
		<span><ProgressRadial width="w-6" /></span>
	</div>

	<div class="flex justify-end items-center">
		<button
			type="button"
			class="btn btn-sm variant-ghost-secondary"
			on:click={manualRefresh}
		>
			<span>Manual refresh</span>
		</button>
	</div>
</div>
