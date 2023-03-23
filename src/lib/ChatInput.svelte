<script lang="ts">
	import type { ChatCompletionRequestMessage } from 'openai';
	import { showModalComponent, track, type ChatCost } from '$misc/shared';
	import { tick } from 'svelte';
	import { SSE } from 'sse.js';
	import autosize from 'svelte-autosize';
	import { focusTrap, toastStore, type ToastSettings } from '@skeletonlabs/skeleton';
	import { chatStore, isLoadingAnswerStore, liveAnswerStore, settingsStore } from '$misc/stores';
	import { countTokens } from '$misc/openai';

	export let slug: string;
	export let chatCost: ChatCost | null;

	let input = '';
	let inputCopy = '';
	let textarea: HTMLTextAreaElement;

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
	$: messageTokens = countTokens(message);
	$: maxTokensCompletion = $chatStore[slug].settings.max_tokens;
	// $: showTokenWarning = maxTokensCompletion > tokensLeft;

	async function handleSubmit() {
		track('ask');
		isLoadingAnswerStore.set(true);
		inputCopy = input;

		chatStore.addMessageToChat(slug, message);

		const eventSource = new SSE('/api/ask', {
			headers: {
				'Content-Type': 'application/json'
			},
			// send the entire message history to keep context
			payload: JSON.stringify({
				messages: $chatStore[slug].contextMessage.content // omit context if empty to save some tokens
					? [$chatStore[slug].contextMessage, ...$chatStore[slug].messages]
					: [...$chatStore[slug].messages],
				settings: $chatStore[slug].settings,
				openAiKey: $settingsStore.openAiApiKey
			})
		});
		eventSource.addEventListener('message', handleAnswer);
		eventSource.addEventListener('error', handleError);

		eventSource.stream();

		await resetTextArea();
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

				liveAnswerStore.update((store) => {
					const answer = { ...store };
					answer.content = '';
					return answer;
				});
				isLoadingAnswerStore.set(false);
			}
		} catch (err) {
			handleError(err);
		}
	}

	function handleError(event: any) {
		isLoadingAnswerStore.set(false);

		chatStore.removeLastUserMessage(slug);

		console.error(event);

		const data = JSON.parse(event.data);
		const toast: ToastSettings = {
			message: data.message || 'An error occured.',
			background: 'variant-filled-error',
			autohide: true,
			timeout: 5000
		};
		toastStore.trigger(toast);

		if (data.message.includes('API key')) {
			showModalComponent('SettingsModal', { slug });
		}

		// restore last user prompt
		input = inputCopy;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if ($isLoadingAnswerStore) {
			return;
		}

		if (event.key === 'Enter' && !event.shiftKey) {
			handleSubmit();
		}
	}

	// see https://github.com/jesseskinner/svelte-autosize
	async function resetTextArea() {
		input = '';
		await tick();
		textarea.style.height = '';
		autosize.update(textarea);
	}
</script>

<footer
	class="sticky card space-y-4 bottom-0 z-10 variant-filled-surface-700 py-2 md:py-4 md:px-8 md:rounded-xl"
>
	<div class="flex flex-col space-y-2 md:mx-auto md:w-3/4 px-2 md:px-8">
		<div class="grid">
			<form use:focusTrap={!$isLoadingAnswerStore} on:submit|preventDefault={handleSubmit}>
				<div class="grid grid-cols-[1fr_auto]">
					<!-- Input -->
					<textarea
						class="textarea"
						rows="1"
						placeholder="Enter to send, Shift+Enter for newline"
						disabled={$isLoadingAnswerStore}
						use:autosize
						on:keydown={handleKeyDown}
						bind:value={input}
						bind:this={textarea}
					/>
					<!-- Send button -->
					<button type="submit" class="btn" disabled={$isLoadingAnswerStore}>
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
								d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
							/>
						</svg>
					</button>
				</div>
			</form>
		</div>
		<!-- Tokens -->
		{#if input.length > 0}
			<button
				class="flex items-center text-xs text-slate-200 ml-4 space-x-1"
				on:click={() =>
					showModalComponent('CostModal', { chatCost, maxTokensCompletion, messageTokens })}
			>
				<span>{tokensLeft} tokens left</span>

				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
					/>
				</svg>
			</button>
		{/if}
	</div>
</footer>
