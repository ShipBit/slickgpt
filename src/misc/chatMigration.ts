import type { Chat, ChatMessage } from './shared';
import { v4 as uuidv4 } from 'uuid';

function hasMissingId(message: ChatMessage[]): boolean {
	for (const msg of message) {
		if (!msg.id) {
			return true;
		}
		if (msg.messages && hasMissingId(msg.messages)) {
			return true;
		}
	}
	return false;
}

function assignMessageId(messages: ChatMessage[]): void {
	for (const msg of messages) {
		if (!msg.id) {
			msg.id = uuidv4();
		}
		if (msg.messages) {
			assignMessageId(msg.messages);
		}
	}
}

function assignMessageIds(chat: Chat): void {
	assignMessageId(chat.messages);
}

function nestMessages(chat: Chat): void {
	const messages: ChatMessage[] = chat.messages;

	let currentMessage: ChatMessage | undefined;
	for (const message of messages) {
		if (!currentMessage) {
			chat.messages = [message]; // set the first message in the array as root
			currentMessage = message;
		} else {
			currentMessage.messages = [message]; // nest the next message
			currentMessage = message;
		}
	}
}

function needsMigration(chat: Chat): boolean {
	return hasMissingId(chat.messages);
}

export function migrateChat(chat: Chat): { chat: Chat; migrated: boolean } {
	if (!needsMigration(chat)) {
		return { chat, migrated: false };
	}
	const migratedChat = { ...chat };

	assignMessageIds(migratedChat);
	nestMessages(migratedChat);

	return { chat: migratedChat, migrated: true };
}
