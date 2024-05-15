<script lang="ts">
	import TokenCost from './TokenCost.svelte';

	export let title: string = '';
	export let variantClass = '';
	export let tokens: number = 0;
</script>

<div class="flex flex-col max-w-4xl px-5 py-2 self-center {variantClass} rounded-lg">
	<div class="flex justify-between items-center">
		<span class="font-bold mr-12">{title}:</span>

		<div class="flex items-center">
			{#if tokens}
				<TokenCost {tokens} />
			{/if}

			<slot name="actions" />
		</div>
	</div>

	<!-- Message Content -->
	<div class="flex flex-col text-sm">
		<slot />
	</div>
</div>
