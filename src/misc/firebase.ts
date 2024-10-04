import { initializeApp } from 'firebase/app';
import { getDatabase, get, ref } from 'firebase/database';
import {
	FIREBASE_APIKEY,
	FIREBASE_AUTHDOMAIN,
	FIREBASE_PROJECTID,
	FIREBASE_DATABASEURL,
	FIREBASE_STORAGEBUCKET,
	FIREBASE_MESSAGINGSENDERID,
	FIREBASE_APPID
} from '$env/static/private';
import type { Chat, ChatMessage } from './shared';

/**
 * This can only be executed server-side!
 * The client has no access to $env/static/private.
 * That's exactly what we want, therefore we wrap the firebase calls in our own API/endpoints.
 */

const throwIfUnset = (name: string, value: any) => {
	if (value == null) throw new Error(`${name} environment variable missing`);
};

throwIfUnset(FIREBASE_APIKEY, 'FIREBASE_APIKEY');
throwIfUnset(FIREBASE_AUTHDOMAIN, 'FIREBASE_AUTHDOMAIN');
throwIfUnset(FIREBASE_PROJECTID, 'FIREBASE_PROJECTID');
throwIfUnset(FIREBASE_DATABASEURL, 'FIREBASE_DATABASEURL');
throwIfUnset(FIREBASE_STORAGEBUCKET, 'FIREBASE_STORAGEBUCKET');
throwIfUnset(FIREBASE_MESSAGINGSENDERID, 'FIREBASE_MESSAGINGSENDERID');
throwIfUnset(FIREBASE_APPID, 'FIREBASE_APPID');

const firebaseConfig = {
	apiKey: FIREBASE_APIKEY,
	authDomain: FIREBASE_AUTHDOMAIN,
	projectId: FIREBASE_PROJECTID,
	storageBucket: FIREBASE_STORAGEBUCKET,
	messagingSenderId: FIREBASE_MESSAGINGSENDERID,
	appId: FIREBASE_APPID,
	databaseURL: FIREBASE_DATABASEURL
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

export async function loadChatFromDb(slug: string) {
	const response = (await get(ref(db, `sharedchats/${slug}`))).toJSON() as Chat;

	// firebase stores array as objects like { 0: whatever, 1: whateverelse }
	const convertToArray = (obj: any): any[] => {
		return Object.values(obj || {});
	};

	const convertMessagesToArray = (messagesObj: Chat | ChatMessage[]): ChatMessage[] => {
		const messages: ChatMessage[] = [];
		for (const message of Object.values(messagesObj)) {
			const chatMessage = message as ChatMessage;
			if (chatMessage.messages) {
				chatMessage.messages = convertMessagesToArray(chatMessage.messages);
			}
			if (chatMessage.content && typeof chatMessage.content === 'object') {
				chatMessage.content = convertToArray(chatMessage.content);
			}
			messages.push(chatMessage);
		}
		return messages;
	};

	if (response?.messages) {
		const messages = convertMessagesToArray(response.messages);

		return {
			...response,
			messages
		};
	}

	return response;
}
