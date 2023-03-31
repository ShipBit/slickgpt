<script lang="ts">
	import { onMount } from 'svelte';
	import TimeAgo from 'javascript-time-ago';
	import en from 'javascript-time-ago/locale/en';
	import {
		modalStore,
		toastStore,
		type ModalSettings,
		type ToastSettings
	} from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import { createNewChat } from '$misc/shared';
	import { chatStore, isTimeagoInitialized } from '$misc/stores';

	let timeAgo: TimeAgo;

	onMount(() => {
		if (!$isTimeagoInitialized) {
			// logs annoying console error if called more than once
			TimeAgo.addDefaultLocale(en);
			$isTimeagoInitialized = true;
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

		const toast: ToastSettings = {
			message,
			background: 'variant-filled-success',
			autohide: true,
			timeout: 5000
		};
		toastStore.trigger(toast);

		// update the local store
		$chatStore = {};

		goto('/');
	}

	$: sortedChats = Object.entries($chatStore).sort((a, b) => {
		return new Date(b[1].created).getTime() - new Date(a[1].created).getTime();
	});
</script>

<div
	class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-4 md:px-8"
>
	<!-- Add button -->
	<button class="card p-4 grid variant-ghost-primary" on:click={() => createNewChat()}>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-10 h-10"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span class="text-xl">New Chat</span>
		</div>
	</button>

	<!-- Saved chats -->
	{#each sortedChats as [slug, chat]}
		<a href={`/${slug}`} class="card p-4 flex flex-col variant-ghost-surface justify-end">
			<div class="flex flex-col">
				<div class="flex items-center space-x-2">
					{#if chat.updateToken}
						<!-- Shared -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-10 h-10"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
							/>
						</svg>
					{:else}
						<!-- Chat bubble -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-10 h-10"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
							/>
						</svg>
					{/if}
					<h2 class="unstyled text-lg">{chat.title}</h2>
				</div>
			</div>
			<hr class="my-4" />
			<footer class="flex justify-evenly">
				<div class="badge variant-filled-surface flex items-center space-x-1">
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
							d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
						/>
					</svg>
					<span>{chat.messages.length}</span>
				</div>
				<div class="badge variant-filled-surface flex items-center space-x-1">
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
							d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
						/>
					</svg>
					<span>{chat.settings.model}</span>
				</div>
				<div class="badge variant-filled-surface flex items-center space-x-1">
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
							d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>

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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-10 h-10"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
					/>
				</svg>
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
