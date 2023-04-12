<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, tick } from 'svelte';
	import hljs from 'highlight.js';
	import { track, type Chat as ChatModel } from '$misc/shared';
	import { generateSlug } from 'random-word-slugs';
	import snarkdown from 'snarkdown';
	import { ArrowDownOnSquare } from '@inqling/svelte-icons/heroicon-24-outline';
	import Toolbar from '$lib/Toolbar.svelte';
	import { chatStore } from '$misc/stores';
	import { goto } from '$app/navigation';
	import Chat from '$lib/Chat.svelte';
	import HintMessage from '$lib/HintMessage.svelte';

	export let data: PageData;
	const { slug, chat } = data;

	onMount(async () => {
		await highlightCode();
	});

	async function highlightCode() {
		await tick();
		hljs.highlightAll();
	}

	function handleImportChat() {
		if (!chat) return;

		const newSlug = generateSlug();
		const newChat: ChatModel = {
			...chat,
			created: new Date(),
			isImported: true
		};

		chatStore.updateChat(newSlug, newChat);

		track('importChat');
		goto(`/${newSlug}`);
	}
</script>

<Toolbar title={chat.title} on:closeChat={() => goto('/')}>
	<svelte:fragment slot="actions">
		<!-- Import -->
		<button class="btn variant-ghost-warning" on:click={handleImportChat}>
			<ArrowDownOnSquare class="w-6 h-6" />
		</button>
	</svelte:fragment>
</Toolbar>

<Chat {slug} {chat}>
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
</Chat>
