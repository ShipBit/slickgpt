<script lang="ts">
	import { showModalComponent } from '$misc/shared';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let title: string;
	export let slug = '';

	function handleEditTitle() {
		if (slug) {
			showModalComponent('SuggestTitleModal', { slug });
		}
	}
</script>

<header class="sticky top-0 z-10 badge-glass py-2 md:py-4 md:px-8 md:rounded-xl">
	<div class="flex flex-col-reverse md:flex-row justify-center md:justify-between items-center">
		<!-- Title -->
		<div class="flex justify-center md:justify-start w-full px-4 md:px-0 mt-4 md:mt-0">
			<h2 class="unstyled truncate text-base md:text-2xl">
				{title}
			</h2>

			<!-- Edit button -->
			{#if slug}
				<button class="btn btn-sm" on:click={handleEditTitle}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-4 h-4 md:w-6 md:h-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
						/>
					</svg>
				</button>
			{/if}
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
