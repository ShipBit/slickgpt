<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import { renderMarkdown } from '$misc/markdownHelper';
	import { afterNavigate } from '$app/navigation';
	import type { Chat } from '$misc/shared';
	import { chatStore, isLoadingAnswerStore, liveAnswerStore } from '$misc/stores';
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
	// let autoscroll: boolean | null | undefined;

	onMount(() => {
		// bind to the *scrollable* element by it's id
		// note: element is not exposed in this file, it lives in app.html
		div = document.getElementById('page');
	});

	function scrollToBottom() {
		setTimeout(() => {
			div?.scrollTo({ top: div.scrollHeight + 999, behavior: 'smooth' });
		}, 50);
	}

	// beforeUpdate(() => {
	// TODO: This isn't working anymore. Disabled the check for now and always auto-scroll
	// autoscroll = div ? div.scrollTop === div.scrollHeight - div.offsetHeight : false;
	// });

	afterUpdate(() => {
		// if (autoscroll) {
		scrollToBottom();
		// }
	});

	// autoscroll to bottom after navigation
	afterNavigate(() => {
		scrollToBottom();
	});
</script>

{#if chat}
	<div
		class="flex flex-col container justify-end h-full mx-auto px-4 md:px-8 gap-6"
	>
		<slot name="additional-content-top" />

		{#if chat.messages.length > 0 || $isLoadingAnswerStore}
			<div class="flex flex-col max-w-4xl md:mx-auto space-y-6">
				<!-- Message history -->
				<ChatMessages {slug} siblings={chat.messages} on:editMessage />

				<!-- Live Message -->
				{#if $isLoadingAnswerStore}
					<div class="place-self-start">
						<div class="p-5 rounded-2xl variant-ghost-tertiary rounded-tl-none">
							{@html renderMarkdown($liveAnswerStore)}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<slot name="additional-content-bottom" />

		<!-- Progress indicator -->
		{#if $isLoadingAnswerStore}
			<div class="animate-pulse md:w-12 self-center py-2 md:py-6">
				<ProgressRadial
					class="w-8"
					stroke={120}
					meter="stroke-tertiary-500"
					track="stroke-tertiary-500/30"
				/>
			</div>
		{/if}
	</div>
{/if}
