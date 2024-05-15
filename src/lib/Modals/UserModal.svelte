<script lang="ts">
	import TierFeatures from '$lib/TierFeatures.svelte';
	import TierHeader from '$lib/TierHeader.svelte';
	import { AuthService } from '$misc/authService';
	import { account, autoLogin } from '$misc/stores';
	import { Key, User } from '@inqling/svelte-icons/heroicon-24-outline';
	import { SlideToggle, getModalStore } from '@skeletonlabs/skeleton';

	const modalStore = getModalStore();

	let annual = false;

	const headers = {
		free: {
			name: 'Free',
			pricePerMonth: 0,
			pricePerYear: 0,
			yearlyDiscount: 0,
			description: 'Bring your own API keys, pay the providers directly based on your usage.'
		},
		pro: {
			name: 'Pro',
			pricePerMonth: 5.99,
			pricePerYear: 59.99,
			yearlyDiscount: 17,
			description: "No API key, no hassle. You pay us, we'll do the rest your you."
		}
	};

	const features = {
		Features: [
			{
				name: "Everything (because we're nice people)",
				free: true,
				pro: true
			}
		],
		Models: [
			{
				name: 'gpt-3.5',
				free: 'your OpenAI API key',
				pro: true
			},
			{
				name: 'gpt-4-turbo',
				free: 'your OpenAI API key',
				pro: true
			},
			{
				name: 'gpt-4o',
				free: 'your OpenAI API key',
				pro: true
			},
			{
				name: 'llama3-8b',
				free: 'free with your Groq API key',
				pro: 'soon'
			},
			{
				name: 'llama3-70b',
				free: 'free with your Groq API key',
				pro: 'soon'
			},
			{
				name: 'mistral-large-latest',
				free: 'your Mistral API key',
				pro: 'soon'
			}
		],
		Misc: [
			{
				name: 'User registration',
				free: 'optional',
				pro: 'required'
			},
			{
				name: 'Payment model',
				free: 'pay-per-use',
				pro: 'fixed price'
			}
		]
	};

	async function login() {
		$autoLogin = true;
		const authService = await AuthService.getInstance();
		await authService.login();
	}
</script>

<div class="card flex flex-col gap-4 variant-filled-surface-700 p-4 md:p-6 lg:p-8 max-w-[100]">
	<h3 class="h3">How do you want to use SlickGPT?</h3>
	<p>
		You can use SlickGPT with your own API keys without user registration. You'll "pay per use" to
		the providers directly. <br />
		If this is too complicated or you prefer to know upfront what you'll be paying, we can handle this
		for you.
	</p>

	<div class="max-w-6xl mx-auto flex flex-col gap-4 md:gap-8 lg:gap-12 items-center mt-8">
		<div>
			<!-- Pricing tabs -->
			<div class="relative">
				<!-- Blurred shape -->
				<div
					class="max-md:hidden absolute bottom-0 -mb-20 left-2/3 -translate-x-1/2 blur-2xl opacity-40 pointer-events-none"
					aria-hidden="true"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="434" height="427">
						<defs>
							<linearGradient id="bs5-a" x1="19.609%" x2="50%" y1="14.544%" y2="100%">
								<stop offset="0%" stop-color="#A855F7" />
								<stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
							</linearGradient>
						</defs>
						<path
							fill="url(#bs5-a)"
							fill-rule="evenodd"
							d="m661 736 461 369-284 58z"
							transform="matrix(1 0 0 -1 -661 1163)"
						/>
					</svg>
				</div>
				<!-- Content -->
				<div class="grid md:grid-cols-3 xl:-mx-6 text-sm">
					<!-- Pricing toggle -->
					<div class="px-6 flex flex-col justify-end">
						<div class="pb-5 md:border-b border-slate-800">
							<!-- Toggle switch -->
							<div class="max-md:text-center">
								<div class="inline-flex items-center whitespace-nowrap">
									<div
										class="text-sm text-slate-700 dark:text-slate-100 font-medium mr-2 md:max-lg:hidden"
									>
										Monthly
									</div>
									<div class="relative">
										<SlideToggle name="payment-interval" bind:checked={annual} />
									</div>
									<div class="text-sm text-slate-700 dark:text-slate-100 font-medium ml-2">
										Yearly <span class="text-teal-500">(-%)</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Headers -->
					<TierHeader tier={headers.free} {annual} canSubscribe={false} />
					<TierHeader tier={headers.pro} {annual} highlight={true} />

					<TierFeatures {features} />
				</div>
			</div>
		</div>
	</div>

	<div class="flex flex-col md:flex-row gap-4 self-center md:self-end">
		<button type="button" class="btn variant-ghost" on:click={() => modalStore.close()}>
			<span><Key class="w-6 h-6" /></span>
			<span>I'll use my own API key</span>
		</button>
		{#if !$account}
			<button type="button" class="btn variant-filled-secondary" on:click={login}>
				<span><User class="w-6 h-6" /></span>
				<span>Register / Login</span>
			</button>
		{/if}
	</div>
</div>
