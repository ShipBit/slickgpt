<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import hljs from 'highlight.js';
	import { XMark } from '@inqling/svelte-icons/heroicon-24-solid';
	import { Trash, Cog6Tooth, Share } from '@inqling/svelte-icons/heroicon-24-outline';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { chatStore, isLoadingAnswerStore, settingsStore } from '$misc/stores';
	import Toolbar from '$lib/Toolbar.svelte';
	import ChatInput from '$lib/ChatInput.svelte';
	import Chat from '$lib/Chat.svelte';
	import HintMessage from '$lib/HintMessage.svelte';
	import TokenCost from '$lib/TokenCost.svelte';
	import { countTokens, estimateChatCost } from '$misc/openai';
	import {
		canSuggestTitle,
		createNewChat,
		showModalComponent,
		showToast,
		suggestChatTitle,
		track
	} from '$misc/shared';
	import snarkdown from 'snarkdown';

	export let data: PageData;
	$: ({ slug } = data);

	$: chat = $chatStore[slug];
	$: cost = chat ? estimateChatCost(chat) : null;
	$: hasContext = chat?.contextMessage?.content?.length || false;
	$: hasStopSequence = chat?.settings.stop?.length || false;

	onMount(async () => {
		await highlightCode();
	});

	const unsubscribeChatStore = chatStore.subscribe(async () => {
		await highlightCode();
	});

	const unsubscribeisLoadingAnswerStore = isLoadingAnswerStore.subscribe(async () => {
		await highlightCode();
	});

	onDestroy(() => {
		unsubscribeChatStore();
		unsubscribeisLoadingAnswerStore();
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
			showToast('Empty chat was discarded automatically', 'secondary');
			deleteChat(true);
		}

		// already has a title
		if (chat.title !== slug || !canSuggestTitle(chat)) {
			goto('/');
			return;
		}

		// has no title
		if ($settingsStore.useTitleSuggestions) {
			if ($settingsStore.openAiApiKey) {
				const title = await suggestChatTitle(chat, $settingsStore.openAiApiKey);
				chatStore.updateChat(slug, { title });
				showToast(`Chat title set to: '${title}'`, 'secondary');
			}
			goto('/');
		} else {
			showModalComponent('SuggestTitleModal', { slug }, () => {
				// see https://www.reddit.com/r/sveltejs/comments/10o7tpu/sveltekit_issue_goto_not_working_on_ios/
				// await tick() doesn't fix it, hence setTimeout
				setTimeout(() => goto('/'), 0);
			});
		}
	}

	function handleRenameChat(event: CustomEvent<string>) {
		chatStore.updateChat(slug, { title: event.detail });
	}
</script>

{#if chat}
	<Toolbar
		{slug}
		title={chat.title}
		on:closeChat={handleCloseChat}
		on:renameChat={handleRenameChat}
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
					on:click={() => showModalComponent('SettingsModal', { slug })}
				>
					<Cog6Tooth class="w-6 h-6" />
				</button>
				{#if !$settingsStore.openAiApiKey}
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
				style={!$settingsStore.openAiApiKey ? 'margin-left: -4px;' : ''}
			>
				<!-- TODO: count messages horizontally in all chat branches -->
				<button
					disabled={!chat.contextMessage.content?.length &&
						(!chat.messages || chat.messages.length < 2)}
					class="btn btn-sm inline-flex variant-ghost-tertiary"
					on:click={() => showModalComponent('ShareModal', { slug }, handleChatShared)}
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

	<Chat {slug}>
		<svelte:fragment slot="additional-content-top">
			<!-- Language hint -->
			{#if !$settingsStore.hideLanguageHint}
				<HintMessage title="Did you know?" variantClass="variant-ghost-surface">
					<p>
						ChatGPT understands various languages. You can just ask your questions in German if you
						like.
					</p>
					<svelte:fragment slot="actions">
						<button class="btn btn-sm" on:click={() => ($settingsStore.hideLanguageHint = true)}>
							<XMark class="w-6 h-6" />
						</button>
					</svelte:fragment>
				</HintMessage>
			{/if}

			<!-- Context -->
			<HintMessage
				title="Context"
				variantClass="variant-ghost-tertiary"
				actionClass="grid h-full"
				omitAlertActionsClass={true}
			>
				{#if hasContext}
					<p>
						{@html snarkdown(chat.contextMessage.content)}
					</p>
				{/if}
				{#if hasStopSequence}
					<p class="text-xs text-slate-500">
						Stop:
						{Array.isArray(chat.settings.stop) ? chat.settings.stop.join(', ') : chat.settings.stop}
					</p>
				{/if}
				{#if !hasContext && !hasStopSequence}
					<p>
						You can give the AI an initial <strong>context</strong> for your chat which greatly
						changes the way it will behave during the conversation. Use a
						<strong>stop sequence</strong> to limit the answers given by ChatGPT.
					</p>
				{/if}

				<svelte:fragment slot="actions">
					{#if hasContext}
						<!-- Tokens -->
						<div class="justify-self-end mb-2">
							<TokenCost tokens={countTokens(chat.contextMessage)} />
						</div>
					{/if}
					<div class="flex flex-row md:flex-col space-x-2 space-y-2">
						<button
							class="btn self-center variant-filled-primary"
							on:click={() => showModalComponent('ContextModal', { slug })}
						>
							Edit
						</button>
						{#if hasContext}
							<button
								class="btn self-center variant-filled-tertiary"
								on:click={() =>
									createNewChat({ context: chat.contextMessage.content, settings: chat.settings })}
							>
								New Chat
							</button>
						{/if}
					</div>
				</svelte:fragment>
			</HintMessage>
		</svelte:fragment>
	</Chat>

	<ChatInput {slug} chatCost={cost} />
{/if}
