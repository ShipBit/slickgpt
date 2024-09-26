<script lang="ts">
	import { PUBLIC_PAYPRO_PRO_YEARLY, PUBLIC_PAYPRO_PRO_MONTHLY, PUBLIC_PAYPRO_CHECKOUT_URL, PUBLIC_PAYPRO_CHECKOUT_PAGE_TEMPLATE_ID, PUBLIC_PAYPRO_USE_TEST_MODE, PUBLIC_PAYPRO_SECRET_KEY } from '$env/static/public';
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

	function getProductId(annual: boolean) {
		let productId = '';

		productId =
			tier.name === 'Pro'
				? annual
					? PUBLIC_PAYPRO_PRO_YEARLY
					: PUBLIC_PAYPRO_PRO_MONTHLY
				: '';

		return productId;
	}

	function checkout() {
		const currentAccount = $account;
		const email = currentAccount?.idTokenClaims ? currentAccount?.idTokenClaims['email'] : '';
		const productId = getProductId(annual);

		let url = `${PUBLIC_PAYPRO_CHECKOUT_URL}?billing-email=${email}&products[1][id]=${productId}&page-template=${PUBLIC_PAYPRO_CHECKOUT_PAGE_TEMPLATE_ID}&x-azure-user-id=${currentAccount?.localAccountId || ''}`;

		if (PUBLIC_PAYPRO_USE_TEST_MODE === 'true') {
			url += `&use-test-mode=${PUBLIC_PAYPRO_USE_TEST_MODE}&secret-key=${PUBLIC_PAYPRO_SECRET_KEY}`;
		}

		window.open(url, '_self')?.focus();
	}
</script>

<div class="px-6 flex flex-col justify-end">
	<div class="grow pb-4 mb-4 border-0 border-slate-800">
		<div
			class="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-purple-200 pb-0.5 font-bold text-lg"
		>
			{tier.name}
		</div>
		<div class="mb-1">
			<span class="text-3xl font-bold">
				{annual ? formatter.format(tier.pricePerYear) : formatter.format(tier.pricePerMonth)}
			</span>
			{#if tier.pricePerMonth > 0}
				<span class="text-sm font-medium">/ {annual ? 'year' : 'month'}</span>
			{/if}
			{#if annual && tier.yearlyDiscount > 0}
				<span class="text-teal-500 font-bold">(-{tier.yearlyDiscount}%)</span>
			{/if}
		</div>
		<div class="text-slate-700 dark:text-slate-300">
			{@html tier.description}
		</div>
	</div>
	{#if canSubscribe && $account}
		<div class="pb-4 border-0 border-slate-800">
			<button
				type="button"
				on:click={checkout}
				class="btn text-slate-900 w-full transition duration-150 ease-in-out group"
				class:text-white={highlight}
				class:bg-white={!highlight}
				class:hover:bg-slate-200={!highlight}
				class:bg-purple-500={highlight}
				class:hover:bg-purple-600={highlight}
			>
				Subscribe
			</button>
		</div>
	{/if}
</div>
