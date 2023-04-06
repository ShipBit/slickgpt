<script lang="ts">
	import type { ChatCompletionRequestMessage } from 'openai';
	import { tick } from 'svelte';
	import { textareaAutosizeAction } from 'svelte-legos';
	import { focusTrap } from '@skeletonlabs/skeleton';
	import { CodeBracket, PaperAirplane, CircleStack } from '@inqling/svelte-icons/heroicon-24-solid';
	import {
		showModalComponent,
		showToast,
		track,
		type ChatCost,
		type ChatMessage
	} from '$misc/shared';
	import {
		chatStore,
		eventSourceStore,
		isLoadingAnswerStore,
		liveAnswerStore,
		settingsStore
	} from '$misc/stores';
	import { countTokens } from '$misc/openai';

	export let slug: string;
	export let chatCost: ChatCost | null;

	let debounceTimer: number | undefined;
	let input = '';
	let inputCopy = '';
	let textarea: HTMLTextAreaElement;
	let messageTokens = 0;
	let lastUserMessage: ChatMessage | null = null;

	$: message = {
		role: 'user',
		content: input.trim()
	} as ChatCompletionRequestMessage;

	let tokensLeft = -1;
	$: {
		tokensLeft = chatCost
			? chatCost.maxTokensForModel - (chatCost.tokensTotal + messageTokens)
			: -1;
	}
	$: maxTokensCompletion = $chatStore[slug].settings.max_tokens;
	// $: showTokenWarning = maxTokensCompletion > tokensLeft;

	function handleSubmit() {
		track('ask');
		isLoadingAnswerStore.set(true);
		inputCopy = input;

		chatStore.addMessageToChat(slug, message);
		// message now has an id
		lastUserMessage = message;

		// TODO: Send only the messages of the current chat "branch" to the server
		const payload = {
			messages: $chatStore[slug].contextMessage.content // omit context if empty to save some tokens
				? [$chatStore[slug].contextMessage, ...$chatStore[slug].messages]
				: [...$chatStore[slug].messages],
			settings: $chatStore[slug].settings,
			openAiKey: $settingsStore.openAiApiKey
		};

		$eventSourceStore.start(payload, handleAnswer, handleError);
		input = '';
	}

	function handleAnswer(event: MessageEvent<any>) {
		try {
			// streaming...
			if (event.data !== '[DONE]') {
				// todo What's the correct type for this? It's not CreateChatCompletionResponse... maybe still missing in TypeDefs?
				const completionResponse: any = JSON.parse(event.data);
				const delta = completionResponse.choices[0].delta.content || '';
				liveAnswerStore.update((store) => {
					const answer = { ...store };
					answer.content += delta;
					return answer;
				});
			}
			// streaming completed
			else {
				chatStore.addMessageToChat(slug, $liveAnswerStore);
				isLoadingAnswerStore.set(false);

				$eventSourceStore.reset();
				resetLiveAnswer();
				lastUserMessage = null;
			}
		} catch (err) {
			handleError(err);
		}
	}

	function resetLiveAnswer() {
		liveAnswerStore.update((store) => {
			const answer = { ...store };
			answer.content = '';
			return answer;
		});
	}

	function handleError(event: any) {
		$eventSourceStore.reset();
		isLoadingAnswerStore.set(false);

		// always true, check just for TypeScript
		if (lastUserMessage?.id) {
			chatStore.deleteMessage(slug, lastUserMessage.id);
		}

		console.error(event);

		const data = JSON.parse(event.data);

		showToast(data.message || 'An error occured.', 'error');

		if (data.message.includes('API key')) {
			showModalComponent('SettingsModal', { slug });
		}

		// restore last user prompt
		input = inputCopy;
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
		showModalComponent('CostModal', { chatCost, maxTokensCompletion, messageTokens });
	}

	async function handleInsertCode() {
		input += '\n```\n\n```';

		// tick is required for the action to resize the textarea
		await tick();
		textareaAutosizeAction(textarea);

		calculateMessageTokens();
	}

	function stopGenerating() {
		$eventSourceStore.stop();
		$isLoadingAnswerStore = false;
		resetLiveAnswer();
	}
</script>

<footer
	class="sticky card space-y-4 bottom-0 z-10 variant-filled-surface-700 py-2 md:py-4 md:px-8 md:rounded-xl"
>
	{#if $isLoadingAnswerStore}
		<div class="flex items-center justify-center">
			<button class="btn variant-ghost w-48 self-center" on:click={stopGenerating}>
				Cancel generating
			</button>
		</div>
	{:else}
		<div class="flex flex-col space-y-2 md:mx-auto md:w-3/4 px-2 md:px-8">
			<div class="grid">
				<form use:focusTrap={!$isLoadingAnswerStore} on:submit|preventDefault={handleSubmit}>
					<div class="grid grid-cols-[1fr_auto]">
						<!-- Input -->
						<textarea
							class="textarea overflow-hidden"
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
