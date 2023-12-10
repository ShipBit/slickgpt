<script lang="ts">
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
		setInitialClassState
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
	import { initializeStores } from '@skeletonlabs/skeleton';
	import CommandPalette, { defineActions, createStoreMethods } from 'svelte-command-palette'
	import { chatStore } from './../misc/stores';
	import type { action } from 'svelte-command-palette/types';
	import { goto } from '$app/navigation';

	inject({ mode: dev ? 'development' : 'production' });

	hljs.addPlugin(new CopyButtonPlugin());

	initializeStores();
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
	// Create a stream of a sorted list of chats
	let sortedChats: [string, any][] = []
	$: {
		sortedChats = 
			Object.entries($chatStore).sort((a, b) => {
			return new Date(b[1].created).getTime() - new Date(a[1].created).getTime();
		});
	}

	let chatActions: action[] = []

	// Map every chat to a command pallete action, with name as title and first few chars as description
	$:  {
		chatActions = sortedChats.map(([slug, chat]) => {
			return {
				title: chat.title,	
				description: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content?.substring(0, 300) || "" : "",
				onRun: () => {
					goto(`/${slug}`)
				},
				// Keywords are full first and second message, but maybe we can do something better here
				keywords: [chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content || "" : "", chat.messages.length > 1 ? chat.messages[chat.messages.length - 2].content || "" : "" ]
			};
		})
	}
	// Reactively define the actions
	let actions : action[] = [];
	$: {
		actions = defineActions(chatActions);
		const paletteMethods = createStoreMethods();
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
</svelte:head>

<AppShell
	regionPage="relative lg:px-12"
	slotHeader="py-2 md:py-6 px-4 lg:px-12"
	slotFooter="py-2 md:py-6 px-4 lg:px-12"
>
	<svelte:fragment slot="header">
		<Header /> <p>CMD+K to search chats</p>
	</svelte:fragment>

	<slot />

	<svelte:fragment slot="footer">
		<Footer />
	</svelte:fragment>
</AppShell>

<!-- Skeleton Singletons: -->
<Toast />

<Modal components={modalComponentRegistry} />
<CommandPalette 
	overlayClass=""
	keyboardButtonClass={null}
	inputClass="form-input block w-full bg-white text-black"
	titleClass="text-gray-900 font-bold"
	resultsContainerClass="z-index: 1000, rounded-md border-none margin-0"
    resultContainerClass=""
	commands={actions}/>	