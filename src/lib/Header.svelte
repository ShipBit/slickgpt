<script lang="ts">
	import { LightSwitch } from '@skeletonlabs/skeleton';
	// import ThemeSwitcher from './ThemeSwitcher.svelte';
</script>

<div class="flex justify-between">
	<a href="/" class="unstyled text-black dark:text-slate-200 flex space-x-4 items-center">
		<img class="h-8 md:h-16" src="/logo-slickgpt.svg" alt="SlickGPT Logo" />
		<h1 class="unstyled font-barlow text-2xl md:text-4xl font-extrabold tracking-wide">SlickGPT</h1>
	</a>

	<div class="flex items-center space-x-2">
		<LightSwitch />

		<!-- See ThemeSwitcher component to find out why this is commented out -->
		<!-- <ThemeSwitcher /> -->
	</div>
</div>
