import type { Chat, ClientSettings } from './shared';
import { writable, type Writable } from 'svelte/store';
import type { ChatCompletionRequestMessage } from 'openai';
import { localStorageStore } from '@skeletonlabs/skeleton';

export const settingsStore: Writable<ClientSettings> = localStorageStore('settingsStore', {});

export const liveAnswerStore: Writable<ChatCompletionRequestMessage> = writable({
	role: 'assistant',
	content: ''
});

export const isLoadingAnswerStore: Writable<boolean> = writable(false);

export const isTimeagoInitialized: Writable<boolean> = writable(false);

// custom chat store

export interface ChatStore extends Writable<{ [key: string]: Chat }> {
	updateChat(slug: string, update: Partial<Chat>): void;
	addMessageToChat(slug: string, message: ChatCompletionRequestMessage): void;
	removeLastUserMessage(slug: string): void;
	deleteUpdateToken(slug: string): void;
	deleteChat(slug: string): void;
}

const _chatStore: Writable<{ [key: string]: Chat }> = localStorageStore('chatStore', {});

const updateChat = (slug: string, update: Partial<Chat>) => {
	_chatStore.update((store) => {
		return { ...store, [slug]: { ...store[slug], ...update } };
	});
};

const addMessageToChat = (slug: string, message: ChatCompletionRequestMessage) => {
	_chatStore.update((store) => {
		return { ...store, [slug]: { ...store[slug], messages: [...store[slug].messages, message] } };
	});
};

const removeLastUserMessage = (slug: string) => {
	_chatStore.update((store) => {
		const lastMessage = store[slug].messages[store[slug].messages.length - 1];
		if (lastMessage.role === 'user') {
			return {
				...store,
				[slug]: {
					...store[slug],
					messages: store[slug].messages.slice(0, -1)
				}
			};
		}
		return store;
	});
};

const deleteUpdateToken = (slug: string) => {
	_chatStore.update((store) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { updateToken, ...rest } = store[slug];
		return { ...store, [slug]: rest };
	});
};

const deleteChat = (slug: string) => {
	chatStore.update((store) => {
		const chats = { ...store };
		delete chats[slug];
		return chats;
	});
};

export const chatStore: ChatStore = {
	subscribe: _chatStore.subscribe,
	set: _chatStore.set,
	update: _chatStore.update,
	updateChat,
	removeLastUserMessage,
	addMessageToChat,
	deleteUpdateToken,
	deleteChat
};
