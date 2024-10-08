import type { Chat, ChatCost, ChatMessage } from './shared';
import { encodingForModel } from 'js-tiktoken';
import { ChatStorekeeper } from './chatStorekeeper';

// Initialization is slow, so only do it once.
const tokenizer = encodingForModel('gpt-4-turbo');

export enum AiProvider {
	OpenAi = 'OpenAI',
	Mistral = 'Mistral',
	Meta = 'Meta'
}

export enum AiModel {
	Gpt35Turbo = 'gpt-3.5-turbo',
	Gpt4o = 'gpt-4o',
	Gpt4oMini = 'gpt-4o-mini',
	Gpt4 = 'gpt-4',
	Gpt432k = 'gpt-4-32k',
	Gpt41106preview = 'gpt-4-1106-preview',
	Gpt4Turbo = 'gpt-4-turbo',
	Gpt4TurboPreview = 'gpt-4-turbo-preview',
	MistralLarge = 'mistral-large-latest',
	Llama38b = 'llama3-8b-8192',
	Llama370b = 'llama3-70b-8192'
}

export interface AiSettings {
	model: AiModel;
	max_tokens: number; // just for completions
	temperature: number; // 0-2
	top_p: number; // 0-1
	stop?: string | string[]; // max 4 entries in array
}

export const defaultOpenAiSettings: AiSettings = {
	model: AiModel.Gpt4oMini,
	max_tokens: 4072, // Manually adjusted
	temperature: 1,
	top_p: 1
};

export interface AiModelStats {
	provider: AiProvider;
	maxTokens: number; // The max tokens you allow GPT to respond with
	contextWindow: number; // The max tokens an AI model can handle.
	costInput: number; // $ per 1M tokens, see https://openai.com/pricing:
	costOutput: number; // $ per 1M tokens, see https://openai.com/pricing:
	middlewareDeploymentName?: string; // the "Azure" model
	hidden?: boolean;
}

export const models: Record<AiModel, AiModelStats> = {
	[AiModel.Gpt35Turbo]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 16384,
		costInput: 0.5,
		costOutput: 1.5,
		middlewareDeploymentName: 'gpt-35-turbo'
	},
	[AiModel.Gpt4Turbo]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 128000,
		costInput: 10,
		costOutput: 30,
		middlewareDeploymentName: 'gpt-4-turbo'
	},
	[AiModel.Gpt4o]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 128000,
		costInput: 5,
		costOutput: 15
	},
	[AiModel.Gpt4oMini]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 128000,
		costInput: 0.15,
		costOutput: 0.6
	},
	[AiModel.MistralLarge]: {
		provider: AiProvider.Mistral,
		maxTokens: 4096,
		contextWindow: 32768,
		costInput: 8,
		costOutput: 24,
		middlewareDeploymentName: 'mistral-large'
	},
	[AiModel.Llama38b]: {
		provider: AiProvider.Meta,
		maxTokens: 8192,
		contextWindow: 8192,
		costInput: 0.05,
		costOutput: 0.1,
		middlewareDeploymentName: 'llama3-8b'
	},
	[AiModel.Llama370b]: {
		provider: AiProvider.Meta,
		maxTokens: 8192,
		contextWindow: 8192,
		costInput: 0.59,
		costOutput: 0.79,
		middlewareDeploymentName: 'llama3-70b'
	},
	// deprecated, only here for backwards compatibility
	[AiModel.Gpt4TurboPreview]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 128000,
		costInput: 10,
		costOutput: 30,
		middlewareDeploymentName: 'gpt-4-turbo',
		hidden: true
	},
	[AiModel.Gpt41106preview]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 128000,
		costInput: 10,
		costOutput: 30,
		hidden: true
	},
	[AiModel.Gpt4]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 8192,
		costInput: 30,
		costOutput: 60
	},
	[AiModel.Gpt432k]: {
		provider: AiProvider.OpenAi,
		maxTokens: 4096,
		contextWindow: 32768,
		costInput: 60,
		costOutput: 120,
		hidden: true
	}
};

export const providers: AiProvider[] = [AiProvider.OpenAi, AiProvider.Mistral, AiProvider.Meta];

/**
 * see https://platform.openai.com/docs/guides/chat/introduction > Deep Dive Expander
 * see https://platform.openai.com/docs/guides/vision/calculating-costs > Calculating costs
 */
export function countTokens(message: ChatMessage): number {
	// Initial token count to account for the message structure
	// <im_start>{role/name}\n{content}<im_end>\n
	let num_tokens = 4;

	// Process content, which can now be an array of ChatContent
	if (Array.isArray(message.content)) {
		for (const contentItem of message.content) {
			if (contentItem.type === 'text' && contentItem.text) {
				// Encoding the text content and adding the token count
				num_tokens += tokenizer.encode(contentItem.text).length;
			} else if (contentItem.type === 'image_url' && contentItem.image_url) {
				const { width, height } = getImageDimensions(contentItem.image_url.url);
				// Process image content based on detail level
				if (contentItem.image_url.detail === 'low') {
					// Low detail images have a fixed token cost of 85 tokens
					num_tokens += 85;
				} else if (contentItem.image_url.detail === 'high') {
					// Scale image to fit within 2048 x 2048
					const scaled = scaleImageToFit2048(width, height);
					// Further scale image so shortest side is 768px
					const finalScaled = scaleImageShortestSideTo768(scaled.width, scaled.height);
					// Calculate the number of 512px tiles
					const numTiles = Math.ceil(finalScaled.width / 512) * Math.ceil(finalScaled.height / 512);
					// Calculate total token cost for the image
					// Each 512px square costs 170 tokens, plus an additional base cost of 85 tokens
					num_tokens += 170 * numTiles + 85;
				}
			}
		}
	} else if (typeof message.content === 'string') {
		// Backward compatibility: if content is a string, encode it and add its token length
		num_tokens += tokenizer.encode(message.content).length;
	}

	// If a name is present, it replaces the role. Otherwise, the role is processed.
	num_tokens += message.name ? tokenizer.encode(message.name).length : tokenizer.encode(message.role || '').length;

	return num_tokens;
}

function getImageDimensions(image_url: string): { width: number; height: number } {
	const img = new Image();
	img.src = image_url;
	return { width: img.width, height: img.height };
}

function scaleImageToFit2048(width: number, height: number): { width: number; height: number } {
	if (width > 2048 || height > 2048) {
		const scale = 2048 / Math.max(width, height);
		return { width: Math.round(width * scale), height: Math.round(height * scale) };
	}
	return { width, height };
}

function scaleImageShortestSideTo768(width: number, height: number): { width: number; height: number } {
	const shortestSide = Math.min(width, height);
	const scale = 768 / shortestSide;
	return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function modelExists(modelName: AiModel): boolean {
	return modelName in models;
}

export function estimateChatCost(chat: Chat): ChatCost {
	let tokensPrompt = 0;
	let tokensCompletion = 0;

	const messages = ChatStorekeeper.getCurrentMessageBranch(chat);

	for (const message of messages) {
		const tokens = countTokens(message);
		if (message.role === 'assistant') {
			tokensCompletion += tokens;
		} else {
			tokensPrompt += tokens;
		}
	}

	// see https://platform.openai.com/docs/guides/chat/introduction > Deep Dive Expander
	const tokensTotal = tokensPrompt + tokensCompletion + 2; // every reply is primed with <im_start>assistant
	const { contextWindow, costInput, costOutput } = models[chat.settings.model];
	const costPrompt = (costInput / 1_000_000) * tokensPrompt;
	const costCompletion = (costOutput / 1_000_000) * tokensCompletion;

	return {
		tokensPrompt,
		tokensCompletion,
		tokensTotal,
		costPrompt,
		costCompletion,
		costTotal: costPrompt + costCompletion,
		maxTokensForModel: contextWindow
	};
}

export function getProviderForModel(model: AiModel): AiProvider {
	if (model in models && models[model] && models[model].provider) {
		return models[model].provider;
	}

	// default
	return AiProvider.OpenAi;
}

export function getDefaultModelForProvider(provider: AiProvider): AiModel {
	return (Object.keys(models) as AiModel[]).find(key => models[key].provider === provider)!;
}