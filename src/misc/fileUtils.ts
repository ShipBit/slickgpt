import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';
import { getDocument, OPS, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

// TODO: is there a better way to do this?
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const MAX_ATTACHMENTS_SIZE = 10;
const permittedImageFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

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
			fileData: {
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

function showUploadResult(uploadedItems: ChatContent[], totalCount: number, toastStore: ToastStore) {
	const imageAttachments = uploadedItems.filter(item => item.type === 'image_url' && item.fileData?.attachment);
	if (imageAttachments) {
		showToast(toastStore, `Uploaded first ${imageAttachments.length} images (from PDF). Maximum limit (${MAX_ATTACHMENTS_SIZE}) reached`, 'warning');
		return;
	}

	if (uploadedItems.length !== totalCount) {
		const skippedCount = totalCount - uploadedItems.length;
		const message =
			skippedCount > 0
				? `Uploaded ${uploadedItems.length} out of ${totalCount} images. ${skippedCount} image(s) skipped (not supported).`
				: `Uploaded ${uploadedItems.length} out of ${totalCount} images. Maximum limit (${MAX_ATTACHMENTS_SIZE}) reached.`;
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
				// TODO: maybe add a flag to switch between precise (expensive) and default (cheap)?
				content: item.str, //`${item.str} (x: ${item.transform[4]}, y: ${item.transform[5]})`,
				position: { x: item.transform[4], y: item.transform[5] },
			};
		}
		return null;
	}).filter(Boolean);
}

async function extractImageData(page: PDFPageProxy) {
	const operatorList = await page.getOperatorList();
	const { fnArray, argsArray } = operatorList;
	const objs = page.objs;
	const images: ChatContent[] = [];

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
						fileData: {
							position: { x: argsArray[i][1], y: argsArray[i][2] },
							width: imageBitmap.width,
							height: imageBitmap.height,
							attachment: {
								fileAttached: true
							}
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

	return images;
}

async function extractPdfContent(arrayBuffer: ArrayBuffer) {
	try {
		const pdfDocument = await loadPdf(arrayBuffer);
		const numPages = pdfDocument.numPages;
		let images: ChatContent[] = [];
		let combinedTextArray: string[] = [];

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);

			const textContent = await extractTextContent(page);

			if (images.length < MAX_ATTACHMENTS_SIZE) {
				images = await extractImageData(page);
			}

			const combinedContent = textContent.concat(images.map((img, index) => {
				if (!img.fileData?.position) return null;
				return {
					type: 'image',
					content: `[Image ${index + 1} at position (${img.fileData.position.x}, ${img.fileData.position.y})]`,
					position: img.fileData.position
				};
			}).filter(item => item !== null));

			// Sort combined content by y and then x position, but only for images
			combinedContent.sort((a, b) => {
				if (a?.type === 'image' && b?.type === 'image') {
					return a.position.y - b.position.y || a.position.x - b.position.x;
				}
				return 0;
			});

			// Collect all text content into a single array
			combinedTextArray.push(...combinedContent.map(item => item!.content));
		}

		// Create a single ChatContent object with type 'text' for all pages
		const textContentObject: ChatContent = {
			type: 'text',
			text: combinedTextArray.join(' '),
			fileData: {
				attachment: {
					quantity: images.length,
					fileAttached: true
				}
			}
		};

		// Add the single textContentObject to textResults
		const textResults: ChatContent[] = [textContentObject];

		console.log(textResults);
		const result = {
			textResults,
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

	let itemsToNotCount = 0;

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
					if (pdfContent.textResults && pdfContent.images && pdfContent.textResults.length > 0 && pdfContent.images.length > 0) {
						results.push(...pdfContent.textResults, ...pdfContent.images);
						itemsToNotCount++;
					}
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

	showUploadResult(results, filesToUpload, toastStore);

	return results;
}
