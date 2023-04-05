<script lang="ts">
	import { showModalComponent } from '$misc/shared';
	import { createEventDispatcher } from 'svelte';
	import { PencilSquare, XMark } from '@inqling/svelte-icons/heroicon-24-solid';

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
					<PencilSquare class="w-4 h-4 md:w-6 md:h-6" />
				</button>
			{/if}
		</div>

		<div class="flex justify-self-center space-x-2">
			<!-- Provided by using components -->
			<slot name="actions" />

			<!-- Close -->
			<button class="btn" on:click={() => dispatch('closeChat')}>
				<XMark class="w-6 h-6" />
			</button>
		</div>
	</div>
</header>
