import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';
import { getDocument, OPS, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

// This needs to be changed to a more precise way
GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

export const MAX_ATTACHMENTS_SIZE = 10;

export async function uploadFiles(
	files: FileList,
	toastStore: ToastStore,
	uploadedCount: number
): Promise<ChatContent[]> {
	const remainingSlots = MAX_ATTACHMENTS_SIZE - uploadedCount;
	const filesToUpload = Math.min(files.length, remainingSlots);

	if (filesToUpload <= 0) {
		showToast(
			toastStore,
			`Maximum number of images (${MAX_ATTACHMENTS_SIZE}) already uploaded.`,
			'warning'
		);
		return [];
	}

	const allowedFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

	const newAttachments = await Promise.all(
		Array.from(files)
			.slice(0, filesToUpload)
			.filter((file) => allowedFormats.includes(file.type))
			.map(async (file) => await processFile(file))
	);

	showUploadResult(newAttachments.length, filesToUpload, toastStore);
	return newAttachments;
}

async function processFile(file: File): Promise<ChatContent> {
	try {
		const dataUrl = await readFileAsDataURL(file);
		return {
			type: 'image_url',
			image_url: {
				url: dataUrl,
				detail: 'high' // TODO: make this user configurable
			},
			fileName: file.name
		};
	} catch (error: unknown) {
		if (error instanceof Error) {
			throw new Error(`Failed to process file: ${error.message}`);
		} else {
			throw new Error('Failed to process file: An unknown error occurred');
		}
	}
}

function readFileAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target?.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function showUploadResult(uploadedCount: number, totalCount: number, toastStore: ToastStore) {
	if (uploadedCount !== totalCount) {
		const skippedCount = totalCount - uploadedCount;
		const message =
			skippedCount > 0
				? `Uploaded ${uploadedCount} out of ${totalCount} images. ${skippedCount} file(s) skipped (not images).`
				: `Uploaded ${uploadedCount} out of ${totalCount} images. Maximum limit (${MAX_ATTACHMENTS_SIZE}) reached.`;
		showToast(toastStore, message, 'warning');
	}
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = event => {
			const result = event.target?.result;
			if (result instanceof ArrayBuffer) {
				resolve(result);
			} else {
				reject(new Error("File read did not return an ArrayBuffer."));
			}
		};
		reader.onerror = error => reject(error);
		reader.readAsArrayBuffer(file);
	});
}

async function loadPdf(arrayBuffer: ArrayBuffer) {
	return await getDocument({ data: arrayBuffer }).promise;
}

async function extractTextContent(page: PDFPageProxy) {
	const textContent = await page.getTextContent();
	return textContent.items.map(item => {
		if ('str' in item) {
			return {
				type: 'text',
				content: item.str,
				position: { x: item.transform[4], y: item.transform[5] }
			};
		}
		return null;
	}).filter(Boolean);
}

async function extractImageData(page: PDFPageProxy) {
	const operatorList = await page.getOperatorList();
	const images = [];

	for (let i = 0; i < operatorList.fnArray.length && images.length < MAX_ATTACHMENTS_SIZE; i++) {
		if (operatorList.fnArray[i] === OPS.paintImageXObject) {
			const imageDictionary = operatorList.argsArray[i][0];
			const image = await page.objs.get(imageDictionary);
			const name = image.name;
			const base64Image = null; // convert image to base64
			images.push({
				type: 'image',
				name: name,
				base64: base64Image,

				// positon and image witdh-height same(?)
				position: { x: operatorList.argsArray[i][1], y: operatorList.argsArray[i][2] },
				width: image.width,
				height: image.height
			});
		}
	}

	return images;
}

async function extractPdfContent(arrayBuffer: ArrayBuffer) {
	try {
		const pdfDocument = await loadPdf(arrayBuffer);
		const numPages = pdfDocument.numPages;
		let textResults: any[] = [];
		let imageResults: any[] = [];

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);

			const textContent = await extractTextContent(page);
			const imageData = await extractImageData(page);

			textResults = textResults.concat(textContent);

			imageData.forEach((img, index) => {
				textResults.push({
					type: 'imageData',
					content: `Image ${index + 1} at position (${img.position.x}, ${img.position.y})`,
					position: img.position
				});
			});

			imageResults.push(...imageData.map(img => ({ ...img, label: img.name })));
		}

		// Create a cohesive JSON structure
		const result = {
			textContent: textResults,
			images: imageResults
		};

		return JSON.stringify(result);
	} catch (error) {
		console.error('Error processing PDF:', error);
		return JSON.stringify([{ type: 'error', message: (error as Error).message }]);
	}
}

export async function handleFileExtractionRequest(file: File) {
	const arrayBuffer = await readFileAsArrayBuffer(file);

	if (file.type === 'application/pdf') {
		return await extractPdfContent(arrayBuffer);
	} else {
		return [{ type: 'error', message: 'Unsupported file type' }];
	}
}
