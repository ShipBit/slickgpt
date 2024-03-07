<script lang="ts">
	import { account } from '$misc/stores';

	export let tier: {
		name: string;
		pricePerMonth: number;
		pricePerYear: number;
		yearlyDiscount: number;
		description: string;
	};
	export let annual = false;
	export let highlight = false;
	export let canSubscribe = true;

	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2
	});

	$: stripePaymentLink =
		tier.name === 'Pro'
			? annual
				? 'https://buy.stripe.com/test_cN203YeYgb37cNy7sy'
				: 'https://buy.stripe.com/test_8wM8AucQ8gnrcNy149'
			: '';
</script>

<div class="px-6 flex flex-col justify-end">
	<div class="grow pb-4 mb-4 border-0 border-slate-800">
		<div
			class="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-purple-200 pb-0.5 font-bold text-lg"
		>
			{tier.name}
		</div>
		<div class="mb-1">
			<span class="text-3xl font-bold text-slate-50">
				{annual ? formatter.format(tier.pricePerYear) : formatter.format(tier.pricePerMonth)}
			</span>
			{#if tier.pricePerMonth > 0}
				<span class="text-sm text-slate-300 font-medium">/ {annual ? 'year' : 'month'}</span>
			{/if}
			{#if annual && tier.yearlyDiscount > 0}
				<span class="text-teal-500 font-bold">(-{tier.yearlyDiscount}%)</span>
			{/if}
		</div>
		<div class="text-slate-300">
			{@html tier.description}
		</div>
	</div>
	{#if canSubscribe && $account}
		<div class="pb-4 border-0 border-slate-800">
			<a
				href={`${stripePaymentLink}?client_reference_id=${$account.localAccountId}&prefilled_email=${encodeURI($account.username)}`}
				class="btn text-slate-900 w-full transition duration-150 ease-in-out group"
				class:text-white={highlight}
				class:bg-white={!highlight}
				class:hover:bg-slate-200={!highlight}
				class:bg-purple-500={highlight}
				class:hover:bg-purple-600={highlight}
			>
				Subscribe
			</a>
		</div>
	{/if}
</div>
