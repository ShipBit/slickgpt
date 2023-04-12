import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Chat } from '$misc/shared';
import { migrateChat } from '$misc/chatMigration';

export const load: PageLoad = async ({ fetch, params }) => {
	const { slug } = params;
	const response = await fetch(`/api/share?slug=${slug}`);
	const result = await response.json();

	if (!response.ok) {
		// result.message is the text we created in the API function
		throw error(response.status, result.message);
	}

	const chat = result as Chat;
	const { chat: migratedChat, migrated } = migrateChat(chat);

	if (migrated) {
		console.log(`migrated chat ${slug} in-memory`);
	}

	return {
		slug,
		chat: migratedChat
	};
};
