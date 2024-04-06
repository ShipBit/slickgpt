import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { Chat, ChatCost } from './shared';
import GPT3Tokenizer from 'gpt3-tokenizer';
import { ChatStorekeeper } from './chatStorekeeper';

// Initialization is slow, so only do it once.
// TypeScript misinterprets the export default class GPT3Tokenizer from gpt3-tokenizer
// and throws "TypeError: GPT3Tokenizer is not a constructor" if we try to call the ctor here.
// Therefore, we initialize the tokenizer in the first call to countTokens().
let tokenizer: GPT3Tokenizer;

export enum OpenAiModel {
	Gpt35Turbo = 'gpt-3.5-turbo',
	Gpt4 = 'gpt-4',
	Gpt432k = 'gpt-4-32k',
	Gpt41106preview = 'gpt-4-1106-preview',
	Gpt4Turbo = 'gpt-4-turbo-preview'
}

export interface OpenAiSettings {
	model: OpenAiModel;
	max_tokens: number; // just for completions
	temperature: number; // 0-2
	top_p: number; // 0-1
	stop?: string | string[]; // max 4 entries in array
}

export const defaultOpenAiSettings: OpenAiSettings = {
	model: OpenAiModel.Gpt35Turbo,
	max_tokens: 4072, // Manually adjusted
	temperature: 1,
	top_p: 1
};

export interface OpenAiModelStats {
	maxTokens: number; // The max tokens you allow GPT to respond with
	contextWindow: number; // The max tokens an AI model can handle.
	// $ per 1k tokens, see https://openai.com/pricing:
	costPrompt: number;
	costCompletion: number;
	middlewareDeploymentName?: string;
	hidden?: boolean;
}

export const models: { [key in OpenAiModel]: OpenAiModelStats } = {
	[OpenAiModel.Gpt35Turbo]: {
		maxTokens: 4096,
		contextWindow: 16384,
		costPrompt: 0.0005,
		costCompletion: 0.0015,
		middlewareDeploymentName: 'gpt-35-turbo'
	},
	[OpenAiModel.Gpt4]: {
		maxTokens: 4096,
		contextWindow: 8192,
		costPrompt: 0.03,
		costCompletion: 0.06
	},
	[OpenAiModel.Gpt432k]: {
		maxTokens: 4096,
		contextWindow: 32768,
		costPrompt: 0.06,
		costCompletion: 0.12
	},
	[OpenAiModel.Gpt4Turbo]: {
		maxTokens: 4096,
		contextWindow: 128000,
		costPrompt: 0.01,
		costCompletion: 0.03,
		middlewareDeploymentName: 'gpt-4-turbo'
	},
	// deprecated, only here for backwards compatibility
	[OpenAiModel.Gpt41106preview]: {
		maxTokens: 4096,
		contextWindow: 128000,
		costPrompt: 0.01,
		costCompletion: 0.03,
		hidden: true
	}
};
/**
 * see https://platform.openai.com/docs/guides/chat/introduction > Deep Dive Expander
 * see https://github.com/syonfox/GPT-3-Encoder/issues/2
 */
export function countTokens(message: ChatCompletionMessageParam): number {
	// see comment above
	if (!tokenizer) {
		tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
	}

	let num_tokens = 4; // every message follows <im_start>{role/name}\n{content}<im_end>\n
	for (const [key, value] of Object.entries(message)) {
		if (key !== 'name' && key !== 'role' && key !== 'content') {
			continue;
		}
		const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(value);
		num_tokens += encoded.text.length;
		if (key === 'name') {
			num_tokens--; // if there's a name, the role is omitted
		}
	}

	return num_tokens;
}

export function estimateChatCost(chat: Chat): ChatCost {
	let tokensPrompt = 0;
	let tokensCompletion = 0;

	const messages = ChatStorekeeper.getCurrentMessageBranch(chat);

	for (const message of messages) {
		if (message.role === 'assistant') {
			tokensCompletion += countTokens(message);
		} else {
			// context counts as prompt (I think...)
			tokensPrompt += countTokens(message);
		}
	}

	// see https://platform.openai.com/docs/guides/chat/introduction > Deep Dive Expander
	const tokensTotal = tokensPrompt + tokensCompletion + 2; // every reply is primed with <im_start>assistant
	const {
		contextWindow,
		costPrompt: costPromptPer1k,
		costCompletion: costCompletionPer1k
	} = models[chat.settings.model];
	const costPrompt = (costPromptPer1k / 1000.0) * tokensPrompt;
	const costCompletion = (costCompletionPer1k / 1000.0) * tokensCompletion;

	return {
		tokensPrompt,
		tokensCompletion,
		tokensTotal: tokensTotal,
		costPrompt,
		costCompletion,
		costTotal: costPrompt + costCompletion,
		maxTokensForModel: contextWindow
	};
}
