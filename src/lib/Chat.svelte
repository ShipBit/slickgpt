<script lang="ts">
	import type { Chat } from '$misc/shared';
	import { onDestroy } from 'svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import snarkdown from 'snarkdown';
	import { chatStore, isLoadingAnswerStore, liveAnswerStore } from '$misc/stores';
	import { scrollIntoView } from '$misc/actions';
	import ChatMessages from './ChatMessages.svelte';

	export let slug: string;
	export let chat: Chat | undefined = undefined;

	let anchor: HTMLElement;

	$: if ($chatStore[slug]) {
		// If this is used in the "Shared chat" view, the chat is not in the local store.
		// Instead it's loaded from the db and passed in as a prop.
		chat = $chatStore[slug];
	}

	const unsubscribe = liveAnswerStore.subscribe((answer) => {
		if (answer.content) {
			scrollIntoView(anchor);
		}
	});

	onDestroy(unsubscribe);
</script>

{#if chat}
	<div
		id="chat"
		class="flex flex-col container h-full mx-auto px-4 md:px-8"
		style="justify-content: end"
	>
		<slot name="additional-content-top" />

		<div class="flex flex-col max-w-4xl md:mx-auto space-y-6 pt-6">
			<!-- Message history -->
			{#each chat.messages as message}
				<ChatMessages {slug} siblings={chat.messages} />
			{/each}

			<!-- Live Message -->
			{#if $isLoadingAnswerStore}
				<div class="place-self-start">
					<div class="p-5 rounded-2xl variant-ghost-tertiary rounded-tl-none">
						{@html snarkdown($liveAnswerStore.content)}
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

		<!-- element is used to scroll to the bottom of the page -->
		<!-- the Svelte action lets the view autoscroll to bottom initially as soon as the anchor is rendered -->
		<div id="anchor" use:scrollIntoView bind:this={anchor} />
	</div>
{/if}

<style>
	/* stay at the bottom of the page when messages are added */
	#chat * {
		overflow-anchor: none;
	}

	#anchor {
		overflow-anchor: auto;
		height: 1px;
	}
</style>
