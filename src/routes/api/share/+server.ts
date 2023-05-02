import { error } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { Config } from '@sveltejs/adapter-vercel';
import type { RequestHandler } from './$types';
import { generateSlug } from 'random-word-slugs';
import type { Chat } from '$misc/shared';
import { respondToClient, throwIfUnset, getErrorMessage } from '$misc/error';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'nodejs18.x'
};

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	if (!slug) {
		throw new Error('missing URL param: slug');
	}

	const chat = await prisma.chat.findUnique({
		where: { slug }
	});

	if (!chat) {
		throw error(404, 'Chat not found');
	}
	// never send this to the client!
	chat.updateToken = null;

	return respondToClient(chat);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const requestData = await request.json();
		throwIfUnset('request data', requestData);

		const slug: string = requestData.slug;
		throwIfUnset('slug', slug);

		const chat: Chat = requestData.chat;
		throwIfUnset('chat', chat);

		const upsertChat = await prisma.chat.upsert({
			where: {
				slug,
				updateToken: chat.updateToken || undefined
			},
			update: {
				...chat
			},
			create: {
				...chat,
				slug: generateSlug(),
				updateToken: generateSlug()
			}
		});

		return respondToClient({
			slug,
			updateToken: upsertChat.updateToken
		});
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		// key: slug, value: updateToken
		const requestData = (await request.json()) as { [key: string]: string };
		throwIfUnset('request data', requestData);

		if (!Object.keys(requestData)?.length) {
			throw new Error('No docs to delete provided');
		}

		const chatsToDelete = Object.entries(requestData);
		const unsharedChats = await prisma.chat.deleteMany({
			where: {
				slug: {
					in: chatsToDelete.map(([slug, _updateToken]) => slug)
				},
				updateToken: {
					in: chatsToDelete.map(([_slug, updateToken]) => updateToken)
				}
			}
		});

		return respondToClient({ unshared: unsharedChats.count });
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
