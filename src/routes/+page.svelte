<script lang="ts">
	import { onMount } from 'svelte';
	import TimeAgo from 'javascript-time-ago';
	import en from 'javascript-time-ago/locale/en';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import {
		PlusCircle,
		ChatBubbleLeftRight,
		Share,
		Trash,
		CpuChip
	} from '@inqling/svelte-icons/heroicon-24-solid';
	import { ChatBubbleBottomCenter, Clock } from '@inqling/svelte-icons/heroicon-24-outline';
	import { goto } from '$app/navigation';
	import { createNewChat, showModalComponent, showToast } from '$misc/shared';
	import { chatStore, isTimeagoInitializedStore, hasSeenProPrompt, isPro } from '$misc/stores';
	import { getProviderForModel } from '$misc/openai';

	const modalStore = getModalStore();
	const toastStore = getToastStore();

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

		if (!$hasSeenProPrompt) {
			$hasSeenProPrompt = true;
			showModalComponent(modalStore, 'UserModal');
		}
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

		showToast(toastStore, message);

		// update the local store
		$chatStore = {};

		goto('/');
	}
</script>

<div
	class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 px-4 md:px-8 py-4"
>
	<!-- Add button -->
	<button class="card p-4 grid variant-ghost-primary shadow-lg" on:click={() => createNewChat()}>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<PlusCircle class="w-8 h-8" />
			<span class="text-lg">New Chat</span>
		</div>
	</button>

	<!-- Saved chats -->
	{#each sortedChats as [slug, chat]}
		<a
			href={`/${slug}`}
			class="card p-4 flex flex-col variant-ghost-tertiary gap-4 justify-between shadow-lg"
		>
			<div class="flex items-center space-x-2">
				<div>
					{#if chat.updateToken}
						<!-- Shared -->
						<Share class="w-8 h-8" />
					{:else}
						<!-- Local -->
						<ChatBubbleLeftRight class="w-8 h-8" />
					{/if}
				</div>
				<span class="line-clamp-2 text-base">{chat.title}</span>
			</div>
			<div class="flex justify-between space-x-2">
				<div class="badge variant-filled-surface flex items-center space-x-1">
					<span><CpuChip class="w-4 h-4" /></span>
					<span>{getProviderForModel(chat.settings.model)}</span>
				</div>
				<div class="flex gap-2 items-center">
					<div class="badge variant-filled-surface flex items-center space-x-1">
						<span><ChatBubbleBottomCenter class="w-4 h-4" /></span>
						<span>{chatStore.countAllMessages(chat)}</span>
					</div>
					<div class="badge variant-filled-surface flex items-center space-x-1">
						<span><Clock class="w-4 h-4" /></span>
						{#if timeAgo}
							<span class="self-center">
								{timeAgo.format(new Date(chat.created), 'twitter-minute-now')}
							</span>
						{/if}
					</div>
				</div>
			</div>
		</a>
	{/each}

	<!-- Pro -->
	{#if !$isPro}
		<button
			type="button"
			class="card p-4 grid variant-ghost-surface shadow-lg"
			on:click={() => showModalComponent(modalStore, 'UserModal')}
		>
			<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					xml:space="preserve"
					style="enable-background:new 0 0 122.88 96.04"
					viewBox="0 0 122.88 96.04"
					class="w-8 h-8"
					fill="currentColor"
				>
					<path
						d="M59.07 96.03 1.15 29.77h38.01l19.91 66.26zM61.18.11 45.89 25.24H77.6L61.18.11zm21 24.96L65.17 0h31.45L82.18 25.07zm-40.53.24L56.55 0H24.61l17.04 25.31zm60.06-22.33L86.67 25.24h36.21L101.71 2.98zm-79.45 0 15.81 22.26H0L22.26 2.98zm22.47 26.59h33.63L62.04 95.04 44.73 29.57zm20.18 66.47 57.23-66.27H84.13L64.91 96.04z"
						style="fill-rule:evenodd;clip-rule:evenodd"
					/>
				</svg>
				<div class="flex flex-col items-center gap-2">
					<span class="text-gray-700 dark:text-gray-300 text-sm">No API key?</span>
					<span class="text-lg">Try SlickGPT Pro</span>
				</div>
			</div>
		</button>
	{/if}

	<!-- Wingman -->
	<a
		href="https://wingman-ai.com"
		class="card p-4 grid variant-ghost-surface shadow-lg"
		target="_blank"
	>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<img src="/wingman-ai.png" class="w-8 h-8" alt="Wingman AI logo" />
			<div class="flex flex-col items-center gap-2">
				<span class="text-gray-700 dark:text-gray-300 text-sm">Discover our</span>
				<span class="text-lg">Wingman AI</span>
			</div>
		</div>
	</a>

	<!-- Clear button -->
	{#if Object.entries($chatStore)?.length}
		<button class="card p-4 grid variant-ghost-error shadow-lg" on:click={modalConfirmDelete}>
			<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
				<Trash class="w-8 h-8" />
				<span class="text-lg">Delete Chats</span>
			</div>
		</button>
	{/if}
</div>
