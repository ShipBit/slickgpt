<script lang="ts">
	import type { PageData } from './$types';
	import type { Chat } from '$misc/shared';
	import { generateSlug } from 'random-word-slugs';
	import snarkdown from 'snarkdown';
	import Toolbar from '$lib/Toolbar.svelte';
	import { chatStore } from '$misc/stores';
	import { goto } from '$app/navigation';
	import ChatMessages from '$lib/ChatMessages.svelte';
	import HintMessage from '$lib/HintMessage.svelte';

	export let data: PageData;
	const { chat } = data;

	function handleImportChat() {
		if (!chat) return;

		const newSlug = generateSlug();
		const newChat: Chat = {
			...chat,
			created: new Date(),
			isImported: true
		};

		chatStore.updateChat(newSlug, newChat);

		window.plausible('importChat');
		goto(`/${newSlug}`);
	}
</script>

<Toolbar title={chat.title}>
	<svelte:fragment slot="actions">
		<!-- Import -->
		<button class="btn variant-ghost-warning" on:click={handleImportChat}>
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
					d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
				/>
			</svg>
		</button>
	</svelte:fragment>
</Toolbar>

<ChatMessages {chat}>
	<svelte:fragment slot="additional-content-top">
		{#if chat.contextMessage.content.length > 0}
			<HintMessage title="Chat context" variantClass="variant-ghost-tertiary">
				<p class="!mb-4">{@html snarkdown(chat.contextMessage.content)}</p>
			</HintMessage>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="additional-content-bottom">
		<HintMessage title="Somebody shared this chat with you" variantClass="variant-ghost-warning">
			<p>
				If you want, you can continue this conversation with ChatGPT. To do so, use the <strong
					>Import</strong
				>
				button in the toolbar. This will create a local instance of this chat just for you that you can
				edit and share as you wish.
			</p>
		</HintMessage>
	</svelte:fragment>
</ChatMessages>
