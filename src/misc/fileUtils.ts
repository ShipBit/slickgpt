import type { ChatContent } from './shared';
import { readFileAsDataURL, readFileAsText } from './shared';

const permittedImageFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

export const MAX_ATTACHMENTS_SIZE = 10;

export async function processImageFile(file: File): Promise<ChatContent> {
	try {
		const dataUrl = await readFileAsDataURL(file);
		return {
			type: 'image_url',
			image_url: {
				url: dataUrl,
				detail: 'high' // TODO: make this user configurable
			},
			fileData: {
				name: file.name,
			}
		};
	} catch (error) {
		throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
	}
}

export async function extractTextFileContent(file: File): Promise<ChatContent> {
	try {
		const textContent = await readFileAsText(file);
		return {
			type: 'text',
			text: textContent,
			fileData: {
				name: file.name,
				attachment: {
					fileAttached: true
				}
			}
		};
	} catch (error) {
		throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
	}
}

export function isImageFile(file: File): boolean {
	return permittedImageFormats.includes(file.type);
}

export function isTextFile(file: File): boolean {
	const textMimeTypes = ['text/', 'application/json', 'application/xml'];
	const textExtensions = /\.(py|cs|js|ts|java|cpp|c|html|css|txt|json|xml|md|csv|log|ini|yaml|yml|sh|bat|conf|config|properties|sql|r|go|swift|pl|rb|php|asp|aspx|jsp|vue|jsx|tsx)$/i;
	return textMimeTypes.some(mime => file.type.startsWith(mime)) || textExtensions.test(file.name);
}
