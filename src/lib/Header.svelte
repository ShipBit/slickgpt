<script lang="ts">
	import { LightSwitch, getModalStore, popup } from '@skeletonlabs/skeleton';
	import CommandBar from '$lib/CommandBar.svelte';
	import { showModalComponent } from '$misc/shared';
	import { account, isPro, autoLogin } from '$misc/stores';
	import { BxLogOut } from '@inqling/svelte-icons/boxicons-regular';
	import { AuthService } from '$misc/authService';
	import { User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { onMount } from 'svelte';
	import { PUBLIC_STRIPE_PRO_PORTAL } from '$env/static/public';

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
				href={PUBLIC_STRIPE_PRO_PORTAL}
				class="btn hover:text-gray-500 dark:hover:text-gray-400"
				target="_blank"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					xml:space="preserve"
					style="enable-background:new 0 0 122.88 96.04"
					viewBox="0 0 122.88 96.04"
					class="w-4 h-4"
					fill="currentColor"
				>
					<path
						d="M59.07 96.03 1.15 29.77h38.01l19.91 66.26zM61.18.11 45.89 25.24H77.6L61.18.11zm21 24.96L65.17 0h31.45L82.18 25.07zm-40.53.24L56.55 0H24.61l17.04 25.31zm60.06-22.33L86.67 25.24h36.21L101.71 2.98zm-79.45 0 15.81 22.26H0L22.26 2.98zm22.47 26.59h33.63L62.04 95.04 44.73 29.57zm20.18 66.47 57.23-66.27H84.13L64.91 96.04z"
						style="fill-rule:evenodd;clip-rule:evenodd"
					/>
				</svg>
				<span>Subscription</span>
			</a>
		{:else}
			<!-- Upgrade to Pro -->
			<button
				type="button"
				class="btn hover:text-gray-500 dark:hover:text-gray-400"
				on:click={() => showUserModal()}
			>
				<span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						xml:space="preserve"
						style="enable-background:new 0 0 122.88 96.04"
						viewBox="0 0 122.88 96.04"
						class="w-4 h-4"
						fill="currentColor"
					>
						<path
							d="M59.07 96.03 1.15 29.77h38.01l19.91 66.26zM61.18.11 45.89 25.24H77.6L61.18.11zm21 24.96L65.17 0h31.45L82.18 25.07zm-40.53.24L56.55 0H24.61l17.04 25.31zm60.06-22.33L86.67 25.24h36.21L101.71 2.98zm-79.45 0 15.81 22.26H0L22.26 2.98zm22.47 26.59h33.63L62.04 95.04 44.73 29.57zm20.18 66.47 57.23-66.27H84.13L64.91 96.04z"
							style="fill-rule:evenodd;clip-rule:evenodd"
						/>
					</svg></span
				>
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
			<button type="button" class="btn btn-sm variant-filled-secondary" on:click={showUserModal}>
				<span><User class="w-4 h-4" /></span>
				<span>Login</span>
			</button>
		{/if}
	</div>
</div>
