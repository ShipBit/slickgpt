<script lang="ts">
	export let features: {
		[category: string]: Array<{
			name: string;
			free: boolean | string;
			pro: boolean | string;
			bold?: boolean;
		}>;
	};
</script>

{#each Object.entries(features) as [category, subfeatures]}
	<div class="px-6 flex flex-col justify-end">
		<div class="py-2 text-slate-50 font-medium mt-4">{category}</div>
	</div>
	<div class="px-6 flex flex-col justify-end">
		<div class="py-2 text-slate-50 font-medium mt-4 md:hidden">{category}</div>
	</div>
	<div class="px-6 flex flex-col justify-end">
		<div class="py-2 text-slate-50 font-medium mt-4 md:hidden">{category}</div>
	</div>

	{#each subfeatures as feature}
		<div class="px-6 flex flex-col justify-end">
			<div class="py-2 text-slate-400 border-b border-slate-700" class:font-bold={feature.bold}>
				{feature.name}
			</div>
		</div>
		<div class="px-6 flex flex-col justify-end">
			<div class="flex items-center h-full border-b border-slate-700 py-2 text-slate-400">
				{#if feature.free === true}
					<svg
						class="shrink-0 fill-purple-500 mr-3"
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="9"
					>
						<path
							d="M10.28.28 3.989 6.575 1.695 4.28A1 1 0 0 0 .28 5.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28.28Z"
						/>
					</svg>
				{:else if feature.free !== false}
					<span>{feature.free}</span>
				{/if}
				<span><span class="md:hidden">{feature.name}</span></span>
			</div>
		</div>
		<div class="px-6 flex flex-col justify-end">
			<div class="flex items-center h-full border-b border-slate-700 py-2 text-slate-400">
				{#if feature.pro === true}
					<!-- content here -->
					<svg
						class="shrink-0 fill-purple-500 mr-3"
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="9"
					>
						<path
							d="M10.28.28 3.989 6.575 1.695 4.28A1 1 0 0 0 .28 5.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28.28Z"
						/>
					</svg>
				{:else if feature.pro !== false}
					<span>{feature.pro}</span>
				{/if}
				<span><span class="md:hidden">{feature.name}</span></span>
			</div>
		</div>
	{/each}
{/each}
