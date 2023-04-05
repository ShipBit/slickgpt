import type { ChatCompletionRequestMessage } from 'openai';
import { get } from 'svelte/store';
import { defaultOpenAiSettings, OpenAiModel, type OpenAiSettings } from './openai';
import {
	modalStore,
	type ModalSettings,
	type ToastSettings,
	toastStore
} from '@skeletonlabs/skeleton';
import { generateSlug } from 'random-word-slugs';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { chatStore, settingsStore } from './stores';

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
	useTitleSuggestions?: boolean;
	defaultModel?: OpenAiModel;
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

export function createNewChat(template?: {
	context?: string;
	title?: string;
	settings?: OpenAiSettings;
	messages?: ChatCompletionRequestMessage[];
}) {
	const settings = { ...(template?.settings || defaultOpenAiSettings) };
	const { defaultModel } = get(settingsStore);
	if (defaultModel) {
		settings.model = defaultModel;
	}

	const slug = generateSlug();
	const chat: Chat = {
		title: template?.title || slug,
		settings,
		contextMessage: {
			role: 'system',
			content: template?.context || ''
		},
		messages: template?.messages || [],
		created: new Date()
	};

	chatStore.updateChat(slug, chat);

	goto(`/${slug}`, { invalidateAll: true });
}

export function canSuggestTitle(chat: Chat) {
	return chat.contextMessage?.content || chat.messages?.length > 1;
}

export async function suggestChatTitle(chat: Chat, openAiApiKey: string): Promise<string> {
	if (!canSuggestTitle(chat)) {
		return Promise.resolve(chat.title);
	}

	const messages = chat.contextMessage.content // omit context if empty to save some tokens
		? [chat.contextMessage, ...chat.messages]
		: [...chat.messages];

	const response = await fetch('/api/suggest-title', {
		method: 'POST',
		body: JSON.stringify({
			messages,
			openAiKey: openAiApiKey
		})
	});
	const { title }: { title: string } = await response.json();

	return Promise.resolve(title);
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

export function showToast(
	message: string,
	type: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' = 'primary',
	autohide = true,
	timeout = 5000
) {
	const toast: ToastSettings = {
		background: `variant-filled-${type}`,
		message,
		autohide,
		timeout
	};
	toastStore.trigger(toast);
}
