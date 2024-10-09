import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';
import { getDocument, OPS, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

// TODO: is there a better way to do this?
GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

export const MAX_ATTACHMENTS_SIZE = 10;
const permittedImageFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];
const images: ChatContent[] = [];

// export async function uploadFiles(
// 	files: FileList,
// 	toastStore: ToastStore,
// 	uploadedCount: number
// ): Promise<ChatContent[]> {
// 	const remainingSlots = MAX_ATTACHMENTS_SIZE - uploadedCount;
// 	const filesToUpload = Math.min(files.length, remainingSlots);

// 	if (filesToUpload <= 0) {
// 		showToast(
// 			toastStore,
// 			`Maximum number of images (${MAX_ATTACHMENTS_SIZE}) already uploaded.`,
// 			'warning'
// 		);
// 		return [];
// 	}

// 	const newAttachments = await Promise.all(
// 		Array.from(files)
// 			.slice(0, filesToUpload)
// 			.filter((file) => allowedFormats.includes(file.type))
// 			.map(async (file) => await processFile(file))
// 	);

// 	showUploadResult(newAttachments.length, filesToUpload, toastStore);
// 	return newAttachments;
// }

async function processFile(file: File): Promise<ChatContent> {
	try {
		const dataUrl = await readFileAsDataURL(file);
		return {
			type: 'image_url',
			image_url: {
				url: dataUrl,
				detail: 'high' // TODO: make this user configurable
			},
			imageData: {
				name: file.name,

			}
		};
	} catch (error) {
		throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
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
				? `Uploaded ${uploadedCount} out of ${totalCount} files. ${skippedCount} file(s) skipped (not supported).`
				: `Uploaded ${uploadedCount} out of ${totalCount} files. Maximum limit (${MAX_ATTACHMENTS_SIZE}) reached.`;
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
	const { fnArray, argsArray } = operatorList;
	const objs = page.objs;

	for (let i = 0; i < fnArray.length && images.length < MAX_ATTACHMENTS_SIZE; i++) {
		if (fnArray[i] === OPS.paintImageXObject) {
			const imageDictionary = argsArray[i][0];
			const imageData = await objs.get(imageDictionary);

			if (imageData?.bitmap instanceof ImageBitmap) {
				const imageBitmap = imageData.bitmap;
				let base64Image: string | null = null;

				if (typeof OffscreenCanvas !== 'undefined') {
					// Use OffscreenCanvas for rendering
					const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
					const context = offscreenCanvas.getContext('2d');

					if (context) {
						context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
						// Transfer the image to a regular canvas to get the data URL
						const canvas = document.createElement('canvas');
						canvas.width = imageBitmap.width;
						canvas.height = imageBitmap.height;
						const mainContext = canvas.getContext('2d');
						if (mainContext) {
							mainContext.drawImage(offscreenCanvas, 0, 0);
							base64Image = canvas.toDataURL();
						}
					}
				} else {
					// Fallback to regular canvas
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');
					canvas.width = imageBitmap.width;
					canvas.height = imageBitmap.height;
					if (context) {
						context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
						base64Image = canvas.toDataURL();
					}
				}

				if (base64Image) {
					images.push({
						type: 'image_url',
						image_url: {
							url: base64Image,
							detail: 'high'
						},
						imageData: {
							position: { x: argsArray[i][1], y: argsArray[i][2] },
							width: imageBitmap.width,
							height: imageBitmap.height
						}
					});
				} else {
					console.warn('Failed to convert image to base64');
				}
			} else {
				console.warn('Image data is missing a valid bitmap:', imageData);
			}
		}
	}
}

async function extractPdfContent(arrayBuffer: ArrayBuffer) {
	try {
		const pdfDocument = await loadPdf(arrayBuffer);
		const numPages = pdfDocument.numPages;
		let textResults: string[] = [];

		// Clear images array for new pdf upload
		images.length = 0;

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);

			const textContent = await extractTextContent(page);

			if (images.length < MAX_ATTACHMENTS_SIZE) {
				await extractImageData(page);
			}

			const combinedContent = textContent.concat(images.map((img, index) => {
				if (!img.imageData?.position) return null; // Filter out images with undefined positions
				return {
					type: 'image',
					content: `[Image ${index + 1} at position (${img.imageData.position.x}, ${img.imageData.position.y})]`,
					position: img.imageData.position
				};
			}).filter(item => item !== null));

			// Sort combined content by y and then x position
			combinedContent.sort((a, b) => a?.position?.y - b?.position?.y || a?.position?.x - b?.position?.x);

			// Join sorted content into textResults
			textResults.push(...combinedContent.map(item => item!.content));
		}

		const result = {
			type: 'content',
			text: textResults.join(' '),
			images
		};

		return result;
	} catch (error) {
		console.error('Error processing PDF:', error);
		return null;
	}
}

export async function handleFileExtractionRequest(files: FileList, toastStore: ToastStore, uploadedCount: number) {
	const results: ChatContent[] = [];
	const remainingSlots = MAX_ATTACHMENTS_SIZE - uploadedCount;
	const filesToUpload = Math.min(files.length, remainingSlots);

	if (filesToUpload <= 0) {
		showToast(
			toastStore,
			`Maximum number of files (${MAX_ATTACHMENTS_SIZE}) already uploaded.`,
			'warning'
		);
		return [];
	}

	await Promise.all(Array.from(files).slice(0, filesToUpload).map(async (file) => {
		const arrayBuffer = await readFileAsArrayBuffer(file);

		switch (file.type) {
			case 'application/pdf':
				const pdfContent = await extractPdfContent(arrayBuffer);
				if (pdfContent) {
					console.log(pdfContent.text);
					results.push(...pdfContent.images);
				}
				break;
			default:
				if (permittedImageFormats.includes(file.type)) {
					try {
						const chatContent = await processFile(file);
						results.push(chatContent);
					} catch (error) {
						// should never happen unless corrupted image
						console.error(error);
					}
				}
				break;
		}
	}));

	showUploadResult(results.length, filesToUpload, toastStore);

	if (results.length === 0) {
		showToast(
			toastStore,
			`No files were processed. Maximum number of files (${MAX_ATTACHMENTS_SIZE}) may have been reached or unsupported file types were provided.`,
			'warning'
		);
	}

	return results;
}
