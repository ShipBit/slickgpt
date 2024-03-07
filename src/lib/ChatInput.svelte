<script lang="ts">
	import type { ChatCompletionMessageParam } from 'openai/resources/chat';
	import { onDestroy, tick } from 'svelte';
	import { textareaAutosizeAction } from 'svelte-legos';
	import { focusTrap, getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { CodeBracket, PaperAirplane, CircleStack } from '@inqling/svelte-icons/heroicon-24-solid';
	import {
		type ChatCost,
		type ChatMessage,
		showModalComponent,
		showToast,
		track
	} from '$misc/shared';
	import {
		chatStore,
		eventSourceStore,
		isLoadingAnswerStore,
		liveAnswerStore,
		settingsStore,
		mode
	} from '$misc/stores';
	import { countTokens } from '$misc/openai';
	import { AuthService } from '$misc/authService';
	import { get } from 'svelte/store';

	export let slug: string;
	export let chatCost: ChatCost | null;

	let debounceTimer: number | undefined;
	let input = '';
	let inputCopy = '';
	let textarea: HTMLTextAreaElement;
	let messageTokens = 0;
	let lastUserMessage: ChatMessage | null = null;
	let currentMessages: ChatMessage[] | null = null;

	let isEditMode = false;
	let originalMessage: ChatMessage | null = null;

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	$: chat = $chatStore[slug];
	$: message = {
		role: 'user',
		content: input.trim()
	} as ChatCompletionMessageParam;

	const unsubscribe = chatStore.subscribe((chats) => {
		const chat = chats[slug];
		if (chat) {
			currentMessages = chatStore.getCurrentMessageBranch(chat);
		}
	});

	onDestroy(unsubscribe);

	let tokensLeft = -1;
	$: {
		tokensLeft = chatCost
			? chatCost.maxTokensForModel - (chatCost.tokensTotal + messageTokens)
			: -1;
	}
	$: maxTokensCompletion = chat.settings.max_tokens;
	// $: showTokenWarning = maxTokensCompletion > tokensLeft;

	async function handleSubmit() {
		isLoadingAnswerStore.set(true);
		inputCopy = input;

		let parent: ChatMessage | null = null;
		if (currentMessages && currentMessages.length > 0) {
			parent = chatStore.getMessageById(currentMessages[currentMessages.length - 1].id!, chat);
		}

		if (!isEditMode) {
			chatStore.addMessageToChat(slug, message, parent || undefined);
			track('ask');
		} else if (originalMessage && originalMessage.id) {
			chatStore.addAsSibling(slug, originalMessage.id, message);
			track('edit');
		}

		// message now has an id
		lastUserMessage = message;

		let token = $settingsStore.openAiApiKey;
		if ($mode === 'middleware') {
			const authService = await AuthService.getInstance();
			token = get(authService.token);
		}

		const payload = {
			token,
			mode: $mode,
			settings: chat.settings,
			// OpenAI API complains if we send additionale props
			messages: currentMessages?.map(
				(m) =>
					({
						role: m.role,
						content: m.content,
						name: m.name
					}) as ChatCompletionMessageParam
			)
		};

		await $eventSourceStore.start(payload, handleAnswer, handleError, handleAbort);
		input = '';
	}

	let rawAnswer: string = '';
	function handleAnswer(event: MessageEvent<any>) {
		try {
			// streaming...
			const completionResponse: any = JSON.parse(event.data);
			const isFinished = completionResponse.choices[0].finish_reason === 'stop';
			if (event.data !== '[DONE]' && !isFinished) {
				const delta: string = completionResponse.choices[0].delta.content || '';
				liveAnswerStore.update((store) => {
					const answer = { ...store };
					rawAnswer += delta;
					const codeBlocks = rawAnswer.match(/```/g) || [];
					const openCodeBlockWithoutClose = codeBlocks.length % 2 !== 0;
					if (openCodeBlockWithoutClose) {
						answer.content = rawAnswer + '\n```';
					} else {
						answer.content = rawAnswer;
					}
					return answer;
				});
			}
			// streaming completed or message indicates to stop
			else {
				// Handle completion of text streaming
				addCompletionToChat();
			}
		} catch (err) {
			handleError(err);
		}
	}

	function handleAbort(_event: MessageEvent<any>) {
		// th message we're adding is incomplete, so HLJS probably can't highlight it correctly
		addCompletionToChat(true);
	}

	function handleError(event: any) {
		$eventSourceStore.reset();
		$isLoadingAnswerStore = false;

		// always true, check just for TypeScript
		if (lastUserMessage?.id) {
			chatStore.deleteMessage(slug, lastUserMessage.id);
		}

		console.error(event);

		const data = JSON.parse(event.data);

		showToast(toastStore, data.message || 'An error occured.', 'error');

		if (data.message.includes('API key')) {
			showModalComponent(modalStore, 'SettingsModal', { slug });
		}

		// restore last user prompt
		input = inputCopy;
	}

	function addCompletionToChat(isAborted = false) {
		const messageToAdd: ChatMessage = !isAborted
			? { ...$liveAnswerStore }
			: { ...$liveAnswerStore, isAborted: true };

		chatStore.addMessageToChat(slug, messageToAdd, lastUserMessage || undefined);
		$isLoadingAnswerStore = false;

		$eventSourceStore.reset();
		resetLiveAnswer();
		lastUserMessage = null;
		cancelEditMessage();
	}

	function resetLiveAnswer() {
		liveAnswerStore.update((store) => {
			const answer = { ...store };
			answer.content = '';
			return answer;
		});
		rawAnswer = '';
	}

	function handleKeyDown(event: KeyboardEvent) {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(calculateMessageTokens, 750);

		if ($isLoadingAnswerStore) {
			return;
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			handleSubmit();
		}
	}

	function calculateMessageTokens() {
		messageTokens = countTokens(message);
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}

	function openTokenCostDialog() {
		calculateMessageTokens();
		showModalComponent(modalStore, 'CostModal', { chatCost, maxTokensCompletion, messageTokens });
	}

	async function handleInsertCode() {
		input += '\n```\n\n```';

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);

		calculateMessageTokens();
	}

	export async function editMessage(message: ChatMessage) {
		originalMessage = message;
		input = message.content;
		isEditMode = true;

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);
	}

	async function cancelEditMessage() {
		isEditMode = false;
		originalMessage = null;
		input = '';

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);
	}
</script>

<footer
	class="sticky card space-y-4 bottom-0 z-10 variant-filled-surface-700 py-2 md:py-4 md:px-8 md:rounded-xl"
>
	{#if $isLoadingAnswerStore}
		<div class="flex items-center justify-center">
			<button class="btn variant-ghost w-48 self-center" on:click={() => $eventSourceStore.stop()}>
				Cancel generating
			</button>
		</div>
	{:else}
		<div class="flex flex-col space-y-2 md:mx-auto md:w-3/4 px-2 md:px-8">
			{#if isEditMode}
				<div class="flex items-center justify-between">
					<p>Editing creates a <span class="italic">chat branch</span>.</p>
					<button class="btn btn-sm" on:click={cancelEditMessage}>
						<span>Cancel</span>
					</button>
				</div>
			{/if}
			<div class="grid">
				<form use:focusTrap={!$isLoadingAnswerStore} on:submit|preventDefault={handleSubmit}>
					<div class="grid grid-cols-[1fr_auto]">
						<!-- Input -->
						<textarea
							class="textarea overflow-hidden min-h-[42px]"
							rows="1"
							placeholder="Enter to send, Shift+Enter for newline"
							use:textareaAutosizeAction
							on:keydown={handleKeyDown}
							bind:value={input}
							bind:this={textarea}
						/>
						<div class="flex flex-col md:flex-row items-center justify-end md:items-end">
							<!-- Insert Code button -->
							<button
								type="submit"
								class="btn btn-sm ml-2"
								on:click|preventDefault={handleInsertCode}
							>
								<CodeBracket class="w-6 h-6" />
							</button>
							<!-- Send button -->
							<button type="submit" class="btn btn-sm ml-2">
								<PaperAirplane class="w-6 h-6" />
							</button>
						</div>
					</div>
				</form>
			</div>
			<!-- Tokens -->
			{#if input.length > 0}
				<button
					class="flex items-center text-xs text-slate-500 dark:text-slate-200 ml-4 space-x-1"
					class:animate-pulse={!!debounceTimer}
					on:click={openTokenCostDialog}
				>
					<span>{tokensLeft} tokens left</span>
					<CircleStack class="w-6 h-6" />
				</button>
			{/if}
		</div>
	{/if}
</footer>
