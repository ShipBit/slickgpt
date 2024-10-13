import { getDocument, OPS, GlobalWorkerOptions, VerbosityLevel } from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { type ChatContent, showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';

GlobalWorkerOptions.workerSrc ||= '/pdf.worker.min.mjs';

export async function loadPdf(arrayBuffer: ArrayBuffer) {
	return await getDocument({ data: arrayBuffer, verbosity: VerbosityLevel.ERRORS }).promise;
}

export async function extractTextContent(page: PDFPageProxy) {
	const textContent = await page.getTextContent();
	return textContent.items.map(item => {
		if ('str' in item) {
			return {
				type: 'text',
				content: item.str,
				position: { x: item.transform[4], y: item.transform[5] },
			};
		}
		return null;
	}).filter(Boolean);
}

export async function extractImageData(page: PDFPageProxy, imageSlots: number) {
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
				const base64Image = await convertImageBitmapToBase64(imageData.bitmap);

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
							width: imageData.bitmap.width,
							height: imageData.bitmap.height,
							attachment: {
								fileAttached: true
							}
						}
					});
				} else {
					console.log('Duplicate image detected, reusing existing image.');
				}
			} else {
				console.warn('Image data is missing a valid bitmap:', imageData);
			}
		}
	}

	return images;
}

async function convertImageBitmapToBase64(imageBitmap: ImageBitmap): Promise<string> {
	const canvas = typeof OffscreenCanvas !== 'undefined'
		? new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
		: document.createElement('canvas');

	canvas.width = imageBitmap.width;
	canvas.height = imageBitmap.height;
	const context = canvas.getContext('2d');

	if (context) {
		context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
		if (canvas instanceof OffscreenCanvas) {
			const transferCanvas = document.createElement('canvas');
			transferCanvas.width = imageBitmap.width;
			transferCanvas.height = imageBitmap.height;
			const transferContext = transferCanvas.getContext('2d');
			if (transferContext) {
				transferContext.drawImage(canvas, 0, 0);
				return transferCanvas.toDataURL();
			}
		} else {
			return canvas.toDataURL();
		}
	}
	return '';
}

export async function extractPdfContent(arrayBuffer: ArrayBuffer, imageSlots: number, toastStore: ToastStore) {
	try {
		const pdfDocument = await loadPdf(arrayBuffer);

		if (!pdfDocument || pdfDocument.numPages === 0) {
			showToast(toastStore, 'PDF is empty or cannot be processed.', 'error');
			return null;
		}

		const numPages = pdfDocument.numPages;
		let images: ChatContent[] = [];
		let combinedTextArray: string[] = [];

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);

			const textContent = await extractTextContent(page);

			let newImages: ChatContent[] = [];
			if (images.length < imageSlots) {
				newImages = await extractImageData(page, imageSlots - images.length);
				images.push(...newImages);
			}

			const combinedContent = textContent.concat(newImages.map((img, index) => {
				if (!img.fileData?.position) return null;
				return {
					type: 'image',
					content: `[Image ${index + 1} at position (${img.fileData.position.x}, ${img.fileData.position.y})]`,
					position: img.fileData.position
				};
			}).filter(item => item !== null));

			combinedContent.sort((a, b) => {
				if (a?.type === 'image' && b?.type === 'image') {
					return a.position.y - b.position.y || a.position.x - b.position.x;
				} else if (a?.type === 'image') {
					return -1;
				} else if (b?.type === 'image') {
					return 1;
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

		return {
			textResults,
			images
		};
	} catch (error) {
		console.error('Error processing PDF:', error);
		return null;
	}
}
