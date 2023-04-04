<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import hljs from 'highlight.js';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { chatStore, isLoadingAnswerStore, settingsStore } from '$misc/stores';
	import Toolbar from '$lib/Toolbar.svelte';
	import ChatInput from '$lib/ChatInput.svelte';
	import ChatMessages from '$lib/ChatMessages.svelte';
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
</script>

{#if chat}
	<Toolbar title={chat.title} on:closeChat={handleCloseChat}>
		<svelte:fragment slot="actions">
			<!-- Delete -->
			<button class="btn variant-ghost-error" on:click={showConfirmDeleteModal}>
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
						d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
					/>
				</svg>
			</button>

			<!-- Settings -->
			<span class="relative inline-flex">
				<button
					class="btn variant-ghost-warning"
					on:click={() => showModalComponent('SettingsModal', { slug })}
				>
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
							d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
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
				<button
					disabled={!chat.contextMessage.content?.length &&
						(!chat.messages || chat.messages.length < 2)}
					class="btn inline-flex variant-ghost-tertiary"
					on:click={() => showModalComponent('ShareModal', { slug }, handleChatShared)}
				>
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
							d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
						/>
					</svg>
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

	<ChatMessages {slug}>
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-6 h-6"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
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
	</ChatMessages>

	<ChatInput {slug} chatCost={cost} />
{/if}
