<script lang="ts">
	import { popup, type PopupSettings } from '@skeletonlabs/skeleton';

	export let tokens: number;
	export let tooltipText = 'Approximate token cost';

	let tokenTooltip: PopupSettings = {
		event: 'hover',
		target: 'tokenTooltip',
		placement: 'top'
	};
</script>

<div class="flex items-center text-xs text-slate-500" use:popup={tokenTooltip}>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="w-4 h-4"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
		/>
	</svg>

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
