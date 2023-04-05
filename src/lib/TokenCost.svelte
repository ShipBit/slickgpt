<script lang="ts">
	import { popup, type PopupSettings } from '@skeletonlabs/skeleton';
	import { CircleStack } from '@inqling/svelte-icons/heroicon-24-solid';

	export let tokens: number;
	export let tooltipText = 'Approximate token cost';

	let tokenTooltip: PopupSettings = {
		event: 'hover',
		target: 'tokenTooltip',
		placement: 'top'
	};
</script>

<div class="flex items-center text-xs text-slate-500" use:popup={tokenTooltip}>
	<CircleStack class="w-4 h-4" />
	<span>{tokens}</span>
</div>

<!-- Popup / Tooltip -->
<div
	class="text-xs text-center card variant-filled p-2 whitespace-nowrap shadow-xl"
	data-popup="tokenTooltip"
>
	{tooltipText}
	<div class="arrow variant-filled" />
</div>
