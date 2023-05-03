import { error } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { Config } from '@sveltejs/adapter-vercel';
import type { RequestHandler } from './$types';
import { generateSlug } from 'random-word-slugs';
import type { Chat } from '$misc/shared';
import type { Chat as PrismaChat } from '@prisma/client';
import { respondToClient, throwIfUnset, getErrorMessage } from '$misc/error';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'nodejs18.x'
};

export const GET: RequestHandler = async ({ url }) => {
	const prisma = new PrismaClient();
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
		const prisma = new PrismaClient();
		const requestData = await request.json();
		throwIfUnset('request data', requestData);

		const slug: string = requestData.slug;
		throwIfUnset('slug', slug);

		const chat: Chat = requestData.chat;
		throwIfUnset('chat', chat);

		const cleanedChat: Partial<PrismaChat> = {
			slug: chat.slug,
			title: chat.title,
			contextMessage: chat.contextMessage
				? {
						id: null,
						role: chat.contextMessage.role,
						content: chat.contextMessage.content,
						name: chat.contextMessage.name,
						messages: []
				  }
				: null,
			settings: chat.settings,
			messages: chat.messages,
			updateToken: chat.updateToken,
			created: chat.created
		};

		console.log('cleaned chat');
		console.log(cleanedChat);

		let sharedChat: PrismaChat | null = null;

		if (!cleanedChat.updateToken) {
			const data = {
				...cleanedChat,
				updateToken: generateSlug()
			} as PrismaChat;

			console.log('No update token. Sharing new chat:');
			console.log(data);
			sharedChat = await prisma.chat.create({ data });
		} else {
			const savedChat = await prisma.chat.findUnique({ where: { slug } });
			console.log('saved chat: ' + savedChat?.slug + ' // ' + savedChat?.updateToken);

			if (savedChat?.updateToken === chat.updateToken) {
				console.log('updating saved chat');
				await prisma.chat.update({
					where: { slug },
					data: { ...cleanedChat }
				});
			} else {
				// wrong update token => share as new
				console.log('Wrong update token. Sharing as new chat');
				sharedChat = await prisma.chat.create({
					data: {
						...(cleanedChat as PrismaChat),
						slug: generateSlug(),
						updateToken: generateSlug()
					}
				});
			}
		}

		console.log('Shared: ');
		console.log(sharedChat);

		return respondToClient({
			slug,
			updateToken: sharedChat?.updateToken || null
		});
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const prisma = new PrismaClient();
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
