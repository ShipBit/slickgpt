<script lang="ts">
	import { createStoreMethods } from 'svelte-command-palette';
	import CommandPalette, { defineActions } from 'svelte-command-palette';
	import { chatStore } from './../misc/stores';
	import type { action } from 'svelte-command-palette/types';
	import { goto } from '$app/navigation';
	import { MagnifyingGlass } from '@inqling/svelte-icons/heroicon-24-outline';

	const paletteMethods = createStoreMethods();

	let sortedChats: [string, any][] = [];
	let chatActions: action[] = [];
	let actions: action[] = [];
	let key = 0;

	$: {
		sortedChats = Object.entries($chatStore).sort((a, b) => {
			return new Date(b[1].created).getTime() - new Date(a[1].created).getTime();
		});
		chatActions = sortedChats.map(([slug, chat]) => {
			return {
				title: chat.title,
				description:
					chat.messages.length > 0
						? chat.messages[chat.messages.length - 1].content?.substring(0, 300) || ''
						: '',
				onRun: () => {
					goto(`/${slug}`);
				},
				// Keywords are full first and second message, but maybe we can do something better here
				keywords: [
					chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content || '' : '',
					chat.messages.length > 1 ? chat.messages[chat.messages.length - 2].content || '' : ''
				]
			};
		});
		console.log(chatActions);
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
	<span>⌘+K</span>
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
