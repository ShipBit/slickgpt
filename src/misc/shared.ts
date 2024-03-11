import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { get } from 'svelte/store';
import { defaultOpenAiSettings, models, OpenAiModel, type OpenAiSettings } from './openai';
import type { ModalSettings, ToastSettings, ToastStore, ModalStore } from '@skeletonlabs/skeleton';
import { generateSlug } from 'random-word-slugs';
import vercelAnalytics from '@vercel/analytics';

import { goto } from '$app/navigation';
import { mode, chatStore, settingsStore } from './stores';
import { PUBLIC_DISABLE_TRACKING, PUBLIC_MIDDLEWARE_API_URL } from '$env/static/public';
import { AuthService } from './authService';

export interface ChatMessage extends ChatCompletionMessageParam {
	id?: string;
	messages?: ChatMessage[];
	isSelected?: boolean;
	isAborted?: boolean;
}

export interface Chat {
	title: string;
	settings: OpenAiSettings;
	contextMessage: ChatCompletionMessageParam;
	messages: ChatMessage[];
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
	context?: string | null;
	title?: string;
	settings?: OpenAiSettings;
	messages?: ChatCompletionMessageParam[];
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
	return chat.contextMessage?.content || chat.messages?.length > 0;
}

export async function suggestChatTitle(chat: Chat): Promise<string> {
	if (!canSuggestTitle(chat)) {
		return Promise.resolve(chat.title);
	}

	const messages =
		chat.messages.length === 1
			? chatStore.getCurrentMessageBranch(chat)
			: chat.contextMessage?.content
				? [chat.contextMessage, ...chat.messages]
				: chat.messages;
	if (!messages) {
		return Promise.resolve(chat.title);
	}

	const filteredMessages = [
		...messages.slice(0, chat.contextMessage?.content ? 3 : 2).map(
			(m) =>
				({
					role: m.role,
					content: m.content
				}) as ChatCompletionMessageParam
		),
		{
			role: 'user',
			content:
				"Suggest a short title for this chat, summarising its content. Take the 'system' message into account and the first prompt from me and your first answer. The title should not be longer than 100 chars. Answer with just the title. Don't use punctuation in the title."
		} as ChatCompletionMessageParam
	];

	let token: string;
	let url: string;
	let body: any;
	let headers: Record<string, string>;
	const runMode = get(mode);
	if (runMode === 'middleware') {
		const authService = await AuthService.getInstance();
		token = get(authService.token);
		url = PUBLIC_MIDDLEWARE_API_URL;
		headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};
		body = {
			messages: filteredMessages,
			settings: {
				maxTokens: 1024,
				temperature: 1,
				topP: 1,
				stopSequences: []
			},
			model: models['gpt-3.5-turbo'].middlewareDeploymentName,
			stream: false
		};
	} else {
		url = '/api/suggest-title';
		headers = { 'Content-Type': 'application/json' };
		body = { messages: filteredMessages, openAiKey: get(settingsStore).openAiApiKey };
	}

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	let result;
	if (runMode === 'middleware') {
		result = await response.text();
	} else {
		const { title }: { title: string } = await response.json();
		result = title;
	}

	return Promise.resolve(result);
}

export function showModalComponent(
	modalStore: ModalStore,
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
	if (PUBLIC_DISABLE_TRACKING === 'true') {
		return;
	}
	vercelAnalytics.track(action);
}

export function showToast(
	toastStore: ToastStore,
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
