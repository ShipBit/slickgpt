<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { textareaAutosizeAction } from 'svelte-legos';
	import { focusTrap, getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { CodeBracket, PaperAirplane, CircleStack } from '@inqling/svelte-icons/heroicon-24-solid';
	import {
		type ChatCost,
		type ChatMessage,
		type ChatContent,
		showModalComponent,
		showToast,
		suggestChatTitle,
		track
	} from '$misc/shared';
	import {
		chatStore,
		eventSourceStore,
		isLoadingAnswerStore,
		liveAnswerStore,
		settingsStore,
		isPro
	} from '$misc/stores';
	import { AiProvider, countTokens, getProviderForModel, models } from '$misc/openai';
	import { AuthService } from '$misc/authService';
	import { get } from 'svelte/store';
	import {
		PUBLIC_GROQ_API_URL,
		PUBLIC_MIDDLEWARE_API_URL,
		PUBLIC_MISTRAL_API_URL,
		PUBLIC_MODERATION,
		PUBLIC_MODERATION_API_URL,
		PUBLIC_OPENAI_API_URL
	} from '$env/static/public';

	export let slug: string;
	export let chatCost: ChatCost | null;

	let debounceTimer: number | undefined;
	let input = '';
	let inputCopy = '';
	let textarea: HTMLTextAreaElement;
	let messageTokens = 0;
	let lastUserMessage: ChatMessage | null = null;
	let currentMessages: ChatMessage[] | null = null;
	let attachments: Array<ChatContent> = [];

	let isEditMode = false;
	let originalMessage: ChatMessage | null = null;

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	$: chat = $chatStore[slug];
	$: message = {
		role: 'user',
		content: input.trim()
	} as ChatMessage;
	$: provider = getProviderForModel(chat.settings.model);

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

	let dragOver = false;
	let fileInput: HTMLInputElement;

	onMount(() => {
		const dropZone = document.getElementById('drop-zone');
		if (dropZone) {
			dropZone.addEventListener('dragover', handleDragOver);
			dropZone.addEventListener('dragleave', handleDragLeave);
			dropZone.addEventListener('drop', handleDrop);
		}
	});

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			handleFiles(e.dataTransfer.files);
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			handleFiles(target.files);
		}
	}

	function handleFiles(files: FileList) {
		const file = files[0];
		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const base64 = e.target?.result as string;

				attachments.push({
					type: 'image_url',
					image_url: {
						url: base64,
						// TODO: Let user decide detail
						// default to high for now
						detail: 'high'
					},

					fileName: file.name
				});

				// TODO: Show user attachment in UI
				showToast(toastStore, 'Image uploaded successfully.', 'success');
			};
			reader.readAsDataURL(file);
		} else {
			// Show an error message or handle non-image files
			showToast(toastStore, 'Please upload only image files.', 'error');
		}
	}

	async function checkModerationApi(messages: ChatMessage[], token: string) {
		if (PUBLIC_MODERATION === 'true') {
			const textMessages = messages.map((msg) => msg.content);

			const moderationResponse = await fetch(PUBLIC_MODERATION_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ input: textMessages })
			});

			if (!moderationResponse.ok) {
				const err = await moderationResponse.json();
				throw new Error(err.error);
			}

			const moderationJson = await moderationResponse.json();

			for (let index = 0; index < moderationJson.results.length; index++) {
				const result = moderationJson.results[index];

				if (result.flagged) {
					handleError({
						data: JSON.stringify({
							message: `Message ${index + 1} is globally flagged for moderation.`
						})
					});
					return false;
				}

				for (const [category, flagged] of Object.entries(result.categories)) {
					if (flagged) {
						handleError({
							data: JSON.stringify({ message: `Message ${index + 1} is flagged for ${category}.` })
						});
						return false;
					}
				}
			}
		}
		return true;
	}

	// Variable to keep track of the user's first prompt
	let firstUserPrompt = '';
	// Flag to avoid multiple updates
	let hasUpdatedChatTitle = false;

	async function handleSubmit() {
		if (input.trim() === '' && attachments.length === 0) return;

		isLoadingAnswerStore.set(true);
		inputCopy = input;

		let message: ChatMessage = {
			role: 'user',
			content: [] as ChatContent[]
		};

		// Add the text input to the content
		if (input.trim() !== '') {
			// if (typeof message.content === 'string') {
			// 	message.content = [{ type: 'text', text: message.content }];
			// }
			(message.content as ChatContent[]).push({
				type: 'text',
				text: input.trim()
			});
		}

		// Add attachments
		(message.content as ChatContent[]).push(...attachments);

		let parent: ChatMessage | null = null;
		if (currentMessages && currentMessages.length > 0) {
			parent = chatStore.getMessageById(currentMessages[currentMessages.length - 1].id!, chat);
		}

		if (!isEditMode) {
			if (firstUserPrompt === '') {
				firstUserPrompt = input.trim();
			}
			chatStore.addMessageToChat(slug, message, parent || undefined);
			track('ask');
		} else if (originalMessage && originalMessage.id) {
			chatStore.addAsSibling(slug, originalMessage.id, message);
			track('edit');
		}

		// message now has an id
		lastUserMessage = message;

		// Create payload messages excluding filenames
		const messages =
			currentMessages?.map(
				(currentMessage) =>
					({
						role: currentMessage.role,
						content: Array.isArray(currentMessage.content)
							? currentMessage.content.map((contentItem) => {
									if ('fileName' in contentItem) {
										let { fileName, ...sanitizedContent } = contentItem;
										return sanitizedContent;
									}
									return contentItem;
								})
							: currentMessage.content
					}) as ChatMessage
			) ?? [];

		let payload: any;
		let token: string;
		let url: string;
		if ($isPro) {
			const authService = await AuthService.getInstance();
			token = get(authService.token);
			url = PUBLIC_MIDDLEWARE_API_URL;
			payload = {
				settings: {
					maxTokens: chat.settings.max_tokens,
					temperature: chat.settings.temperature,
					topP: chat.settings.top_p,
					stopSequences:
						chat.settings.stop === undefined
							? []
							: [...(Array.isArray(chat.settings.stop) ? chat.settings.stop : [chat.settings.stop])]
				},
				model: models[chat.settings.model].middlewareDeploymentName || chat.settings.model,
				messages: messages,
				stream: true
			};
		} else {
			switch (provider) {
				case AiProvider.Mistral:
					token = $settingsStore.mistralApiKey!;
					url = PUBLIC_MISTRAL_API_URL;
					break;
				case AiProvider.Meta:
					token = $settingsStore.metaApiKey!;
					url = PUBLIC_GROQ_API_URL;
					break;
				default:
					token = $settingsStore.openAiApiKey!;
					url = PUBLIC_OPENAI_API_URL;
					break;
			}

			if (provider === AiProvider.OpenAi && messages) {
				const moderationOk = await checkModerationApi(messages, token);
				if (!moderationOk) {
					return;
				}
			}

			payload = {
				...chat.settings,
				messages,
				stream: true
			};
		}

		$eventSourceStore.start(url, payload, handleAnswer, handleError, handleAbort, token);
		input = '';
		attachments = [];
	}

	let rawAnswer: string = '';

	function showLiveResponse(delta: string) {
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

	async function handleAnswer(event: MessageEvent<any>) {
		try {
			if ($isPro) {
				if (event.data) {
					const completionResponse: any = JSON.parse(event.data);
					const delta = completionResponse?.ContentUpdate;
					showLiveResponse(delta);
				} else {
					addCompletionToChat();
				}
			} else {
				try {
					const completionResponse: any = JSON.parse(event.data);
					const isFinished = completionResponse.choices[0].finish_reason === 'stop';
					if (!isFinished) {
						const delta: string = completionResponse.choices[0].delta.content || '';
						showLiveResponse(delta);
					} else {
						addCompletionToChat();
					}
				} catch (err) {
					if (event.data == '[DONE]') {
						//addCompletionToChat();
						handleAbort(event);
						showToast(
							toastStore,
							`The current model '${chat.settings.model}' returns finish message [DONE]` ,
							'warning',
							true,
							5000
						);
					} else {
						throw err;
					}
				}
			}
			if ($settingsStore.useTitleSuggestions && !hasUpdatedChatTitle && firstUserPrompt) {
				hasUpdatedChatTitle = true; // Ensure the title is only updated once
				
				const suggestedTitle = await suggestChatTitle({
					...chat,
					messages: [...chat.messages, { role: 'user', content: firstUserPrompt }]
				});
				const cleanedTitle = suggestedTitle.replace(/^"(.*)"$/, '$1').trim();
				
				chatStore.updateChat(slug, { title: cleanedTitle || chat.title });
			}
		} catch (err) {
			handleError(err);
		}
	}

	function handleAbort(_event: MessageEvent<any>) {
		// the message we're adding is incomplete, so HLJS probably can't highlight it correctly
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

		showToast(toastStore, data.message || 'An error occurred.', 'error');

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

	async function addNewLineAndResize() {
		input += '\n';

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);
	}

	function handleKeyDown(event: KeyboardEvent) {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(calculateMessageTokens, 750);

		if ($isLoadingAnswerStore) {
			return;
		}

		switch (event.key) {
			case 'ArrowUp':
			case 'ArrowDown':
				event.stopImmediatePropagation();
				break;
			case 'Enter':
				if (!event.shiftKey) {
					if (input.trim() === '') {
						// Create a new line if input is whitespace.
						addNewLineAndResize();
					} else {
						handleSubmit();
					}
				}
				break;
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
		input = Array.isArray(message.content)
			? message.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
			: message.content;
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

<footer class="sticky space-y-4 bottom-0 z-10 card variant-surface p-2 rounded-none md:rounded-lg">
	{#if $isLoadingAnswerStore}
		<div class="flex items-center justify-center">
			<button class="btn variant-ghost w-48 self-center" on:click={() => $eventSourceStore.stop()}>
				Cancel generating
			</button>
		</div>
	{:else}
		<div class="flex flex-col space-y-2 md:mx-auto md:w-3/4">
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
						<div id="drop-zone" class="relative" class:drag-over={dragOver}>
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
							<div class="flex items-center">
								<!-- Tokens -->
								{#if input.length > 0}
									<button
										type="button"
										class="btn btn-sm hidden md:inline"
										class:animate-pulse={!!debounceTimer}
										on:click={openTokenCostDialog}
									>
										<span class="flex items-center text-xs text-slate-500 dark:text-slate-200 gap-1"
											><CircleStack class="w-5 h-5" /> {tokensLeft} left</span
										>
									</button>
								{/if}
								<!-- Send button -->
								<button type="submit" class="btn btn-sm">
									<PaperAirplane class="w-6 h-6" />
								</button>
								<!-- Insert Code button -->
								<button
									type="button"
									class="btn btn-sm hidden md:inline"
									on:click|preventDefault={handleInsertCode}
								>
									<CodeBracket class="w-6 h-6" />
								</button>
								<!-- Image Upload button -->
								<button type="button" class="btn btn-sm" on:click={() => fileInput.click()}>
									<!-- You can replace this with an appropriate icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-6 h-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</button>
								<input
									type="file"
									accept="image/*"
									style="display: none;"
									on:change={handleFileSelect}
									bind:this={fileInput}
								/>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</footer>
