import type { Chat, ChatMessage } from './shared';

/**
 * This class is just used to move some lengthy logic out of the stores file.
 * Contains only static functions and does not temper with the Svelte store.
 */
export class ChatStorekeeper {
	static isFlat(chat: Chat): boolean {
		return (function checkMessages(messages?: ChatMessage[]): boolean {
			if (!messages || messages.length === 0) {
				return true;
			}

			for (const message of messages) {
				if (message.messages && message.messages.length > 1) {
					return false;
				}

				if (message.messages && message.messages.length === 1) {
					return checkMessages(message.messages);
				}
			}

			return true;
		})(chat.messages);
	}

	static getById(messageId: string, chatMessages: ChatMessage[]): ChatMessage | null {
		for (const message of chatMessages) {
			if (message.id === messageId) {
				return message;
			}

			if (message.messages) {
				const foundMessage = ChatStorekeeper.getById(messageId, message.messages);
				if (foundMessage) {
					return foundMessage;
				}
			}
		}
		return null;
	}

	static findParent(
		messageId: string,
		chatMessages: ChatMessage[]
	): { parent: ChatMessage; index: number } | null {
		for (let i = 0; i < chatMessages.length; i++) {
			const parent = chatMessages[i];
			if (parent.messages) {
				const index = parent.messages.findIndex((msg) => msg.id === messageId);
				if (index !== -1) {
					return {
						parent,
						index
					};
				}

				const foundParent = ChatStorekeeper.findParent(messageId, parent.messages);
				if (foundParent) {
					return foundParent;
				}
			}
		}

		return null;
	}

	static addMessageAsChild(
		chatMessages: ChatMessage[],
		parentId: string,
		messageToAdd: ChatMessage
	): ChatMessage[] {
		return chatMessages.map((message) => {
			if (message.id === parentId) {
				return {
					...message,
					messages: message.messages ? [...message.messages, messageToAdd] : [messageToAdd]
				};
			}

			if (message.messages) {
				message.messages = ChatStorekeeper.addMessageAsChild(
					message.messages,
					parentId,
					messageToAdd
				);
			}

			return message;
		});
	}

	static getCurrentMessageBranch(chat: Chat, includeContext = true): ChatMessage[] {
		const result: ChatMessage[] =
			includeContext && chat.contextMessage.content ? [chat.contextMessage] : [];

		function traverse(messages: ChatMessage[]): void {
			if (messages.length === 1) {
				result.push(messages[0]);
				if (messages[0].messages) {
					traverse(messages[0].messages);
				}
			} else {
				for (const message of messages) {
					if (message.isSelected) {
						result.push(message);
						if (message.messages) {
							traverse(message.messages);
						}
						break;
					}
				}
			}
		}

		traverse(chat.messages);
		return result;
	}

	static selectSibling(id: string, siblings: ChatMessage[]) {
		for (const sibling of siblings) {
			sibling.isSelected = sibling.id === id;
		}
	}
}
