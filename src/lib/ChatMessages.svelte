<script lang="ts">
	import { Stepper, Step } from '@skeletonlabs/skeleton';
	import type { ChatMessage as ChatMessageModel } from '$misc/shared';
	import ChatMessage from './ChatMessage.svelte';

	export let slug: string;
	export let siblings: ChatMessageModel[];

	$: displayedSiblings = siblings.length === 1 ? siblings : siblings.filter((m) => m.isSelected);

	function getActiveIndex(messages: ChatMessageModel[]) {
		let result = 0;
		if (messages.length > 1) {
			result = messages.findIndex((message) => message.isSelected);
		}

		return result;
	}
</script>

{#if displayedSiblings.length === 1}
	<ChatMessage {slug} message={displayedSiblings[0]} renderChildren />
{:else}
	<Stepper start={getActiveIndex(siblings)}>
		{#each siblings as sibling}
			<Step>
				<ChatMessage {slug} message={sibling} />
			</Step>
		{/each}
	</Stepper>
{/if}
