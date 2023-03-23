<script lang="ts">
	import { Accordion, AccordionItem, ConicGradient, modalStore } from '@skeletonlabs/skeleton';
	import type { ConicStop } from '@skeletonlabs/skeleton';
	import type { ChatCost } from '$misc/shared';

	export let cost: ChatCost = $modalStore[0].meta.chatCost;
	export let messageTokens: number = $modalStore[0].meta.messageTokens;
	export let maxTokensCompletion: number = $modalStore[0].meta.maxTokensCompletion;

	const { tokensPrompt, tokensCompletion, maxTokensForModel } = cost;
	const maxCompletionLeft = Math.min(
		maxTokensForModel - tokensPrompt - tokensCompletion - messageTokens,
		maxTokensCompletion
	);

	const messageTokensPercent = Math.round((messageTokens / maxTokensForModel) * 100);
	const tokensCompletionPercent = Math.round((tokensCompletion / maxTokensForModel) * 100);
	const tokensPromptPercent = Math.round((tokensPrompt / maxTokensForModel) * 100);
	const maxCompletionLeftPercent = Math.round((maxCompletionLeft / maxTokensForModel) * 100);

	const conicStops: ConicStop[] = [
		{
			label: `Previous prompts (${tokensPrompt})`,
			color: 'rgb(var(--color-surface-700))',
			start: 0,
			end: tokensPromptPercent
		},
		{
			label: `Previous completions (${tokensCompletion})`,
			color: 'rgb(var(--color-surface-500))',
			start: tokensPromptPercent,
			end: tokensPromptPercent + tokensCompletionPercent
		},
		{
			label: `Next prompt (${messageTokens})`,
			color: 'rgb(var(--color-primary-500))',
			start: tokensPromptPercent + tokensCompletionPercent,
			end: tokensPromptPercent + tokensCompletionPercent + messageTokensPercent
		},
		{
			label: `Next completion (max. ${maxCompletionLeft})`,
			color: 'rgb(var(--color-success-500))',
			start: tokensPromptPercent + tokensCompletionPercent + messageTokensPercent,
			end: Math.max(maxCompletionLeftPercent, 100)
		}
	];

	function handleClose() {
		modalStore.close();
	}
</script>

<div
	class="card flex flex-col space-y-4 items-center variant-filled-surface-700 p-8 max-w-xl md:min-w-[500px]"
>
	<Accordion>
		<AccordionItem>
			<svelte:fragment slot="summary">How are tokens left calculated?</svelte:fragment>
			<svelte:fragment slot="content">
				<p class="!text-xs">
					A chat with this model is limited to a total of <strong>{cost.maxTokensForModel}</strong> tokens.
					These are split between your prompts (including context) and the completions of the AI.
				</p>
				<p class="!text-xs">
					The <strong>max_token</strong> parameter in your Chat Settings tells ChatGPT how long its next
					completion can be. This is a worst case value for long answers.
				</p>
				<p class="!text-xs">
					We'll subtract all previous prompts and completions and your current prompt from the max.
					amount of tokens.
					<!-- If your max_token setting exceeds the remaining tokens, we'll fix it for
					you so that it fills out the rest. -->
				</p>
			</svelte:fragment>
		</AccordionItem>
		<AccordionItem>
			<svelte:fragment slot="summary">How can I save tokens?</svelte:fragment>
			<svelte:fragment slot="content">
				<!-- <p class="!text-xs">
					Whenever you send a prompt, we'll send the entire message history (including a context
					message) to ChatGPT so that it can keep a state of the conversation.
				</p> -->
				<p class="!text-xs">
					To save tokens, shorten your prompts or instruct ChatGPT to give shorter answers (e.g.
					using Context & Stop Sequences). Lower the max_tokens parameter in the Chat Settings. You
					can also create a new chat and try to omit noisy messages that are not relevant for
					ChatGPT to maintain the state of the conversation.
				</p>
			</svelte:fragment>
		</AccordionItem>
	</Accordion>

	<ConicGradient stops={conicStops} legend>
		<strong>Token distribution (max. {maxTokensForModel})</strong>
	</ConicGradient>

	<a rel="onreferrer" href="https://platform.openai.com/docs/guides/chat/introduction"
		>Learn about token calculation</a
	>

	<button class="btn self-end variant-filled-primary" on:click={handleClose}>Close</button>
</div>
