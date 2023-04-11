<script lang="ts">
	import type { ChatMessage as ChatMessageModel } from '$misc/shared';
	import { Stepper, Step } from '@skeletonlabs/skeleton';
	import { chatStore } from '$misc/stores';
	import ChatMessage from './ChatMessage.svelte';

	export let slug: string;
	export let siblings: ChatMessageModel[];

	function getActiveIndex(messages: ChatMessageModel[]) {
		let result = 0;
		if (messages.length > 1) {
			result = messages.findIndex((message) => message.isSelected);
		}

		// fallback to first item if none is selected (shouldn't happen)
		return Math.max(result, 0);
	}

	function handleStep(
		e: CustomEvent<{ step: number; state: { current: number; total: number } }>
	): void {
		const id = siblings[e.detail.state.current].id!;
		chatStore.selectSibling(id, siblings);
	}
</script>

{#if siblings.length === 1}
	<ChatMessage {slug} message={siblings[0]} renderChildren />
{:else}
	<Stepper
		regionContent="px-2 md:px-6"
		stepTerm="Message"
		buttonBackLabel="← Previous"
		buttonCompleteLabel="Next →"
		buttonComplete="hidden"
		start={getActiveIndex(siblings)}
		on:step={handleStep}
	>
		{#each siblings as sibling, index}
			<Step locked={index === siblings.length - 1}>
				<svelte:fragment slot="header">
					<!-- hide header and remove margins	 -->
					<span class="hidden" />
				</svelte:fragment>
				<ChatMessage {slug} message={sibling} renderChildren={sibling.isSelected} />
			</Step>
		{/each}
	</Stepper>
{/if}
