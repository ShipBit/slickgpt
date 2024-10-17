import type { ChatContent } from './shared';
import { getFileDataURLWithDimensions, readFileAsText } from './shared';

export const permittedImageFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

// most of the common plain text files (user can still upload plain text file as it's checked differently)
export const permittedDocumentTypes = [
	"application/pdf",
	"application/json",
	"application/xml",
	"application/javascript",
	"application/x-yaml",
	"application/x-sh",
	"application/x-bat",
	"application/x-csh",
	"application/x-perl",
	"application/x-php",
	"application/x-ruby",
	"application/x-sql",
	"application/x-java-source",
	"application/x-c",
	"application/x-c++",
	"application/x-python",
	"application/x-shellscript",
	"application/x-markdown",
	"application/x-latex",
	"application/x-tex",
	"application/x-ini",
	"application/x-log",
	"application/x-properties",
	"application/x-yml",
	"application/x-toml",
	"application/x-csv",
	"application/x-html",
	"application/x-css",
	"application/x-md",
	"application/x-conf",
	"application/x-config",
	"application/x-r",
	"application/x-go",
	"application/x-swift",
	"application/x-pl",
	"application/x-rb",
	"application/x-asp",
	"application/x-aspx",
	"application/x-jsp",
	"application/x-vue",
	"application/x-jsx",
	"application/x-tsx",
	"text/*"
]

export const MAX_ATTACHMENTS_SIZE = 10;

export async function processImageFile(file: File): Promise<ChatContent> {
	try {
		const imageData = await getFileDataURLWithDimensions(file);
		return {
			type: 'image_url',
			image_url: {
				url: imageData.dataUrl,
				detail: 'high' // TODO: make this user configurable
			},
			fileData: {
				name: file.name,
				width: imageData.width,
				height: imageData.height
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

export async function isTextFile(file: File): Promise<boolean> {
	return await isPlainTextFileContent(file);
}

// Function to check if a buffer contains only plain text
const isPlainTextContent = (buffer: ArrayBuffer): boolean => {
	const textDecoder = new TextDecoder('utf-8');
	const text = textDecoder.decode(buffer);
	for (let i = 0; i < text.length; i++) {
		const charCode = text.charCodeAt(i);
		if (charCode > 127 && (charCode < 0x80 || charCode > 0xBF)) {
			return false; // Non-ASCII, non-UTF-8 character found
		}
	}
	return true;
};

// Function to check if a file is plain text by analyzing its content
const isPlainTextFileContent = async (file: File): Promise<boolean> => {
	try {
		const buffer = await file.arrayBuffer();
		return isPlainTextContent(buffer);
	} catch (error) {
		console.error('Error reading file content:', error);
		return false;
	}
};