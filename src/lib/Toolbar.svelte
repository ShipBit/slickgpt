<script lang="ts">
	import { goto } from '$app/navigation';

	export let title: string;

	function handleClose() {
		goto('/');
	}
</script>

<header class="sticky top-0 z-10 badge-glass py-2 md:py-4 md:px-8 md:rounded-xl">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
		<!-- Title -->
		<div class="hidden md:block justify-self-center">
			<h2 class="">{title}</h2>
		</div>

		<div class="flex justify-self-center space-x-2">
			<!-- Provided by using components -->
			<slot name="actions" />

			<!-- Close -->
			<button class="btn" on:click={handleClose}>
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
