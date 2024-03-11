<script lang="ts">
	import { LightSwitch, getModalStore, popup } from '@skeletonlabs/skeleton';
	import CommandBar from '$lib/CommandBar.svelte';
	import { showModalComponent } from '$misc/shared';
	import { account, isPro, autoLogin } from '$misc/stores';
	import { BxDiamond, BxLogOut } from '@inqling/svelte-icons/boxicons-regular';
	import { AuthService } from '$misc/authService';
	import { User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { onMount } from 'svelte';

	const modalStore = getModalStore();

	let authService: AuthService;

	onMount(async () => {
		if ($autoLogin) {
			authService = await AuthService.getInstance();
		}
	});

	function showUserModal() {
		showModalComponent(modalStore, 'UserModal');
	}

	function logout() {
		$autoLogin = false;
		authService.logout();
	}
</script>

<!-- User profile popup -->
<div class="card p-2 shadow-xl z-50" data-popup="popupActions-user">
	<nav class="list-nav">
		<!-- Edit account profile -->
		<button
			type="button"
			class="btn hover:text-gray-500 dark:hover:text-gray-400"
			on:click={() => authService.editProfile()}
		>
			<span><User class="w-4 h-4" /></span>
			<span>Profile</span>
		</button>
		{#if $isPro}
			<!-- Manage subscription -->
			<a
				href="https://billing.stripe.com/p/login/test_00g7vOcOTgWb1hu000"
				class="btn hover:text-gray-500 dark:hover:text-gray-400"
			>
				<span><BxDiamond class="w-4 h-4" /></span>
				<span>Subscription</span>
			</a>
		{:else}
			<!-- Upgrade to Pro -->
			<button
				type="button"
				class="btn hover:text-gray-500 dark:hover:text-gray-400"
				on:click={() => showUserModal()}
			>
				<span><BxDiamond class="w-4 h-4" /></span>
				<span>Upgrade to Pro</span>
			</button>
		{/if}
		<!-- Logout -->
		<button
			type="button"
			class="btn hover:text-gray-500 dark:hover:text-gray-400"
			on:click={() => logout()}
		>
			<span><BxLogOut class="w-4 h-4" /></span>
			<span>Logout</span>
		</button>
	</nav>
</div>

<div class="flex justify-between">
	<a href="/" class="text-black dark:text-slate-200 flex space-x-4 items-center">
		<img class="h-8 md:h-16" src="/logo-slickgpt.svg" alt="SlickGPT Logo" />
		<h1 class="font-barlow text-2xl md:text-4xl font-bold tracking-wide">SlickGPT</h1>
	</a>

	<div class="flex items-center space-x-4">
		<LightSwitch />

		<CommandBar />

		{#if $account}
			<button
				type="button"
				class="btn btn-sm variant-ghost-tertiary"
				use:popup={{
					event: 'click',
					target: `popupActions-user`,
					placement: 'bottom'
				}}
			>
				<span><User class="w-4 h-4" /></span>
				<span>{$account.name}</span>
			</button>
		{:else}
			<button type="button" class="btn btn-sm variant-ghost-primary" on:click={showUserModal}>
				<span><BxDiamond class="w-4 h-4" /></span>
				<span>Pro</span>
			</button>
		{/if}
	</div>
</div>
