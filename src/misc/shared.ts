import type { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { get } from 'svelte/store';
import { defaultOpenAiSettings, OpenAiModel, type OpenAiSettings } from './openai';
import {
	modalStore,
	type ModalSettings,
	type ToastSettings,
	toastStore
} from '@skeletonlabs/skeleton';
import { generateSlug } from 'random-word-slugs';
import vercelAnalytics from '@vercel/analytics';

import { goto } from '$app/navigation';
import { chatStore, settingsStore } from './stores';
import { PUBLIC_DISABLE_TRACKING } from '$env/static/public';
import type { Chat as PrismaChat, ChatMessage as PrismaChatMessage } from '@prisma/client';

export interface ChatMessage extends PrismaChatMessage {
	role: ChatCompletionRequestMessageRoleEnum;

	isSelected?: boolean;
	isAborted?: boolean;
}

export interface Chat extends PrismaChat {
	settings: OpenAiSettings;
	messages: ChatMessage[];

	isImported?: boolean;
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
	return chat.contextMessage?.content || chat.messages?.length > 0;
}

export async function suggestChatTitle(chat: Chat, openAiApiKey: string): Promise<string> {
	if (!canSuggestTitle(chat)) {
		return Promise.resolve(chat.title);
	}

	const messages =
		chat.messages.length === 1
			? chatStore.getCurrentMessageBranch(chat)
			: chat.contextMessage?.content
			? [chat.contextMessage, ...chat.messages]
			: chat.messages;

	const filteredMessages = messages?.slice(0, chat.contextMessage?.content ? 3 : 2).map(
		(m) =>
			({
				role: m.role,
				content: m.content,
				name: m.name
			} as ChatCompletionRequestMessage)
	);

	const response = await fetch('/api/suggest-title', {
		method: 'POST',
		body: JSON.stringify({
			messages: filteredMessages,
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
	if (PUBLIC_DISABLE_TRACKING === 'true') {
		return;
	}
	vercelAnalytics.track(action);
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
