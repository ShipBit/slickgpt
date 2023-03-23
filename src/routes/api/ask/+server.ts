import type { Config } from '@sveltejs/adapter-vercel';
import type { ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import type { RequestHandler } from './$types';
import type { OpenAiSettings } from '$misc/openai';
import { error } from '@sveltejs/kit';
import { getErrorMessage, throwIfUnset } from '$misc/error';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'edge'
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const requestData = await request.json();
		throwIfUnset('request data', requestData);

		const messages: ChatCompletionRequestMessage[] = requestData.messages;
		throwIfUnset('messages', messages);

		const settings: OpenAiSettings = requestData.settings;
		throwIfUnset('settings', settings);

		const openAiKey: string = requestData.openAiKey;
		throwIfUnset('OpenAI API key', openAiKey);

		const completionOpts: CreateChatCompletionRequest = {
			...settings,
			messages,
			stream: true
		};

		// We'll disable the old API for now as it handles stuff quite differently..
		// OpenAI will probably make old models available for the new API soon.
		//
		// const apiUrl =
		// 	settings.model === OpenAiModel.Gpt35Turbo
		// 		? 'https://api.openai.com/v1/chat/completions'
		// 		: 'https://api.openai.com/v1/completions';
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
