<script lang="ts">
	import { afterUpdate, beforeUpdate, onMount } from 'svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import snarkdown from 'snarkdown';
	import { afterNavigate } from '$app/navigation';
	import type { Chat } from '$misc/shared';
	import { chatStore, enhancedLiveAnswerStore, isLoadingAnswerStore } from '$misc/stores';
	import ChatMessages from './ChatMessages.svelte';

	export let slug: string;
	export let chat: Chat | undefined = undefined;

	$: if ($chatStore[slug]) {
		// If this is used in the "Shared chat" view, the chat is not in the local store.
		// Instead it's loaded from the db and passed in as a prop.
		chat = $chatStore[slug];
	}

	// Autoscroll: https://svelte.dev/tutorial/update
	let div: HTMLElement | null | undefined;
	let autoscroll: boolean | null | undefined;

	onMount(() => {
		// bind to the *scrollable* element by it's id
		// note: element is not exposed in this file, it lives in app.html
		div = document.getElementById('page');
	});

	beforeUpdate(() => {
		autoscroll = div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
	});

	afterUpdate(() => {
		if (autoscroll) div?.scrollTo({ top: div.scrollHeight, behavior: 'smooth' });
	});

	// autoscroll to bottom after navigation
	afterNavigate(() => {
		div?.scrollTo({ top: div.scrollHeight, behavior: 'smooth' });
	});
</script>

{#if chat}
	<div class="flex flex-col container h-full mx-auto px-4 md:px-8" style="justify-content: end">
		<slot name="additional-content-top" />

		<div class="flex flex-col max-w-4xl md:mx-auto space-y-6 pt-6">
			<!-- Message history -->
			<ChatMessages {slug} siblings={chat.messages} on:editMessage />

			<!-- Live Message -->
			{#if $isLoadingAnswerStore}
				<div class="place-self-start">
					<div class="p-5 rounded-2xl variant-ghost-tertiary rounded-tl-none">
						{@html snarkdown($enhancedLiveAnswerStore.content)}
					</div>
				</div>
			{/if}
		</div>

		<slot name="additional-content-bottom" />

		<!-- Progress indicator -->
		<div
			class="animate-pulse md:w-12 self-center py-2 md:py-6"
			class:invisible={!$isLoadingAnswerStore}
		>
			<ProgressRadial
				class="w-8"
				stroke={120}
				meter="stroke-tertiary-500"
				track="stroke-tertiary-500/30"
			/>
		</div>
	</div>
{/if}
