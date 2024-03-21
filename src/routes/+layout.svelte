<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Unsubscriber } from 'svelte/store';
	import 'highlightjs-copy/dist/highlightjs-copy.min.css';
	import '../app.postcss';
	import { inject } from '@vercel/analytics';

	import { dev } from '$app/environment';
	import {
		type ModalComponent,
		AppShell,
		Modal,
		storeHighlightJs,
		Toast,
		storePopup,
		setInitialClassState,
		initializeStores,
		type ModalSettings,
		getModalStore
	} from '@skeletonlabs/skeleton';
	import hljs from 'highlight.js';
	import CopyButtonPlugin from 'highlightjs-copy';
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	// see https://highlightjs.org/static/demo/ for options:
	import 'highlight.js/styles/night-owl.css';

	import Header from '$lib/Header.svelte';
	import Footer from '$lib/Footer.svelte';
	import SettingsModal from '$lib/Modals/SettingsModal.svelte';
	import ContextModal from '$lib/Modals/ContextModal.svelte';
	import ShareModal from '$lib/Modals/ShareModal.svelte';
	import CostModal from '$lib/Modals/CostModal.svelte';
	import SuggestTitleModal from '$lib/Modals/SuggestTitleModal.svelte';
	import UserModal from '$lib/Modals/UserModal.svelte';
	import AcceptTerms from '$lib/Modals/AcceptTerms.svelte';
	import { hasAcceptedTerms, hasSubscriptionChanged } from '$misc/stores';
	import CheckoutComplete from '$lib/Modals/CheckoutComplete.svelte';

	inject({ mode: dev ? 'development' : 'production' });

	hljs.addPlugin(new CopyButtonPlugin());

	initializeStores();
	setupSkeleton();

	const modalStore = getModalStore();

	let unsubscribeHasAcceptedTerms: Unsubscriber;
	let unsubscribeHasSubscriptionChanged: Unsubscriber;

	onMount(() => {
		unsubscribeHasAcceptedTerms = hasAcceptedTerms.subscribe((accepted) => {
			if (!accepted) {
				const modal: ModalSettings = {
					type: 'component',
					component: 'AcceptTermsModal',
					response: (accepted) => {
						if (!accepted) {
							// Skeleton modals can always be closed with Esc.
							// If the user did that, we show the modal again.
							modalStore.trigger(modal);
						}
					}
				};
				modalStore.trigger(modal);
			}
		});

		unsubscribeHasSubscriptionChanged = hasSubscriptionChanged.subscribe((changed) => {
			if (changed) {
				const modal: ModalSettings = {
					type: 'component',
					component: 'ModalCheckoutComplete',
					response: (accepted) => {
						if (!accepted) {
							// Skeleton modals can always be closed with Esc.
							// If the user did that, we show the modal again.
							modalStore.trigger(modal);
						}
					}
				};
				modalStore.trigger(modal);
			}
		});
	});

	onDestroy(() => {
		if (unsubscribeHasAcceptedTerms) {
			unsubscribeHasAcceptedTerms();
		}
		if (unsubscribeHasSubscriptionChanged) {
			unsubscribeHasSubscriptionChanged();
		}
	});

	// see https://www.skeleton.dev/utilities/modals
	const modalComponentRegistry: Record<string, ModalComponent> = {
		SettingsModal: { ref: SettingsModal },
		ContextModal: { ref: ContextModal },
		ShareModal: { ref: ShareModal },
		CostModal: { ref: CostModal },
		SuggestTitleModal: { ref: SuggestTitleModal },
		UserModal: { ref: UserModal },
		AcceptTermsModal: { ref: AcceptTerms },
		ModalCheckoutComplete: { ref: CheckoutComplete }
	};

	const meta = {
		type: 'website',
		title: 'SlickGPT',
		url: 'https://slickgpt.vercel.app/',
		description:
			'SlickGPT is a light-weight ChatGPT client written in Svelte. It offers GPT-4 integration, a userless share feature and other superpowers. Bring your own API key or use our cloud infrastructure.',
		image: '/logo-slickgpt.svg',
		imageAlt: 'SlickGPT Logo'
	};

	function setupSkeleton() {
		// see https://github.com/skeletonlabs/skeleton/issues/905 - gotta do this with ssr = false
		setInitialClassState();
		// see https://www.skeleton.dev/utilities/codeblocks
		storeHighlightJs.set(hljs);
		// see https://www.skeleton.dev/utilities/popups
		storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
	}
</script>

<svelte:head>
	<meta property="og:type" content={meta.type} />
	<meta property="og:url" content={meta.url} />
	<meta property="og:title" content={meta.title} />
	<meta name="twitter:title" content={meta.title} />
	<meta name="description" content={meta.description} />
	<meta property="og:description" content={meta.description} />
	<meta name="twitter:description" content={meta.description} />
	<meta property="og:image" content={meta.image} />
	<meta name="twitter:image" content={meta.image} />
	<meta name="twitter:image:alt" content={meta.imageAlt} />
	<title>{meta.title}</title>

	<script async src="https://js.stripe.com/v3/buy-button.js"></script>
</svelte:head>

<AppShell
	regionPage="relative lg:px-12"
	slotHeader="py-2 md:py-6 px-4 lg:px-12"
	slotFooter="py-2 md:py-6 px-4 lg:px-12"
>
	<svelte:fragment slot="header">
		<Header />
	</svelte:fragment>

	<slot />

	<svelte:fragment slot="footer">
		<Footer />
	</svelte:fragment>
</AppShell>

<!-- Skeleton Singletons: -->
<Toast />

<Modal components={modalComponentRegistry} />
