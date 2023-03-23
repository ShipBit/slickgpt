import type { ChatCompletionRequestMessage } from 'openai';
import { defaultOpenAiSettings, type OpenAiSettings } from './openai';
import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
import { generateSlug } from 'random-word-slugs';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { chatStore } from './stores';

export interface Chat {
	title: string;
	settings: OpenAiSettings;
	contextMessage: ChatCompletionRequestMessage;
	messages: ChatCompletionRequestMessage[];
	created: Date;

	isImported?: boolean;
	updateToken?: string;
}

export interface ClientSettings {
	openAiApiKey?: string;
	hideLanguageHint?: boolean;
}

export interface ChatCost {
	tokensPrompt: number;
	tokensCompletion: number;
	tokensTotal: number;
	costPrompt: number;
	costCompletion: number;
	costTotal: number;
	maxTokensForModel: number;
}

export function createNewChat() {
	const slug = generateSlug();
	const chat: Chat = {
		title: slug,
		settings: { ...defaultOpenAiSettings },
		contextMessage: {
			role: 'system',
			content: ''
		},
		messages: [],
		created: new Date()
	};

	chatStore.updateChat(slug, chat);

	goto(`/${slug}`);
}

export function showModalComponent(
	component: string,
	meta?: object,
	response?: ((r: any) => void) | undefined
) {
	const modal: ModalSettings = {
		type: 'component',
		component,
		meta,
		response
	};
	modalStore.trigger(modal);
}

export function track(action: string) {
	if (browser && window.plausible) {
		window.plausible(action);
	}
}
