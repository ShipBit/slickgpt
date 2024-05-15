<script lang="ts">
	import { MagnifyingGlass } from '@inqling/svelte-icons/heroicon-24-outline';
	import CommandPalette, { defineActions, createStoreMethods } from 'svelte-command-palette';
	import { goto } from '$app/navigation';
	import { chatStore } from '$misc/stores';

	const paletteMethods = createStoreMethods();

	let sortedChats: [string, any][] = [];
	let chatActions: any[] = []; // svelte-command-palette is missing export type { actions } ...
	let actions: any[] = [];
	let key = 0;

	$: {
		sortedChats = Object.entries($chatStore).sort((a, b) => {
			return new Date(b[1].created).getTime() - new Date(a[1].created).getTime();
		});
		chatActions = sortedChats.map(([slug, chat]) => {
			const firstMessage =
				chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content || '' : '';
			const secondMessage =
				chat.messages.length > 1 ? chat.messages[chat.messages.length - 2].content || '' : '';

			return {
				title: chat.title,
				description: firstMessage?.substring(0, 300),
				onRun: () => {
					goto(`/${slug}`);
				},
				// TODO: maybe we can do something better here
				keywords: [firstMessage, secondMessage]
			};
		});
		actions = defineActions(chatActions);
		key++;
	}
</script>

<button
	type="button"
	class="btn btn-sm variant-ghost-secondary"
	on:click={paletteMethods.openPalette}
>
	<span><MagnifyingGlass class="w-4 h-4" /></span>
	<span class="hidden md:inline">⌘+K</span>
</button>

{#key key}
	<CommandPalette
		keyboardButtonClass="-mb-2"
		inputClass="input variant-form-material"
		resultsContainerClass="unstyled z-50 !variant-glass m-0 overflow-auto"
		resultContainerClass="unstyled variant-glass m-0 !border-b-0 w-full"
		paletteWrapperInnerClass="bg-surface-300 dark:bg-surface-800 !shadow-none"
		optionSelectedStyle={{ background: 'rgba(255, 255, 255, 0.2)' }}
		descriptionClass="!text-gray-400 !text-sm"
		overlayClass="!variant-glass"
		titleClass="!text-base"
		commands={actions}
	/>
{/key}
