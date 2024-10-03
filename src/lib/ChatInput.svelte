<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { textareaAutosizeAction } from 'svelte-legos';
	import {
		focusTrap,
		getModalStore,
		getToastStore,
		FileButton,
		FileDropzone
	} from '@skeletonlabs/skeleton';
	import { CodeBracket, PaperAirplane, CircleStack } from '@inqling/svelte-icons/heroicon-24-solid';
	import {
	type ChatContent,
		type ChatCost,
		type ChatMessage,
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
		isPro,
		attachments
	} from '$misc/stores';
	import { AiProvider, countTokens, getProviderForModel, models } from '$misc/openai';
	import { AuthService } from '$misc/authService';
	import { get } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import {
		PUBLIC_GROQ_API_URL,
		PUBLIC_MIDDLEWARE_API_URL,
		PUBLIC_MISTRAL_API_URL,
		PUBLIC_OPENAI_API_URL
	} from '$env/static/public';
	import { handleDragEnter, handleDragLeave, pasteImage } from '$misc/inputUtils';
	import { uploadFiles } from '$misc/fileUtils';

	export let slug: string;
	export let chatCost: ChatCost | null;
	export let shouldDebounce = false;

	let debounceTimer: number | undefined;
	let input = '';
	let inputCopy = '';
	let textarea: HTMLTextAreaElement;
	let messageTokens = 0;
	let lastUserMessage: ChatMessage | null = null;
	let currentMessages: ChatMessage[] | null = null;

	let hasUpdatedChatTitle = false;
	let isEditMode = false;
	let originalMessage: ChatMessage | null = null;
	let isDraggingFile = false;

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	$: if (message && shouldDebounce) {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(() => {
			shouldDebounce = false;
			calculateMessageTokens();
		}, 750);
	}

	$: chat = $chatStore[slug];
	$: message = {
		role: 'user',
		content: [
			...(input.trim() !== ''
				? [{ type: 'text', text: input.trim() }]
				: [{ type: 'text', text: '' }]),
			...$attachments
		]
	} as ChatMessage;
	$: provider = getProviderForModel(chat.settings.model);

	const unsubscribe = chatStore.subscribe((chats) => {
		const chat = chats[slug];
		if (chat) {
			currentMessages = chatStore.getCurrentMessageBranch(chat);
		}
	});

	onDestroy(unsubscribe);

	$: tokensLeft = chatCost
		? chatCost.maxTokensForModel - (chatCost.tokensTotal + messageTokens)
		: -1;
	$: maxTokensCompletion = chat.settings.max_tokens;
	// $: showTokenWarning = maxTokensCompletion > tokensLeft;

	async function handleSubmit() {
		if (input.trim() === '' && $attachments.length === 0) return;

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

		const processContentItem = (contentItem: ChatContent) => {
			if ('fileName' in contentItem) {
				const { fileName, ...sanitizedContent } = contentItem;
				return sanitizedContent;
			}
			return contentItem;
		};

		const processMessageContent = (message: ChatMessage) => {
			if (Array.isArray(message.content)) {
				return message.content.map(processContentItem);
			} else if (message.role === 'assistant' || message.role === 'system') {
				return message.content;
			}

			return [{ type: 'text', text: message.content }];
		};

		const messages = currentMessages?.map((message) => ({
			role: message.role,
			content: processMessageContent(message)
		})) as ChatMessage[];

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
					stopSequences: chat.settings.stop
						? Array.isArray(chat.settings.stop)
							? chat.settings.stop
							: [chat.settings.stop]
						: []
				},
				model: models[chat.settings.model].middlewareDeploymentName || chat.settings.model,
				messages,
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

			payload = {
				...chat.settings,
				messages,
				stream: true
			};
		}

		$eventSourceStore.start(url, payload, handleAnswer, handleError, handleAbort, token);
		input = '';
		$attachments = [];
	}

	let rawAnswer: string = '';

	function showLiveResponse(delta: string) {
		liveAnswerStore.update((store) => {
			const answer = { ...store };
			rawAnswer += delta;
			const codeBlocks = rawAnswer.match(/```/g) || [];
			const openCodeBlockWithoutClose = codeBlocks.length % 2 !== 0;
			answer.content = openCodeBlockWithoutClose ? rawAnswer + '\n```' : rawAnswer;
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
							`The current model '${chat.settings.model}' returns finish message [DONE]`,
							'warning',
							true,
							5000
						);
					} else {
						throw err;
					}
				}
			}

			if (
				$settingsStore.useTitleSuggestions &&
				!hasUpdatedChatTitle &&
				chat.hasUpdatedChatTitle !== true
			) {
				hasUpdatedChatTitle = true;
				const title = await suggestChatTitle({
					...chat,
					messages: [...chat.messages, { role: 'user', content: input.trim() }]
				});
				chatStore.updateChat(slug, { title, hasUpdatedChatTitle: true }); // Store the variable in the chat store
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
		liveAnswerStore.update((store) => ({ ...store, content: '' }));
		rawAnswer = '';
	}

	async function addNewLineAndResize() {
		input += '\n';

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if ($isLoadingAnswerStore) return;

		switch (event.key) {
			case 'ArrowUp':
			case 'ArrowDown':
				event.stopImmediatePropagation();
				break;
			case 'Enter':
				if (!event.shiftKey) {
					if (input.trim() === '' && $attachments.length === 0) {
						// Create a new line if input is whitespace.
						addNewLineAndResize();
					} else {
						handleSubmit();
					}
				}
				break;
			default:
				shouldDebounce = true;
				break;
		}
	}

	function calculateMessageTokens() {
		messageTokens = countTokens(message);
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

	async function handlePaste(event: ClipboardEvent) {
		const newAttachments = await pasteImage(event, toastStore, $attachments.length);
		$attachments = [...$attachments, ...newAttachments];
		shouldDebounce = true;
	}

	async function uploadFilesAndDebounce(files: FileList) {
		const newAttachments = await uploadFiles(files, toastStore, $attachments.length);
		$attachments = [...$attachments, ...newAttachments];
		shouldDebounce = true;
	}

	async function handleFileDrop(event: DragEvent) {
		isDraggingFile = false;
		if (event.dataTransfer?.files) {
			await uploadFilesAndDebounce(event.dataTransfer.files);
		}
	}

	async function handleFileChange(event: Event & { target: HTMLInputElement & EventTarget }) {
		if (event?.target?.files) {
			await uploadFilesAndDebounce(event.target.files);
			// Clear the file input after processing
			event.target.value = '';
		}
	}
</script>

<!-- Footer component for chat input -->
<footer class="sticky space-y-4 bottom-0 z-10 card variant-surface p-2 rounded-none md:rounded-lg">
	<!-- Check if answer is loading -->
	{#if $isLoadingAnswerStore}
		<!-- Display cancel button when answer is loading -->
		<div class="flex items-center justify-center">
			<button class="btn variant-ghost w-48 self-center" on:click={() => $eventSourceStore.stop()}>
				Cancel generating
			</button>
		</div>
	{:else}
		<!-- Main chat input area -->
		<div class="flex flex-col space-y-2 md:mx-auto md:w-3/4">
			<!-- Display edit mode message if active -->
			{#if isEditMode}
				<div class="flex items-center justify-between">
					<p>Editing creates a <span class="italic">chat branch</span>.</p>
					<button class="btn btn-sm" on:click={cancelEditMessage}>
						<span>Cancel</span>
					</button>
				</div>
			{/if}
			<div class="grid">
				<!-- Chat input form -->
				<form use:focusTrap={!$isLoadingAnswerStore} on:submit|preventDefault={handleSubmit}>
					<div class="grid grid-cols-[1fr_auto]">
						<div class="relative flex flex-col">
							<!-- Textarea for user input -->
							<textarea
								class="textarea overflow-hidden min-h-[42px] w-full"
								rows="1"
								placeholder="Enter to send, Shift+Enter for newline"
								use:textareaAutosizeAction
								on:keydown={handleKeyDown}
								on:paste={handlePaste}
								bind:value={input}
								bind:this={textarea}
								on:dragenter={(event) => (isDraggingFile = handleDragEnter(event))}
							/>
							<!-- File drop zone overlay -->
							{#if provider === AiProvider.OpenAi && isDraggingFile}
								<div
									class="absolute inset-0 bg-primary-500/50 flex items-center justify-center text-white"
									transition:fade={{ duration: 150 }}
									on:dragleave={(event) => (isDraggingFile = handleDragLeave(event))}
									on:drop={handleFileDrop}
									role="region"
									aria-label="File drop area"
								>
									<FileDropzone
										name="files"
										accept="image/jpeg,image/jpg,image/gif,image/webp,image/png"
										multiple
									>
										<span>Drop images here</span>
									</FileDropzone>
								</div>
							{/if}
						</div>
						<!-- Action buttons -->
						<div class="flex items-center">
							<!-- Token count button -->
							{#if input.length > 0 || $attachments.length > 0}
								<button
									type="button"
									class="btn btn-sm hidden md:inline"
									class:animate-pulse={!!debounceTimer}
									on:click={openTokenCostDialog}
								>
									<span class="flex items-center text-xs text-slate-500 dark:text-slate-200 gap-1">
										<CircleStack class="w-5 h-5" />
										{tokensLeft} left
									</span>
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
							{#if provider === AiProvider.OpenAi}
								<FileButton
									name="files"
									button="btn-icon btn-sm"
									accept="image/jpeg,image/jpg,image/gif,image/webp,image/png"
									multiple
									on:change={handleFileChange}
								>
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
								</FileButton>
							{/if}
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</footer>
