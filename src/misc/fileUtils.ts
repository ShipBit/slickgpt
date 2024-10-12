import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';
import { getDocument, OPS, GlobalWorkerOptions, VerbosityLevel } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const MAX_ATTACHMENTS_SIZE = 10;
const permittedImageFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

async function processImageFile(file: File): Promise<ChatContent> {
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
	const pdfImageAttachments = uploadedItems.filter(item => item.type === 'image_url' && item.fileData?.attachment?.fileAttached);
	const pdfImageCount = pdfImageAttachments.length;

	if (pdfImageCount > 0) {
		showToast(toastStore,
			`Uploaded ${pdfImageCount} images from PDF. ${pdfImageCount >= MAX_ATTACHMENTS_SIZE ? `Maximum limit (${MAX_ATTACHMENTS_SIZE}) of images reached.` : ''}`,
			pdfImageCount >= MAX_ATTACHMENTS_SIZE ? 'warning' : 'success');
	}
	
	const skippedCount = totalCount - uploadedItems.length;
	if (skippedCount > 0) {
		showToast(toastStore, `${skippedCount} files skipped (not supported or image limit reached).`, 'warning');
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
	return await getDocument({ data: arrayBuffer, verbosity: VerbosityLevel.ERRORS }).promise;
}

async function extractTextContent(page: PDFPageProxy) {
	const textContent = await page.getTextContent();
	return textContent.items.map(item => {
		if ('str' in item) {
			return {
				type: 'text',
				// TODO: maybe add a flag to switch between precise and default?
				content: item.str, //`${item.str} (x: ${item.transform[4]}, y: ${item.transform[5]})`,
				position: { x: item.transform[4], y: item.transform[5] },
			};
		}
		return null;
	}).filter(Boolean);
}

async function extractImageData(page: PDFPageProxy, imageSlots: number) {
	const uniqueImages = new Set<string>();

	const operatorList = await page.getOperatorList();
	const { fnArray, argsArray } = operatorList;
	const objs = page.objs;
	const commonObjs = page.commonObjs;
	const images: ChatContent[] = [];

	for (let i = 0; i < fnArray.length && images.length < imageSlots; i++) {
		if (fnArray[i] === OPS.paintImageXObject) {
			const imageDictionary = argsArray[i][0];

			const imageData = imageDictionary.startsWith('g_')
				? await new Promise(resolve => commonObjs.get(imageDictionary, resolve))
				: await new Promise(resolve => objs.get(imageDictionary, resolve));

			if (imageData && typeof imageData === 'object' && 'bitmap' in imageData && imageData.bitmap instanceof ImageBitmap) {
				const imageBitmap = imageData.bitmap;
				let base64Image: string | null = null;

				// Use OffscreenCanvas if available for better performance
				if (typeof OffscreenCanvas !== 'undefined') {
					const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
					const context = offscreenCanvas.getContext('2d');
					if (context) {
						context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
						// OffscreenCanvas does not support toDataURL, so we transfer to a regular canvas
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
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');
					canvas.width = imageBitmap.width;
					canvas.height = imageBitmap.height;
					if (context) {
						context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
						base64Image = canvas.toDataURL();
					}
				}

				if (base64Image && !uniqueImages.has(base64Image)) {
					uniqueImages.add(base64Image);
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
					console.warn('Duplicate image detected, reusing existing image.');
				}
			} else {
				console.warn('Image data is missing a valid bitmap:', imageData);
			}
		}
	}

	return images;
}

async function extractPdfContent(arrayBuffer: ArrayBuffer, imageSlots: number) {
	try {
		const pdfDocument = await loadPdf(arrayBuffer);
		const numPages = pdfDocument.numPages;
		let images: ChatContent[] = [];
		let combinedTextArray: string[] = [];

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);

			const textContent = await extractTextContent(page);

			if (images.length < imageSlots) {
				const extractedImages = await extractImageData(page, imageSlots - images.length);
				images.push(...extractedImages);
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

			combinedTextArray.push(`Page ${i}:`, ...combinedContent.map(item => item!.content));
		}

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

		const textResults: ChatContent[] = [textContentObject];

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

export async function handleFileExtractionRequest(files: FileList, toastStore: ToastStore, uploadedImageCount: number) {
	const results: ChatContent[] = [];
	let currentImageCount = uploadedImageCount;
	const isImageFile = (file: File) => permittedImageFormats.includes(file.type);

	if (Array.from(files).some(isImageFile) && (uploadedImageCount >= MAX_ATTACHMENTS_SIZE)) {
		showToast(
			toastStore,
			'Image file(s) detected. You have reached the maximum limit for image uploads.',
			'warning'
		);
		return [];
	}

	await Promise.all(Array.from(files).map(async (file) => {
		const arrayBuffer = await readFileAsArrayBuffer(file);

		switch (file.type) {
			case 'application/pdf':
				// Only process images in PDF if the image limit hasn't been reached
				const availableImageSlots = MAX_ATTACHMENTS_SIZE - currentImageCount;
				const pdfContent = await extractPdfContent(arrayBuffer, availableImageSlots);
				if (pdfContent) {
					pdfContent.textResults.forEach(item => {
						if (item.fileData) {
							item.fileData.name = file.name;
						}
					});
					if (pdfContent.textResults.length > 0) {
						results.push(...pdfContent.textResults);
					}
					if (pdfContent.images.length > 0 && availableImageSlots > 0) {
						currentImageCount += pdfContent.images.length;
						results.push(...pdfContent.images);
					}
				}
				break;
			default:
				if (permittedImageFormats.includes(file.type)) {
					if (currentImageCount < MAX_ATTACHMENTS_SIZE) {
						try {
							console.log(`Processing image file: ${file.name}`);
							currentImageCount++;
							const chatContent = await processImageFile(file);
							results.push(chatContent);
							console.log(`Successfully processed image file: ${file.name}`);
						} catch (error) {
							console.error(`Error processing image file ${file.name}:`, error);
							showToast(toastStore, `Failed to process image file: ${file.name}`, 'error');
						}
					}
				} else {
					console.warn(`Unsupported file type: ${file.type}`);
				}
				break;
		}
	}));

	showUploadResult(results, files.length, toastStore);

	return results;
}
