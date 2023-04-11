<script lang="ts">
	import type { ChatMessage } from '$misc/shared';
	import { createEventDispatcher } from 'svelte';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import snarkdown from 'snarkdown';
	import { XMark, PencilSquare } from '@inqling/svelte-icons/heroicon-24-solid';
	import { chatStore } from '$misc/stores';
	import { countTokens } from '$misc/openai';
	import TokenCost from './TokenCost.svelte';
	import ChatMessages from './ChatMessages.svelte';

	const dispatch = createEventDispatcher();

	export let slug: string;
	export let message: ChatMessage;
	export let renderChildren = false;

	async function modalConfirmDelete(id?: string) {
		if (!id) {
			return;
		}

		const modal: ModalSettings = {
			type: 'confirm',
			title: 'Please confirm',
			body: "Are you sure you want to delete this message from the chat history?<br />This action can't be undone.",
			response: (result: boolean) => {
				if (result) {
					// 'await' expressions are only allowed within async functions and at the top levels of modules.ts(1308)
					// not awaitable here but doesn't matter because we don't really care about the toast.
					chatStore.deleteMessage(slug, id);
				}
			}
		};
		modalStore.trigger(modal);
	}
</script>

<div
	class="grid px-5 py-2 rounded-2xl {message.role === 'assistant'
		? 'md:place-self-start'
		: 'md:place-self-end'}"
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

			{#if $chatStore[slug] && message.id}
				<div class="flex space-x-0">
					<!-- Edit Message / Branch chat -->
					{#if message.role === 'user'}
						<button class="btn btn-sm" on:click={() => dispatch('editMessage', message)}>
							<PencilSquare class="w-6 h-6" />
						</button>
					{/if}
					<!-- Delete message -->
					<button class="btn btn-sm" on:click={() => modalConfirmDelete(message.id)}>
						<XMark class="w-6 h-6" />
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Message Content -->
	<div>
		{@html snarkdown(message.content)}
	</div>
</div>

{#if renderChildren && message.messages}
	<!-- This TypeScript error is nonsense... -->
	<ChatMessages {slug} siblings={message.messages} on:editMessage />
{/if}
