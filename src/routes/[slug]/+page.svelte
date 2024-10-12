<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { DocumentDuplicate, PencilSquare } from '@inqling/svelte-icons/heroicon-24-solid';
	import { Cog6Tooth, Share, Trash, XMark } from '@inqling/svelte-icons/heroicon-24-outline';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import {
		attachments,
		chatStore,
		isLoadingAnswerStore,
		isPro,
		liveAnswerStore,
		settingsStore
	} from '$misc/stores';
	import ChatInput from '$lib/ChatInput.svelte';
	import Chat from '$lib/Chat.svelte';
	import HintMessage from '$lib/HintMessage.svelte';
	import {
		countTokens,
		estimateChatCost,
		getProviderForModel,
		modelExists,
		defaultOpenAiSettings
	} from '$misc/openai';
	import {
		canSuggestTitle,
		type ChatMessage,
		createNewChat,
		showModalComponent,
		showToast,
		suggestChatTitle,
		track
	} from '$misc/shared';
	import { renderMarkdown } from '$misc/markdownUtils';
	import { highlightCode } from '$misc/highlightCode';
	import Toolbar from '$lib/Toolbar.svelte';

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	export let data: PageData;

	let shouldDebounce = false;

	$: ({ slug } = data);
	$: chat = $chatStore[slug];
	$: {
		if (chat && !modelExists(chat.settings.model)) {
			// When the model of a session no longer exists in /is deleted from slickgpt,
			showToast(
				toastStore,
				`The model '${chat.settings.model}' used in this chat is ` +
					`no longer available. Switched to the default model ` +
					`'${defaultOpenAiSettings.model}'.`,
				'warning',
				true,
				30000
			);
			chat.settings.model = defaultOpenAiSettings.model; // fall back to the default model so the page won't hang.
		}
	}
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
	function removeAttachment(index: number) {
		const attachment = $attachments[index]?.fileData?.attachment;
		if (attachment?.quantity) {
			const quantityToDelete = attachment.quantity;
			$attachments = $attachments.filter((_, i) => i < index || i > index + quantityToDelete);
		} else {
			$attachments = $attachments.filter((_, i) => i !== index);
		}
		shouldDebounce = true;
	}
</script>

{#if chat}
	<div class="relative flex flex-col h-full gap-4">
		<Toolbar
			{slug}
			title={chat.title}
			on:closeChat={handleCloseChat}
			on:renameChat={handleEditTitle}
		>
			<svelte:fragment slot="actions">
				<!-- Delete -->
				<button class="btn btn-sm variant-ghost-error" on:click={showConfirmDeleteModal}>
					<Trash class="w-6 h-6" />
				</button>

				<!-- Settings -->
				<span class="relative inline-flex">
					<button
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
						disabled={!chat.contextMessage.content?.length && !chat.messages?.length}
						class="btn btn-sm inline-flex variant-ghost-tertiary"
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
			</svelte:fragment>
		</Toolbar>

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
							{@html renderMarkdown(chat.contextMessage)}
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

		<!-- File attachments -->
		{#if $attachments.length > 0}
			<div class="sticky mx-auto bottom-0">
				<div class="flex flex-wrap z-10">
					{#each $attachments as attachment, index}
						{#if attachment.type === 'image_url' && !attachment.fileData?.attachment?.fileAttached}
							<button
								type="button"
								class="btn btn-sm relative rounded-full"
								aria-label="Remove attachment {attachment.fileData?.name}"
								on:click={() => removeAttachment(index)}
							>
								<span class="absolute -top-2 right-0 p-0 bg-slate-600 opacity-80 rounded-full">
									<XMark class="text-white w-5 h-5" />
								</span>
								<img
									src={attachment.image_url?.url}
									alt={attachment.fileData?.name}
									class="w-16 h-16 object-cover rounded"
								/>
							</button>
						{/if}
						{#if attachment.type === 'text' && attachment.fileData?.attachment?.fileAttached}
							<button
								type="button"
								class="btn btn-sm relative rounded-full"
								aria-label="Remove attachment {attachment.fileData?.name}"
								on:click={() => removeAttachment(index)}
							>
								<span class="absolute -top-2 right-0 p-0 bg-gray-700 opacity-90 rounded-full">
									<XMark class="text-white w-5 h-5" />
								</span>
								<div
									class="w-20 h-24 flex flex-col items-center justify-center bg-white rounded-md border border-gray-300 shadow-md"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-8 h-8 mb-1 text-gray-600"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path
											d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 3.5L18.5 9H13V3.5zM6 20V4h7v5h5v11H6z"
										/>
									</svg>
									<span class="text-xs text-gray-800 truncate w-full text-center"
										>{attachment.fileData?.name}</span
									>
								</div>
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

		<ChatInput {slug} chatCost={cost} {shouldDebounce} bind:this={chatInput} />
	</div>
{/if}
