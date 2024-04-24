<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import hljs from 'highlight.js';
	import { DocumentDuplicate, PencilSquare, XMark } from '@inqling/svelte-icons/heroicon-24-solid';
	import { Trash, Cog6Tooth, Share } from '@inqling/svelte-icons/heroicon-24-outline';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import {
		isPro,
		chatStore,
		isLoadingAnswerStore,
		liveAnswerStore,
		settingsStore
	} from '$misc/stores';
	import ChatInput from '$lib/ChatInput.svelte';
	import Chat from '$lib/Chat.svelte';
	import HintMessage from '$lib/HintMessage.svelte';
	import { countTokens, estimateChatCost, getProviderForModel } from '$misc/openai';
	import {
		canSuggestTitle,
		createNewChat,
		showModalComponent,
		showToast,
		suggestChatTitle,
		track,
		type ChatMessage
	} from '$misc/shared';
	import snarkdown from 'snarkdown';
	import {} from '@inqling/svelte-icons/heroicon-20-solid';

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	export let data: PageData;

	$: ({ slug } = data);
	$: chat = $chatStore[slug];
	$: cost = chat ? estimateChatCost(chat) : null;
	$: hasContext = chat?.contextMessage?.content?.length || false;
	$: provider = getProviderForModel(chat?.settings?.model);
	$: isMissingApiKey =
		(provider === 'OpenAI' && !$settingsStore.openAiApiKey) ||
		(provider === 'Mistral' && !$settingsStore.mistralApiKey) ||
		(provider === 'Meta' && !$settingsStore.metaApiKey);
	let chatInput: ChatInput;

	onMount(async () => {
		await highlightCode();
	});

	const unsubscribeChatStore = chatStore.subscribe(async () => {
		await highlightCode();
	});

	const unsubscribeisLoadingAnswerStore = isLoadingAnswerStore.subscribe(async () => {
		await highlightCode();
	});

	const unsubscribeLiveAnswerStore = liveAnswerStore.subscribe(async () => {
		await highlightCode();
	});

	onDestroy(() => {
		unsubscribeChatStore();
		unsubscribeisLoadingAnswerStore();
		unsubscribeLiveAnswerStore();
	});

	async function highlightCode() {
		await tick();
		hljs.highlightAll();
	}

	function showConfirmDeleteModal() {
		const modal: ModalSettings = {
			type: 'confirm',
			title: 'Please confirm',
			body: 'Are you sure you want to delete this chat?',
			response: (result: boolean) => {
				if (result) {
					deleteChat();
				}
			}
		};
		modalStore.trigger(modal);
	}

	const handleChatShared = (savedSlug: boolean) => {
		// sharing might have updated the slug of this chat
		// so we are either already on that page, or we go there
		if (savedSlug) {
			goto(`/${savedSlug}`);
		}
	};

	function deleteChat(dontTrack = false) {
		if (!dontTrack) {
			track('deleteChat');
		}
		chatStore.deleteChat(slug);
		goto('/');
	}

	async function handleCloseChat() {
		// untouched => discard
		if (chat.title === slug && !chat.contextMessage?.content && chat.messages.length === 0) {
			showToast(toastStore, 'Empty chat was discarded automatically', 'secondary');
			deleteChat(true);
			goto('/', { invalidateAll: true });
			return;
		}

		// already has a title
		if (chat.title !== slug || !canSuggestTitle(chat)) {
			goto('/');
			return;
		}

		// has no title
		if ($settingsStore.useTitleSuggestions) {
			const title = await suggestChatTitle(chat);
			chatStore.updateChat(slug, { title });
			showToast(toastStore, `Chat title set to: '${title}'`, 'secondary');
			goto('/');
			return;
		} else {
			showModalComponent(modalStore, 'SuggestTitleModal', { slug }, () => {
				// see https://www.reddit.com/r/sveltejs/comments/10o7tpu/sveltekit_issue_goto_not_working_on_ios/
				// await tick() doesn't fix it, hence setTimeout
				setTimeout(() => goto('/'), 0);
			});
		}
	}

	function handleEditMessage(event: CustomEvent<ChatMessage>) {
		chatInput.editMessage(event.detail);
	}

	function handleEditTitle() {
		if (slug) {
			showModalComponent(modalStore, 'SuggestTitleModal', { slug });
		}
	}
</script>

<div class="flex flex-col h-full gap-4">
	{#if chat}
		<div class="flex flex-col md:flex-row gap-4 justify-between items-center px-8">
			<!-- Title -->
			<div class="flex items-center">
				<h2 class="h2 !text-xl md:!text-2xl font-bold">
					{chat.title}
				</h2>

				<!-- Edit title -->
				{#if slug}
					<button type="button" class="btn btn-sm" on:click={handleEditTitle}>
						<span><PencilSquare class="w-4 h-4 md:w-6 md:h-6" /></span>
					</button>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2 items-center">
				<!-- Delete -->
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={showConfirmDeleteModal}
				>
					<Trash class="w-6 h-6" />
				</button>

				<!-- Settings -->
				<span class="relative inline-flex">
					<button
						type="button"
						class="btn btn-sm variant-ghost-warning"
						on:click={() => showModalComponent(modalStore, 'SettingsModal', { slug })}
					>
						<Cog6Tooth class="w-6 h-6" />
					</button>
					{#if !$isPro && isMissingApiKey}
						<span class="relative flex h-3 w-3">
							<span
								style="left: -10px;"
								class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75"
							/>
							<span
								style="left: -10px;"
								class="relative inline-flex rounded-full h-3 w-3 bg-error-500"
							/>
						</span>
					{/if}
				</span>

				<!-- Share -->
				<span
					class="relative inline-flex"
					style={!$isPro && isMissingApiKey ? 'margin-left: -4px;' : ''}
				>
					<button
						type="button"
						disabled={!chat.contextMessage.content?.length && !chat.messages?.length}
						class="btn btn-sm variant-ghost-tertiary"
						on:click={() =>
							showModalComponent(modalStore, 'ShareModal', { slug }, handleChatShared)}
					>
						<Share class="w-6 h-6" />
					</button>
					{#if chat.updateToken}
						<span class="relative flex h-3 w-3">
							<span
								style="left: -10px;"
								class="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-400 opacity-75"
							/>
							<span
								style="left: -10px;"
								class="relative inline-flex rounded-full h-3 w-3 bg-tertiary-500"
							/>
						</span>
					{/if}
				</span>

				<!-- Close -->
				<button type="button" class="btn btn-sm" on:click={handleCloseChat}>
					<span><XMark class="w-6 h-6" /></span>
				</button>
			</div>
		</div>

		<Chat {slug} on:editMessage={handleEditMessage}>
			<svelte:fragment slot="additional-content-top">
				<!-- Context -->
				<HintMessage
					variantClass="variant-ghost-tertiary"
					title="Context"
					tokens={countTokens(chat.contextMessage)}
				>
					<p>
						{#if hasContext && chat.contextMessage.content}
							{@html snarkdown(chat.contextMessage.content)}
						{:else}
							Tell the AI how to behave and provide it with knowledge to answer your prompt.
						{/if}
					</p>

					<svelte:fragment slot="actions">
						{#if hasContext}
							<button
								type="button"
								class="btn btn-sm"
								on:click={() =>
									createNewChat({
										context: chat.contextMessage.content,
										settings: chat.settings
									})}
							>
								<span><DocumentDuplicate class="w-6 h-6" /></span>
							</button>
						{/if}
						<button
							type="button"
							class="btn btn-sm"
							on:click={() => showModalComponent(modalStore, 'ContextModal', { slug })}
						>
							<span><PencilSquare class="w-6 h-6" /></span>
						</button>
					</svelte:fragment>
				</HintMessage>
			</svelte:fragment>
		</Chat>

		<ChatInput {slug} chatCost={cost} bind:this={chatInput} />
	{/if}
</div>
