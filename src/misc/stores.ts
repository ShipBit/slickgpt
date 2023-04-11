import type { Chat, ChatMessage, ClientSettings } from './shared';
import { writable, type Readable, type Writable, readable, get, derived } from 'svelte/store';
import type { ChatCompletionRequestMessage } from 'openai';
import { localStorageStore } from '@skeletonlabs/skeleton';
import { v4 as uuidv4 } from 'uuid';
import { EventSource } from './eventSource';
import { ChatStorekeeper } from './chatStorekeeper';

export const settingsStore: Writable<ClientSettings> = localStorageStore('settingsStore', {});

export const liveAnswerStore: Writable<ChatCompletionRequestMessage> = writable({
	role: 'assistant',
	content: ''
});

export const isLoadingAnswerStore: Writable<boolean> = writable(false);

export const isTimeagoInitializedStore: Writable<boolean> = writable(false);

export const eventSourceStore: Readable<EventSource> = readable(new EventSource());

/**
 * Custom chat store
 **/

// TODO: Rework for ChatMessage children array

export interface ChatStore extends Writable<{ [key: string]: Chat }> {
	updateChat(slug: string, update: Partial<Chat>): void;
	addMessageToChat(slug: string, message: ChatMessage, parent?: ChatMessage): void;
	addAsSibling(slug: string, id: string, newMessage: Partial<ChatMessage>): void;
	deleteMessage(slug: string, id: string): void;
	deleteUpdateToken(slug: string): void;
	deleteChat(slug: string): void;
	isFlat(chat: Chat): boolean;
	findParent(messageId: string, chat: Chat): { parent: ChatMessage; index: number } | null;
	getMessageById(messageId: string, chat: Chat): ChatMessage | null;
	getCurrentMessageBranch(chat: Chat): ChatMessage[] | null;
	selectSibling(id: string, siblings: ChatMessage[]): void;
}

const _chatStore: Writable<{ [key: string]: Chat }> = localStorageStore('chatStore', {});

/**
 * Be careful when updating nested objects - they are overwritten, not merged!
 */
const updateChat = (slug: string, update: Partial<Chat>) => {
	_chatStore.update((store) => {
		return { ...store, [slug]: { ...store[slug], ...update } };
	});
};

const addMessageToChat = (slug: string, message: ChatMessage, parent?: ChatMessage) => {
	if (!message.id) {
		message.id = uuidv4();
	}

	message.isSelected = true;

	_chatStore.update((store) => {
		const updatedMessages = parent?.id
			? ChatStorekeeper.addMessageAsChild(store[slug].messages, parent.id, message)
			: [...store[slug].messages, message];

		if (parent && parent.id) {
			// auto-select new messages
			const updatedParent = ChatStorekeeper.getById(parent.id, updatedMessages);
			if (updatedParent && updatedParent.messages) {
				for (const msg of updatedParent.messages) {
					msg.isSelected = msg.id === message.id;
				}
			}
		}

		return {
			...store,
			[slug]: {
				...store[slug],
				messages: updatedMessages
			}
		};
	});
};

const getCurrentMessageBranch = (chat: Chat): ChatMessage[] | null => {
	return ChatStorekeeper.getCurrentMessageBranch(chat);
};

const addAsSibling = (
	slug: string,
	id: string,
	message: ChatMessage,
	removeChildren = true
): void => {
	const chat = { ...get(_chatStore)[slug] };
	const parentData = ChatStorekeeper.findParent(id, chat.messages);
	let newMessage = message;
	if (removeChildren) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, messages, ...rest } = message;
		newMessage = rest;
	}

	addMessageToChat(slug, newMessage, parentData?.parent);
};

const deleteMessage = (slug: string, id: string) => {
	const chat = { ...get(_chatStore)[slug] };

	if (!chat) {
		throw new Error('Chat not found');
	}

	const message = ChatStorekeeper.getById(id, chat.messages);
	if (!message?.id) {
		throw new Error('Message ID is not defined');
	}

	const deleteMessageAndHandleChildren = (parentMessages: ChatMessage[], index: number) => {
		const hasSiblings = parentMessages.length > 1;
		if (hasSiblings || !message.messages) {
			// remove the message and all its children
			parentMessages.splice(index, 1);
		} else if (message.messages) {
			// move the children of the message one level up
			parentMessages.splice(index, 1, ...message.messages);
		}
	};

	// If the message is on the top level of the chat
	const index = chat.messages.findIndex((msg) => msg.id === message.id);
	if (index !== -1) {
		deleteMessageAndHandleChildren(chat.messages, index);
	} else {
		// Find the parent of the message
		const parentData = ChatStorekeeper.findParent(message.id, chat.messages);
		if (parentData) {
			const { parent, index } = parentData;
			// always true, check just for TypeScript:
			if (parent.messages) {
				deleteMessageAndHandleChildren(parent.messages, index);
			}
		} else {
			throw new Error('Message not found in the chat.');
		}
	}

	_chatStore.update((store) => {
		return {
			...store,
			[slug]: {
				...store[slug],
				messages: chat.messages
			}
		};
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
	isFlat: ChatStorekeeper.isFlat,
	findParent: (messageId, chat) => ChatStorekeeper.findParent(messageId, chat.messages),
	getMessageById: (messageId, chat) => ChatStorekeeper.getById(messageId, chat.messages),
	selectSibling: (id, siblings) => ChatStorekeeper.selectSibling(id, siblings),
	updateChat,
	deleteMessage,
	addMessageToChat,
	deleteUpdateToken,
	deleteChat,
	addAsSibling,
	getCurrentMessageBranch
};
