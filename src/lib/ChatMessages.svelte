<script lang="ts">
	import { modalStore, ProgressRadial, type ModalSettings } from '@skeletonlabs/skeleton';
	import type { Chat } from '$misc/shared';
	import snarkdown from 'snarkdown';
	import { chatStore, isLoadingAnswerStore, liveAnswerStore } from '$misc/stores';
	import { onDestroy } from 'svelte';
	import { countTokens } from '$misc/openai';
	import TokenCost from './TokenCost.svelte';
	import { scrollIntoView } from '$misc/actions';

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

	function deleteMessage(index: number) {
		chatStore.deleteMessage(slug, index);
	}

	async function modalConfirmDelete(index: number) {
		const modal: ModalSettings = {
			type: 'confirm',
			title: 'Please confirm',
			body: "Are you sure you want to delete this message from the chat history?<br />This action can't be undone.",
			response: (result: boolean) => {
				if (result) {
					// not awaitable here but doesn't matter because we don't really care about the toast.
					// 'await' expressions are only allowed within async functions and at the top levels of modules.ts(1308)
					deleteMessage(index);
				}
			}
		};
		modalStore.trigger(modal);
	}
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
			{#each chat.messages as message, index}
				<div class={message.role === 'assistant' ? 'md:place-self-start' : 'md:place-self-end'}>
					<div
						class="grid px-5 py-2 rounded-2xl"
						class:variant-ghost-surface={message.role === 'user'}
						class:variant-ghost-secondary={message.role === 'assistant'}
						class:rounded-tl-none={message.role === 'assistant'}
						class:rounded-tr-none={message.role === 'user'}
					>
						<!-- Header -->
						<div class="flex justify-between space-x-12 mb-1 items-center">
							<!-- Author -->
							<span class="font-bold">{message.role === 'user' ? 'You' : 'AI'}:</span>

							<div class="flex space-x-4">
								<!-- Tokens -->
								<TokenCost tokens={countTokens(message)} />

								<!-- Delete message -->
								{#if !!$chatStore[slug]}
									<button class="btn btn-sm" on:click={() => modalConfirmDelete(index)}>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-6 h-6"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								{/if}
							</div>
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
