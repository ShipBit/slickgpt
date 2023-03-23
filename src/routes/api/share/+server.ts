import { error } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';
import type { RequestHandler } from './$types';
import { ref, set, update } from 'firebase/database';
import { generateSlug } from 'random-word-slugs';
import { db, loadChatFromDb } from '$misc/firebase';
import type { Chat } from '$misc/shared';
import { respondToClient, throwIfUnset, getErrorMessage } from '$misc/error';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'nodejs18.x'
};

export const GET: RequestHandler = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	if (!slug) {
		throw new Error('missing URL param: slug');
	}

	const chat = await loadChatFromDb(slug);
	if (!chat) {
		throw error(404, 'Chat not found');
	}
	// never send this to the client!
	delete chat.updateToken;

	return respondToClient(chat);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const requestData = await request.json();
		throwIfUnset('request data', requestData);

		let slug: string = requestData.slug;
		throwIfUnset('slug', slug);

		const chat: Chat = requestData.chat;
		throwIfUnset('chat', chat);

		// The updateToken is like a "password" for later edits
		let updateToken: string = chat.updateToken || generateSlug();

		const savedDocument = await loadChatFromDb(slug);
		// already saved
		if (savedDocument) {
			// updateToken is wrong or this slug has already been saved ("duplicate ID")
			if (savedDocument.updateToken !== updateToken) {
				// in this case we just create a new share
				slug = generateSlug();
				updateToken = generateSlug();
				console.log(`Wrong update token for chat ${slug}. Creating new one: ${slug}`);
			}
		}

		const documentToSave = {
			...chat,
			updateToken
		};

		// save to firebase
		await set(ref(db, `sharedchats/${slug}`), documentToSave);

		return respondToClient({ slug, updateToken });
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		// key: slug, value: updateToken
		const requestData = (await request.json()) as { [key: string]: string };
		throwIfUnset('request data', requestData);

		if (!Object.keys(requestData)?.length) throw new Error('No docs to delete provided');

		const updates: Record<string, any> = {};
		const deleted: string[] = [];

		for (const [slug, updateToken] of Object.entries(requestData)) {
			const savedDocument = await loadChatFromDb(slug);
			// already saved
			if (savedDocument) {
				// updateToken is wrong
				if (savedDocument.updateToken !== updateToken) {
					// in this case we just create a new share
					throw new Error(`Wrong update token for chat ${slug}. Cannot delete.`);
				}
				updates[`sharedchats/${slug}`] = null;
				deleted.push(slug);
			}
		}

		if (deleted.length) {
			// delete in firebase
			await update(ref(db), updates);
		}

		return respondToClient({ deleted });
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
