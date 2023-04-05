<script lang="ts">
	import { modalStore, ProgressRadial } from '@skeletonlabs/skeleton';
	import { confettiAction } from 'svelte-legos';
	import { chatStore, settingsStore } from '$misc/stores';
	import { canSuggestTitle, suggestChatTitle } from '$misc/shared';

	let slug = $modalStore[0].meta?.slug || '';
	let isLoading = false;

	$: showAiSuggestOptions = $settingsStore.openAiApiKey && canSuggestTitle($chatStore[slug]);

	async function handleSuggestTitle() {
		if (!$settingsStore.openAiApiKey) {
			return;
		}
		isLoading = true;
		const title = await suggestChatTitle($chatStore[slug], $settingsStore.openAiApiKey);
		chatStore.updateChat(slug, { title });
		isLoading = false;
	}

	function handleSave() {
		if ($modalStore[0].response) {
			$modalStore[0].response(true);
		}
		modalStore.close();
	}
</script>

<div class="card variant-filled-surface-700 p-8">
	<h3 class="mb-4">Name your chat</h3>

	<form class="flex flex-col space-y-4">
		<label class="label">
			<span class="inline-block w-40">Set chat title</span>
			<input type="text" class="input" bind:value={$chatStore[slug].title} />
		</label>

		{#if showAiSuggestOptions}
			<span class="self-center">OR:</span>

			<button
				class="btn variant variant-filled-secondary"
				disabled={isLoading}
				on:click={handleSuggestTitle}
			>
				{#if !isLoading}
					Let ChatGPT suggest a new title
				{:else}
					<ProgressRadial
						class="w-6"
						stroke={120}
						meter="stroke-tertiary-500"
						track="stroke-tertiary-500/30"
					/>
				{/if}
			</button>

			<span class="text-xs text-slate-400">
				This action will consume a few tokens. The cheap gpt-3.5-turbo model will be used.
			</span>
		{/if}

		<div class="flex flex-col md:flex-row space-y-4 md:space-y-0 justify-between items-center">
			{#if showAiSuggestOptions}
				<label class="flex items-center space-x-2">
					<input
						class="checkbox"
						type="checkbox"
						bind:checked={$settingsStore.useTitleSuggestions}
						use:confettiAction={{ type: 'school-pride' }}
					/>
					<p>Always set titles automagically</p>
				</label>
			{/if}

			<button class="btn variant-filled-primary max-w-[100px] self-end" on:click={handleSave}>
				Save
			</button>
		</div>
	</form>
</div>
