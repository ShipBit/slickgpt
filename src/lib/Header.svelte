<script lang="ts">
	import { LightSwitch, getModalStore, popup } from '@skeletonlabs/skeleton';
	import CommandBar from '$lib/CommandBar.svelte';
	import { showModalComponent } from '$misc/shared';
	import { account, isPro, autoLogin } from '$misc/stores';
	import { BxLogOut } from '@inqling/svelte-icons/boxicons-regular';
	import { AuthService } from '$misc/authService';
	import { User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { Scale } from '@inqling/svelte-icons/heroicon-24-solid';
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
		<h1 class="font-barlow text-2xl md:text-4xl font-bold tracking-wide hidden md:block">
			SlickGPT
		</h1>
		<!-- Copyrights -->
		<a
			class="text-black dark:text-slate-200 space-x-1 items-center hidden md:flex mt-3 text-xs"
			href="https://shipbit.de/"
			target="_blank"
			rel="noreferrer"
		>
			<span class="hidden md:inline">made with</span>
			<img src="/shipbit-logo.svg" class="w-4 h-4" alt="ShipBit Logo" />
			<span class="hidden md:inline">by</span>
			<span class="font-bold md:text-shipbit font-barlow">ShipBit</span>
		</a>
	</a>

	<div class="gap-8 flex items-center">
		<div class="hidden md:flex items-center gap-4">
			<!-- GitHub -->
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/ShipBit/slickgpt"
				class="w-5 h-5"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
					><path
						d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						style="fill: currentColor;"
					/></svg
				>
			</a>

			<!-- Discord -->
			<a target="_blank" rel="noreferrer" href="https://discord.gg/k8tTBar3gZ" class="w-5 h-5">
				<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
					><path
						d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
						style="fill: currentColor;"
					/></svg
				>
			</a>

			<!-- Patreon -->
			<a
				target="_blank"
				rel="noreferrer"
				href="https://patreon.com/ShipBit?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=creatorshare_creator&utm_content=join_link"
				class="w-5 h-5"
			>
				<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
					><path
						d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z"
						style="fill: currentColor;"
					/></svg
				>
			</a>
		</div>

		<div class="flex items-center gap-4">
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
					<span class="hidden md:inline">Login</span>
				</button>
			{/if}
		</div>
	</div>
</div>
