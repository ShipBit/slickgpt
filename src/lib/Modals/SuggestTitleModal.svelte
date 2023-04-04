<script lang="ts">
	import { modalStore } from '@skeletonlabs/skeleton';
	import { chatStore, settingsStore } from '$misc/stores';
	import { canSuggestTitle, suggestChatTitle } from '$misc/shared';

	let slug = $modalStore[0].meta?.slug || '';
	$: showAiSuggestOptions = $settingsStore.openAiApiKey && canSuggestTitle($chatStore[slug]);

	async function handleSuggestTitle() {
		if (!$settingsStore.openAiApiKey) {
			return;
		}

		$chatStore[slug].title = await suggestChatTitle($chatStore[slug], $settingsStore.openAiApiKey);
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

			<button class="btn variant variant-filled-secondary" on:click={handleSuggestTitle}>
				Let ChatGPT suggest a title
			</button>

			<span class="text-xs text-slate-400">
				This action will consume a few tokens. The cheap gpt-3.5-turbo model will be used.
			</span>
		{/if}

		<div class="flex flex-col md:flex-row space-y-4 justify-between items-center">
			{#if showAiSuggestOptions}
				<label class="flex items-center space-x-2">
					<input
						class="checkbox"
						type="checkbox"
						bind:checked={$settingsStore.useTitleSuggestions}
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
