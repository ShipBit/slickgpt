<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		RadioGroup,
		RadioItem,
		getModalStore
	} from '@skeletonlabs/skeleton';
	import { chatStore, settingsStore, isPro } from '$misc/stores';
	import {
		AiModel,
		AiProvider,
		getDefaultModelForProvider,
		getProviderForModel,
		models,
		providers
	} from '$misc/openai';
	import { track } from '$misc/shared';

	const modalStore = getModalStore();

	let slug: string = $modalStore[0].meta?.slug || '';
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

	function maskString(input: string | undefined, maxTotalLength = 20, visibleChars = 4) {
		if (!input || input.length < maxTotalLength) {
			return input;
		}

		const maskedLength = maxTotalLength - visibleChars;
		const visiblePart = input.slice(-visibleChars);
		const maskedPart = Array(maskedLength).fill('x').join('');

		return maskedPart + visiblePart;
	}

	let maxTokensForModel = 0;
	let editApiKey = false;
	let currentProvider: AiProvider = getProviderForModel(settings.model);

	$: {
		maxTokensForModel = models[$chatStore[slug].settings.model].maxTokens; //Now: max reply length
		settings.max_tokens = clamp(settings.max_tokens, 0, maxTokensForModel);
	}
</script>

<div class="card variant-filled-surface-700 p-8">
	<form>
		<h3 class="h3 mb-4">Settings</h3>
		<div class="flex-row space-y-6">
			<!-- Provider -->
			<RadioGroup>
				{#each providers as provider}
					<RadioItem
						bind:group={currentProvider}
						name={provider}
						value={provider}
						on:change={(e) => (settings.model = getDefaultModelForProvider(e.target?.value))}
					>
						{provider}
					</RadioItem>
				{/each}
			</RadioGroup>
			{#if !$isPro}
				<!-- API keys -->
				{#if currentProvider === AiProvider.Mistral && (!$settingsStore.mistralApiKey || editApiKey)}
					<label class="label">
						<div class="flex justify-between space-x-12">
							<span>Mistral API key</span>
							<a
								target="_blank"
								rel="noreferrer"
								href="https://console.mistral.ai/api-keys/"
								class="anchor"
							>
								Get yours
							</a>
						</div>
						<input
							required
							class="input"
							class:input-error={!$settingsStore.mistralApiKey}
							type="text"
							bind:value={$settingsStore.mistralApiKey}
							on:blur={() => (editApiKey = false)}
						/>
					</label>
				{:else if currentProvider === AiProvider.Meta && (!$settingsStore.metaApiKey || editApiKey)}
					<label class="label">
						<div class="flex justify-between space-x-12">
							<span>Meta API key</span>
							<a
								target="_blank"
								rel="noreferrer"
								href="https://console.groq.com/keys"
								class="anchor"
							>
								Get yours (Groq)
							</a>
						</div>
						<input
							required
							class="input"
							class:input-error={!$settingsStore.metaApiKey}
							type="text"
							bind:value={$settingsStore.metaApiKey}
							on:blur={() => (editApiKey = false)}
						/>
					</label>
				{:else if currentProvider === AiProvider.OpenAi && (!$settingsStore.openAiApiKey || editApiKey)}
					<label class="label">
						<div class="flex justify-between space-x-12">
							<span>OpenAI API key</span>
							<a
								target="_blank"
								rel="noreferrer"
								href="https://platform.openai.com/account/api-keys"
								class="anchor"
							>
								Get yours
							</a>
						</div>
						<input
							required
							class="input"
							class:input-error={!$settingsStore.openAiApiKey}
							type="text"
							bind:value={$settingsStore.openAiApiKey}
							on:blur={() => (editApiKey = false)}
						/>
					</label>
				{:else}
					<div class="flex flex-col space-x-2">
						<span class="label"
							>{currentProvider === AiProvider.Mistral
								? 'Mistral'
								: currentProvider === AiProvider.Meta
									? 'Meta'
									: 'OpenAI'} API key</span
						>

						<div class="flex justify-between items-center space-x-4">
							<span>
								{#if currentProvider === AiProvider.Mistral}
									{maskString($settingsStore.mistralApiKey)}
								{:else if currentProvider === AiProvider.Meta}
									{maskString($settingsStore.metaApiKey)}
								{:else}
									{maskString($settingsStore.openAiApiKey)}
								{/if}
							</span>

							<button
								class="btn btn-sm variant-ghost-secondary"
								on:click={() => (editApiKey = true)}
							>
								Edit
							</button>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Model -->
			{#if $isPro || (currentProvider === AiProvider.OpenAi && $settingsStore.openAiApiKey) || (currentProvider === AiProvider.Meta && $settingsStore.metaApiKey) || (currentProvider === AiProvider.Mistral && $settingsStore.mistralApiKey)}
				<div class="flex flex-col space-y-2">
					<label class="label">
						<div class="flex justify-between space-x-12">
							<span>Model</span>
						</div>
						<select class="select" bind:value={settings.model}>
							{#each Object.entries(models).filter((entry) => entry[1].provider === currentProvider) as [name, model]}
								{#if !model.hidden}
									<option value={name}>
										{$isPro ? model.middlewareDeploymentName || name : name}
									</option>
								{/if}
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
				<button class="btn variant-filled-primary" on:click={handleChangeSettings}>Save</button>
			</div>
		</div>
	</form>
</div>
