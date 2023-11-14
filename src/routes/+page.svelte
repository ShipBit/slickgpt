<script lang="ts">
	import { onMount } from 'svelte';
	import TimeAgo from 'javascript-time-ago';
	import en from 'javascript-time-ago/locale/en';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
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
					<h2 class="h2 line-clamp-2 text-lg font-bold">{chat.title}</h2>
				</div>
			</div>
			<hr class="my-4" />
			<footer class="flex justify-evenly space-x-2">
				<div class="badge variant-filled-surface flex items-center space-x-1">
					<ChatBubbleBottomCenter class="w-6 h-6" />
					<span>{chatStore.countAllMessages(chat)}</span>
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

	<!-- Discord -->
	<a
		class="card p-4 grid variant-ghost-tertiary"
		href="https://discord.gg/k8tTBar3gZ"
		target="_blank"
	>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
				<path
					d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
					style="fill: currentColor;"
				/>
			</svg>
			<span class="text-xl">Join our Discord</span>
		</div>
	</a>

	<!-- Patreon -->
	<a
		class="card p-4 grid variant-ghost-tertiary"
		href="https://patreon.com/ShipBit?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=creatorshare_creator&utm_content=join_link"
		target="_blank"
	>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
				<path
					d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z"
					style="fill: currentColor;"
				/>
			</svg>
			<span class="text-xl">Support us</span>
		</div>
	</a>

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
