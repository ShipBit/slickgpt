import type {
	ChatCompletionMessageParam,
	ChatCompletionSystemMessageParam
} from 'openai/resources/chat/completions';
import { get } from 'svelte/store';
import {
	defaultOpenAiSettings,
	models,
	AiModel,
	type AiSettings,
	AiProvider,
	getProviderForModel
} from './openai';
import type { ModalSettings, ToastSettings, ToastStore, ModalStore } from '@skeletonlabs/skeleton';
import { generateSlug } from 'random-word-slugs';
import vercelAnalytics from '@vercel/analytics';

import { goto } from '$app/navigation';
import { isPro, chatStore, settingsStore } from './stores';
import {
	PUBLIC_DISABLE_TRACKING,
	PUBLIC_GROQ_API_URL,
	PUBLIC_MIDDLEWARE_API_URL,
	PUBLIC_MISTRAL_API_URL,
	PUBLIC_OPENAI_API_URL
} from '$env/static/public';
import { AuthService } from './authService';

export interface ChatContent {
	type: 'text' | 'image_url';
	text?: string;
	image_url?: {
		url: string;
		detail: 'low' | 'high';
	};
	imageData?: {
		name?: string,
		height?: number,
		width?: number,
		position?: {
			x: any,
			y: any
		}
	};
}

export interface ChatMessage {
	content: string | ChatContent[];
	role: 'system' | 'user' | 'assistant';
	name?: string;
	id?: string;
	messages?: ChatMessage[];
	isSelected?: boolean;
	isAborted?: boolean;
}

export interface Chat {
	title: string;
	settings: AiSettings;
	contextMessage: ChatCompletionSystemMessageParam;
	messages: ChatMessage[];
	created: Date;

	isImported?: boolean;
	updateToken?: string;
	hasUpdatedChatTitle?: boolean;
}

export interface ClientSettings {
	openAiApiKey?: string;
	mistralApiKey?: string;
	metaApiKey?: string;
	hideLanguageHint?: boolean;
	useTitleSuggestions?: boolean;
	defaultModel?: AiModel;
	defaultProvider?: AiProvider;
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
	settings?: AiSettings;
	messages?: ChatMessage[];
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

	function sanitizeContent(content: string | ChatContent[]): ChatContent[] | string {
		if (typeof content === 'string') {
			return content;
		}
		return content.map(item => item.type === 'image_url' ? (({ imageData, ...rest }) => rest)(item) : item);
	}

	const filteredMessages = [
		...messages.slice(0, chat.contextMessage?.content ? 3 : 2).map(
			(m) =>
				({
					role: m.role,
					content: sanitizeContent(m.content)
				}) as ChatCompletionMessageParam
		),
		{
			role: 'user',
			content: [
				{
					type: 'text',
					text: "Suggest a short, relevant title for our conversation, summarizing the main topic of the conversation. Consider the 'system' message, my first message, and your first message. The title should be in the same language I used in my message. If I wrote German, the title suggestion should be in German. If I wrote English, the title suggestion should be in English. The title suggestion should never exceed 100 characters and should provide only the title in plain-text without special characters, punctuation or quotation marks."
				}
			]
		} as ChatCompletionMessageParam
	];

	let token: string;
	let url: string;
	let body: any;
	let headers: Record<string, string>;
	const isUsingPro = get(isPro);

	if (isUsingPro) {
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
			model: models[AiModel.Gpt4oMini].middlewareDeploymentName || AiModel.Gpt4oMini,
			stream: false
		};
	} else {
		const provider = getProviderForModel(chat.settings.model);
		const settings = get(settingsStore);
		switch (provider) {
			case AiProvider.Mistral:
				token = settings.mistralApiKey!;
				url = PUBLIC_MISTRAL_API_URL;
				break;
			case AiProvider.Meta:
				token = settings.metaApiKey!;
				url = PUBLIC_GROQ_API_URL;
				break;
			default:
				token = settings.openAiApiKey!;
				url = PUBLIC_OPENAI_API_URL;
				break;
		}
		headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};
		body = {
			messages: filteredMessages,
			...defaultOpenAiSettings,
			model: chat.settings.model,
			stream: false
		};
	}

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	let result;
	if (isUsingPro) {
		result = (await response.text()).replace(/^[\'\"]|[\'\"]$/g, '').trim();
	} else {
		const res = await response.json();
		const title = res.choices[0].message.content.replace(/^[\'\"]|[\'\"]$/g, '').trim();
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
	timeout = 5000,
	action?: { label: string; response: () => void }
) {
	const toast: ToastSettings = {
		background: `variant-filled-${type}`,
		message,
		autohide,
		timeout,
		action
	};
	toastStore.trigger(toast);
}
