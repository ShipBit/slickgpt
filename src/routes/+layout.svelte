<script lang="ts">
	import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
	import '@skeletonlabs/skeleton/styles/all.css';
	import '../app.postcss';

	import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
	import { dev } from '$app/environment';
	import {
		type ModalComponent,
		AppShell,
		Modal,
		storeHighlightJs,
		Toast,
		storePopup,
		setInitialClassState
	} from '@skeletonlabs/skeleton';
	import hljs from 'highlight.js';
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

	setupSkeleton();

	// see https://www.skeleton.dev/utilities/modals
	const modalComponentRegistry: Record<string, ModalComponent> = {
		SettingsModal: { ref: SettingsModal },
		ContextModal: { ref: ContextModal },
		ShareModal: { ref: ShareModal },
		CostModal: { ref: CostModal },
		SuggestTitleModal: { ref: SuggestTitleModal }
	};

	const meta = {
		type: 'website',
		title: 'SlickGPT',
		url: 'https://slickgpt.vercel.app/',
		description:
			'SlickGPT is a light-weight "use-your-own-API-key" ChatGPT client written in Svelte. It offers GPT-4 integration, a userless share feature and other superpowers.',
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

	{#if !dev && PUBLIC_PLAUSIBLE_DOMAIN}
		<script
			defer
			data-domain={PUBLIC_PLAUSIBLE_DOMAIN}
			src="https://plausible.io/js/script.outbound-links.js"
		></script>
		<script>
			window.plausible =
				window.plausible ||
				function () {
					(window.plausible.q = window.plausible.q || []).push(arguments);
				};
		</script>
	{/if}
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
