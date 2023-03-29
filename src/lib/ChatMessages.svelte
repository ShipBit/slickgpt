<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import type { Chat } from '$misc/shared';
	import snarkdown from 'snarkdown';
	import { isLoadingAnswerStore, liveAnswerStore } from '$misc/stores';
	import { onDestroy } from 'svelte';
	import { countTokens } from '$misc/openai';
	import TokenCost from './TokenCost.svelte';
	import { scrollIntoView } from '$misc/actions';

	export let chat: Chat;

	let anchor: HTMLElement;

	const unsubscribe = liveAnswerStore.subscribe((answer) => {
		if (answer.content) {
			scrollIntoView(anchor);
		}
	});

	onDestroy(unsubscribe);
</script>

<div
	id="chat"
	class="flex flex-col container h-full mx-auto px-4 md:px-8"
	style="justify-content: end"
>
	<slot name="additional-content-top" />

	<div class="flex flex-col max-w-4xl md:mx-auto space-y-6 pt-6">
		<!-- Message history -->
		{#each chat.messages as message}
			<div class={message.role === 'assistant' ? 'md:place-self-start' : 'md:place-self-end'}>
				<div
					class="grid px-5 py-2 rounded-2xl"
					class:variant-ghost-surface={message.role === 'user'}
					class:variant-ghost-secondary={message.role === 'assistant'}
					class:rounded-tl-none={message.role === 'assistant'}
					class:rounded-tr-none={message.role === 'user'}
				>
					<!-- Header -->
					<div class="flex justify-between mb-1">
						<!-- Author -->
						<span class="font-bold">{message.role === 'user' ? 'You' : 'AI'}:</span>
						<!-- Tokens -->
						<TokenCost tokens={countTokens(message)} />
					</div>
					<!-- Message Content -->
					<div>
						{@html snarkdown(message.content)}
					</div>
				</div>
			</div>
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
