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
import { MODERATION } from '$env/static/private';

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

		const openAiKey: string = requestData.openAiKey;
		throwIfUnset('OpenAI API key', openAiKey);

		if (MODERATION === 'true') {
			// Handle moderation
			const moderationUrl = 'https://api.openai.com/v1/moderations';

			const textMessages = messages.map((msg) => msg.content);

			const moderationResponse = await fetch(moderationUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${openAiKey}`
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

		const apiUrl = 'https://api.openai.com/v1/chat/completions';

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${openAiKey}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(completionOpts)
		});

		if (!response.ok) {
			const err = await response.json();
			throw err.error;
		}

		return new Response(response.body, {
			headers: {
				'Content-Type': 'text/event-stream'
			}
		});
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
