<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let title: string;
</script>

<header class="sticky top-0 z-10 badge-glass py-2 md:py-4 md:px-8 md:rounded-xl">
	<div
		class="flex flex-col md:flex-row justify-center md:justify-between items-center space-y-4 md:space-y-0"
	>
		<!-- Title -->
		<div class="justify-self-center">
			<h2 class="unstyled text-base md:text-2xl">{title}</h2>
		</div>

		<div class="flex justify-self-center space-x-2">
			<!-- Provided by using components -->
			<slot name="actions" />

			<!-- Close -->
			<button class="btn" on:click={() => dispatch('closeChat')}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
</header>
