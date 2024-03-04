<script lang="ts">
	import { LightSwitch, getModalStore } from '@skeletonlabs/skeleton';
	import CommandBar from '$lib/CommandBar.svelte';
	import { User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { showModalComponent } from '$misc/shared';

	const modalStore = getModalStore();

	function showUserModal() {
		showModalComponent(modalStore, 'UserModal');
	}
</script>

<div class="flex justify-between">
	<a href="/" class="text-black dark:text-slate-200 flex space-x-4 items-center">
		<img class="h-8 md:h-16" src="/logo-slickgpt.svg" alt="SlickGPT Logo" />
		<h1 class="font-barlow text-2xl md:text-4xl font-bold tracking-wide">SlickGPT</h1>
	</a>

	<div class="flex items-center space-x-4">
		<LightSwitch />

		<CommandBar />

		<button type="button" class="btn btn-sm variant-ghost-primary" on:click={showUserModal}>
			<span><User class="w-4 h-4" /></span>
			<span>Login</span>
		</button>
	</div>
</div>
