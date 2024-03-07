import type { Config } from '@sveltejs/adapter-vercel';
import type {
	ChatCompletionMessageParam,
	ChatCompletionCreateParamsStreaming
} from 'openai/resources/chat/completions';

import type { Moderation } from 'openai/resources/moderations';
import type { RequestHandler } from './$types';
import type { OpenAiSettings } from '$misc/openai';
import { error } from '@sveltejs/kit';
import { getErrorMessage, throwIfUnset } from '$misc/error';
import { MODERATION, OPENAI_API_URL, MIDDLEWARE_API_URL } from '$env/static/private';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'edge'
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const requestData = await request.json();
		throwIfUnset('request data', requestData);

		const messages: ChatCompletionMessageParam[] = requestData.messages;
		throwIfUnset('messages', messages);

		const settings: OpenAiSettings = requestData.settings;
		throwIfUnset('settings', settings);

		const token: string = requestData.token;
		throwIfUnset('token', token);

		const mode: 'direct' | 'middleware' = requestData.mode;
		throwIfUnset('mode', mode);

		// TODO: Disabled for middleware for now
		if (mode === 'direct' && MODERATION === 'true') {
			// Handle moderation
			const moderationUrl = 'https://api.openai.com/v1/moderations';

			const textMessages = messages.map((msg) => msg.content);

			const moderationResponse = await fetch(moderationUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ input: textMessages })
			});

			if (!moderationResponse.ok) {
				const err = await moderationResponse.json();
				throw new Error(err.error);
			}

			const moderationJson = await moderationResponse.json();

			moderationJson.results.forEach((result: Moderation, index: number) => {
				if (result.flagged) {
					throw new Error(`Message ${index + 1} is globally flagged for moderation.`);
				}

				for (const [category, flagged] of Object.entries(result.categories)) {
					if (flagged) {
						throw new Error(`Message ${index + 1} is flagged for ${category}.`);
					}
				}
			});
		}

		const completionOpts: ChatCompletionCreateParamsStreaming = {
			...settings,
			messages,
			stream: true
		};

		const apiUrl = mode === 'direct' ? OPENAI_API_URL : MIDDLEWARE_API_URL;

		let body = completionOpts;
		// TODO: Our API does not support the additional settings (yet)
		if (mode === 'middleware') {
			body = {
				messages,
				stream: true,
				model: 'gpt-4-turbo-preview' // settings.model
			};
		}

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const err = await response.json();
			throw err.error;
		}

		return response;
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
