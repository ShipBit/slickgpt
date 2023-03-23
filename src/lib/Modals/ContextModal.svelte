<script lang="ts">
	import { Accordion, AccordionItem, modalStore } from '@skeletonlabs/skeleton';
	import { chatStore } from '$misc/stores';
	import { track } from '$misc/shared';

	let slug: string = $modalStore[0].meta?.slug || '';
	let chat = $chatStore[slug];

	let context = chat.contextMessage.content || '';

	let useStopSequence = !!chat.settings.stop?.length;

	let stopSequence1 =
		Array.isArray(chat.settings.stop) && chat.settings.stop.length > 0
			? chat.settings.stop[0]
			: typeof chat.settings.stop === 'string'
			? chat.settings.stop
			: '';
	let stopSequence2 =
		Array.isArray(chat.settings.stop) && chat.settings.stop.length > 1 ? chat.settings.stop[1] : '';
	let stopSequence3 =
		Array.isArray(chat.settings.stop) && chat.settings.stop.length > 2 ? chat.settings.stop[2] : '';
	let stopSequence4 =
		Array.isArray(chat.settings.stop) && chat.settings.stop.length > 3 ? chat.settings.stop[3] : '';

	let stopSequence: string | string[];

	$: {
		const stopSequenceArray = [stopSequence1, stopSequence2, stopSequence3, stopSequence4].filter(
			(s) => s?.length > 0
		);

		if (stopSequenceArray.length === 0) {
			stopSequence = '';
		} else if (stopSequenceArray.length === 1) {
			stopSequence = stopSequenceArray[0];
		} else {
			stopSequence = [...stopSequenceArray];
		}
	}

	function handleSave() {
		// we already bound the context message, so just trigger the store update
		chatStore.update((store) => {
			const chats = { ...store };
			chats[slug].contextMessage.content = context;
			chats[slug].settings.stop = useStopSequence ? stopSequence : '';
			return chats;
		});
		track('editChatContext');
		modalStore.close();
	}

	function handleClear() {
		context = '';
		stopSequence1 = '';
		stopSequence2 = '';
		stopSequence3 = '';
		stopSequence4 = '';
	}

	function handleClose() {
		modalStore.close();
	}
</script>

<div class="card variant-filled-surface-700 p-8 max-w-xl md:min-w-[500px]">
	<h3>Context</h3>
	<div class="flex-row space-y-6">
		<Accordion>
			<AccordionItem>
				<svelte:fragment slot="summary">What is context?</svelte:fragment>
				<svelte:fragment slot="content">
					<p class="!text-xs">
						You can give the AI an initial context for your chat which greatly changes the way it
						will behave during the conversation. You can edit this later and it will be passed with
						your next message.
					</p>
				</svelte:fragment>
			</AccordionItem>

			<AccordionItem>
				<svelte:fragment slot="summary">Context examples</svelte:fragment>
				<svelte:fragment slot="content">
					<pre>
- You are a helpful, pattern-following assistant that translates corporate jargon into plain English.
- You are a kindergarden teacher and I'm a child. Explain everything to me like I'm five years old. At the end of each explanation, you ask a question to check for understanding.
- You are a an employee in a video store and I'm the customer. I'll ask you for movie suggestions based on genres and you always answer with a simple list of 5 recommended movies based on their popularity.
                </pre>
				</svelte:fragment>
			</AccordionItem>
		</Accordion>

		<form class="mt-4">
			<label class="label">
				<span>Context</span>
				<textarea
					class="textarea"
					rows="3"
					bind:value={context}
					placeholder="You are a helpful assistant."
				/>
			</label>
		</form>

		<div class="space-y-2">
			<label class="flex items-center space-x-2">
				<input class="checkbox" type="checkbox" bind:checked={useStopSequence} />
				<p>Add stop sequence</p>
			</label>
		</div>

		{#if useStopSequence}
			<Accordion>
				<AccordionItem>
					<svelte:fragment slot="summary">What is a stop sequence?</svelte:fragment>
					<svelte:fragment slot="content">
						<p class="!text-xs">
							ChatGPT will generate text until it finds one of the (max. 4) strings specified as
							stop sequence, and then stops generating further text. This can be useful for
							controlling the length of the generated text or for specifying the content that should
							be included as part of the final output. The answer will never contain the stop
							sequence itself.
						</p>
					</svelte:fragment>
				</AccordionItem>

				<AccordionItem>
					<svelte:fragment slot="summary">Stop sequence examples</svelte:fragment>
					<svelte:fragment slot="content">
						<pre class="code hljs">
					<!-- <code class="hljs"> -->
<span class="hljs-keyword">.</span> Break after the first sentence of the answer
<span class="hljs-keyword">\n</span> Break after the first line of the answer
<span class="hljs-keyword">6.</span
							> If asked for a list, ChatGPT will just return 5 items. Remember, the answer will not contain the stop sequence itself, so it breaks before the sixth entry.
<span class="hljs-keyword">Human:</span
							> Given the context "The following is a discussion between a human and a fox." and the question: "Human: Can I pet you?", ChatGPT will answer with "Fox: [answer]"

					<!-- </code> -->
                </pre>
					</svelte:fragment>
				</AccordionItem>
			</Accordion>

			<form class="mt-4">
				<label class="label">
					<span>Stop Sequence 1/4</span>
					<input class="input" type="text" bind:value={stopSequence1} placeholder={`Example: .`} />
				</label>
				{#if stopSequence1.length > 0}
					<label class="label">
						<span>Stop Sequence 2/4</span>
						<input
							class="input"
							type="text"
							bind:value={stopSequence2}
							placeholder={`Example: 6.`}
						/>
					</label>
				{/if}

				{#if stopSequence2.length > 0}
					<label class="label">
						<span>Stop Sequence 3/4</span>
						<input
							class="input"
							type="text"
							bind:value={stopSequence3}
							placeholder={`Example: Human:`}
						/>
					</label>
				{/if}
				{#if stopSequence3.length > 0}
					<label class="label">
						<span>Stop Sequence 4/4</span>
						<input class="input" type="text" bind:value={stopSequence4} placeholder="Example: \n" />
					</label>
				{/if}
			</form>
		{/if}

		<!-- Buttons -->
		<div class="flex justify-between">
			<div class="flex space-x-2">
				<button class="btn btn-sm" on:click={handleClose}>Close</button>
				<button class="btn btn-sm" on:click={handleClear}>Clear</button>
			</div>
			<button class="btn variant-filled-primary" on:click={handleSave}>Save</button>
		</div>
	</div>
</div>
