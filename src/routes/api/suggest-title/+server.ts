import type { Config } from '@sveltejs/adapter-vercel';
import type {
	ChatCompletionMessageParam,
	ChatCompletionCreateParamsNonStreaming
} from 'openai/resources/chat/completions';
import type { RequestHandler } from './$types';
import { OpenAiModel, defaultOpenAiSettings, type OpenAiSettings } from '$misc/openai';
import { error } from '@sveltejs/kit';
import { getErrorMessage, respondToClient, throwIfUnset } from '$misc/error';
import { MIDDLEWARE_API_URL, OPENAI_API_URL } from '$env/static/private';

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

		const fixedMessages = [
			// take system, first user and first assisstant message into account
			...messages.slice(0, 3),
			{
				role: 'user',
				content:
					"Suggest a short title for this chat, summarising its content. Take the 'system' message into account and the first prompt from me and your first answer. The title should not be longer than 100 chars. Answer with just the title. Don't use punctuation is the title."
			} as ChatCompletionMessageParam
		];

		const settings: OpenAiSettings = {
			...defaultOpenAiSettings,
			model: OpenAiModel.Gpt35Turbo
		};

		const token: string = requestData.token;
		throwIfUnset('Token', token);

		const mode: 'direct' | 'middleware' = requestData.mode;
		throwIfUnset('mode', mode);

		const completionOpts: ChatCompletionCreateParamsNonStreaming = {
			...settings,
			messages: fixedMessages,
			stream: false
		};

		const apiUrl = mode === 'direct' ? OPENAI_API_URL : MIDDLEWARE_API_URL;

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(completionOpts)
		});

		if (!response.ok) {
			const err = await response.json();
			throw err.error;
		}
		const result = await response.json();
		// strip leading and trailing quotes
		const title = result.choices[0].message.content.replace(/(^['"])|(['"]$)/g, '').trim();

		return respondToClient({ title });
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
