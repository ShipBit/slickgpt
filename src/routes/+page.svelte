<script lang="ts">
	import { onMount } from 'svelte';
	import TimeAgo from 'javascript-time-ago';
	import en from 'javascript-time-ago/locale/en';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import {
		PlusCircle,
		ChatBubbleLeftRight,
		Share,
		Trash
	} from '@inqling/svelte-icons/heroicon-24-solid';
	import {
		ChatBubbleBottomCenter,
		AcademicCap,
		Clock
	} from '@inqling/svelte-icons/heroicon-24-outline';
	import { goto } from '$app/navigation';
	import { createNewChat, showToast } from '$misc/shared';
	import { chatStore, isTimeagoInitializedStore } from '$misc/stores';

	let timeAgo: TimeAgo;

	$: sortedChats = Object.entries($chatStore).sort((a, b) => {
		return new Date(b[1].created).getTime() - new Date(a[1].created).getTime();
	});

	onMount(() => {
		if (!$isTimeagoInitializedStore) {
			// logs annoying console error if called more than once
			TimeAgo.addDefaultLocale(en);
			$isTimeagoInitializedStore = true;
		}
		timeAgo = new TimeAgo('en-US');
	});

	async function modalConfirmDelete() {
		const modal: ModalSettings = {
			type: 'confirm',
			title: 'Please confirm',
			body: 'Are you sure you want to delete all chats? This will also unshare them.',
			response: (result: boolean) => {
				if (result) {
					// not awaitable here but doesn't matter because we don't really care about the toast.
					// 'await' expressions are only allowed within async functions and at the top levels of modules.ts(1308)
					clearStorage();
				}
			}
		};
		modalStore.trigger(modal);
	}

	async function clearStorage() {
		const docsToDelete: { [key: string]: string } = {};
		let savedChatsAmount = 0;
		for (const [slug, chat] of Object.entries($chatStore)) {
			if (chat.updateToken?.length) {
				docsToDelete[slug] = chat.updateToken;
			}
			savedChatsAmount++;
		}

		const response = await fetch('/api/share', {
			method: 'DELETE',
			body: JSON.stringify(docsToDelete)
		});
		const { deleted: unshared }: { deleted: string[] } = await response.json();

		let message = `${savedChatsAmount} ${savedChatsAmount === 1 ? 'chat' : 'chats'} deleted.`;
		if (unshared?.length) {
			message += ` ${unshared.length} ${unshared.length === 1 ? 'chat' : 'chats'} unshared.`;
		}

		showToast(message);

		// update the local store
		$chatStore = {};

		goto('/');
	}
</script>

<div
	class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-4 md:px-8"
>
	<!-- Add button -->
	<button class="card p-4 grid variant-ghost-primary" on:click={() => createNewChat()}>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<PlusCircle class="w-10 h-10" />
			<span class="text-xl">New Chat</span>
		</div>
	</button>

	<!-- Saved chats -->
	{#each sortedChats as [slug, chat]}
		<a href={`/${slug}`} class="card p-4 flex flex-col variant-ghost-surface justify-end">
			<div class="flex flex-col">
				<div class="flex items-center space-x-2">
					<div>
						{#if chat.updateToken}
							<!-- Shared -->
							<Share class="w-10 h-10" />
						{:else}
							<!-- Local -->
							<ChatBubbleLeftRight class="w-10 h-10" />
						{/if}
					</div>
					<h2 class="unstyled line-clamp-2 text-lg">{chat.title}</h2>
				</div>
			</div>
			<hr class="my-4" />
			<footer class="flex justify-evenly space-x-2">
				<div class="badge variant-filled-surface flex items-center space-x-1">
					<ChatBubbleBottomCenter class="w-6 h-6" />
					<span>{chat.messages.length}</span>
				</div>
				<div class="badge variant-filled-surface flex items-center space-x-1">
					<AcademicCap class="w-6 h-6" />
					<span>{chat.settings.model}</span>
				</div>
				<div class="badge variant-filled-surface flex items-center space-x-1">
					<Clock class="w-6 h-6" />
					{#if timeAgo}
						<span class="self-center">
							{timeAgo.format(new Date(chat.created), 'twitter-minute-now')}
						</span>
					{/if}
				</div>
			</footer>
		</a>
	{/each}

	<!-- Clear button -->
	{#if Object.entries($chatStore)?.length}
		<button class="card p-4 grid variant-ghost-error" on:click={modalConfirmDelete}>
			<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
				<Trash class="w-10 h-10" />
				<span class="text-xl">Clear storage</span>
			</div>
		</button>
	{/if}
</div>

<style lang="postcss">
	.card {
		min-height: 9rem;
	}
</style>
