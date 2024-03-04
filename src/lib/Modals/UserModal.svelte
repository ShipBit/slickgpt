<script lang="ts">
	import { AuthService } from '$misc/authService';
	import { authType } from '$misc/stores';
	import { Key, User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { getModalStore } from '@skeletonlabs/skeleton';

	const modalStore = getModalStore();
	let authService: AuthService;

	function payPerUse() {
		$authType = 'payPerUse';
		modalStore.close();
	}

	async function login() {
		$authType = 'fixedPrice';
		authService = await AuthService.getInstance();
		await authService.login();
	}
</script>

<div class="card flex flex-col gap-4 variant-filled-surface-700 p-8">
	<h3 class="h3">How do you want to use SlickGPT?</h3>
	<ul>
		<li>Pay-per-use with your own OpenAI API key (no login)</li>
		<li>Fixed price without any API key (login)</li>
	</ul>

	<div class="flex gap-4 self-center">
		<button type="button" class="btn variant-filled-tertiary" on:click={payPerUse}>
			<span><Key class="w-6 h-6" /></span>
			<span>Pay per use</span>
		</button>
		<button type="button" class="btn variant-filled-secondary" on:click={login}>
			<span><User class="w-6 h-6" /></span>
			<span>Fixed price</span>
		</button>
	</div>
</div>
