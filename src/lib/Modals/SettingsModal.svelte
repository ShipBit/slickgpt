<script lang="ts">
	import { Accordion, AccordionItem, modalStore } from '@skeletonlabs/skeleton';
	import { chatStore, settingsStore } from '$misc/stores';
	import { models, OpenAiModel } from '$misc/openai';
	import { track } from '$misc/shared';

	let slug = $modalStore[0].meta?.slug || '';
	let title = $chatStore[slug].title;
	let settings = $chatStore[slug].settings;
	let savedSettings = { ...settings };

	function handleChangeSettings() {
		chatStore.updateChat(slug, { title, settings });

		savedSettings = { ...settings };
		track('saveSettings');
		modalStore.close();
	}

	function handleResetSettings() {
		settings = { ...savedSettings };
		title = $chatStore[slug].title;
	}

	function handleCloseSettings() {
		handleResetSettings();
		modalStore.close();
	}

	function clamp(value: number, min: number, max: number) {
		return Math.max(min, Math.min(value, max));
	}

	let maxTokensForModel = 0;

	$: {
		maxTokensForModel = models[$chatStore[slug].settings.model].maxTokens;
		settings.max_tokens = clamp(settings.max_tokens, 0, maxTokensForModel);
	}
</script>

<div class="card variant-filled-surface-700 p-8">
	<form>
		<h3 class="mb-4">Settings</h3>
		<div class="flex-row space-y-6">
			<!-- API key -->
			<label class="label">
				<div class="flex justify-between space-x-12	">
					<span>OpenAI API key</span>
					<a target="_blank" rel="noreferrer" href="https://platform.openai.com/account/api-keys">
						Get yours
					</a>
				</div>
				<input
					required
					class="input"
					class:input-error={!$settingsStore.openAiApiKey}
					type="text"
					bind:value={$settingsStore.openAiApiKey}
				/>
			</label>

			<!-- Chat Title -->
			<label class="label">
				<span>Chat Title</span>
				<input class="input" type="text" bind:value={title} />
			</label>

			<!-- Model -->
			{#if $settingsStore.openAiApiKey}
				<div class="flex flex-col space-y-2">
					<label class="label">
						<div class="flex justify-between space-x-12	">
							<span>Model</span>
							<a
								target="_blank"
								rel="noreferrer"
								href="https://platform.openai.com/docs/api-reference/completions/create"
							>
								See docs
							</a>
						</div>
						<select class="select" bind:value={settings.model}>
							{#each Object.values(OpenAiModel) as model}
								<option value={model}>{model}</option>
							{/each}
						</select>
					</label>
					<!-- Set as default -->
					{#if $settingsStore.defaultModel !== settings.model}
						<button
							class="btn btn-sm variant-ghost-secondary self-start"
							on:click={() => ($settingsStore.defaultModel = settings.model)}
						>
							Use as default
						</button>
					{/if}
				</div>

				<!-- Advanced Settings -->
				<Accordion>
					<AccordionItem>
						<svelte:fragment slot="summary">Advanced</svelte:fragment>
						<svelte:fragment slot="content">
							<!-- Max Tokens -->
							<label class="label">
								<span class="inline-block w-40">Max Tokens: {settings.max_tokens}</span>
								<input
									type="range"
									min={8}
									step={8}
									max={maxTokensForModel}
									bind:value={settings.max_tokens}
								/>
							</label>

							<!-- Temperature -->
							<label class="label">
								<span>Temperature: {settings.temperature}</span>
								<input type="range" max={2} step="0.1" bind:value={settings.temperature} />
							</label>

							<!-- Top p -->
							<label class="label">
								<span>Top p: {settings.top_p}</span>
								<input type="range" max={1} step="0.1" bind:value={settings.top_p} />
							</label>
						</svelte:fragment>
					</AccordionItem>
				</Accordion>
			{/if}

			<!-- Buttons -->
			<div class="flex justify-between">
				<div class="flex space-x-2">
					<button class="btn btn-sm" on:click={handleCloseSettings}>Close</button>
					<button class="btn btn-sm" on:click={handleResetSettings}>Reset</button>
				</div>
				<button
					class="btn variant-filled-primary"
					disabled={!$settingsStore.openAiApiKey}
					on:click={handleChangeSettings}>Save</button
				>
			</div>
		</div>
	</form>
</div>
