import { Mutex } from 'async-mutex';
import type { ToastStore } from '@skeletonlabs/skeleton';
import { processImageFile, extractTextFileContent, isImageFile, isTextFile, MAX_ATTACHMENTS_SIZE } from './fileUtils';
import { extractPdfContent } from './pdfUtils';
import { readFileAsArrayBuffer, showToast, type ChatContent } from './shared';

function showUploadResult(uploadedItems: ChatContent[], totalCount: number, toastStore: ToastStore) {
	const pdfImageAttachments = uploadedItems.filter(item => item.type === 'image_url' && item.fileData?.attachment?.fileAttached);
	const pdfImageCount = pdfImageAttachments.length;

	if (pdfImageCount > 0) {
		showToast(
			toastStore,
			`Uploaded ${pdfImageCount} images from PDF. ${pdfImageCount >= MAX_ATTACHMENTS_SIZE ? `Maximum limit (${MAX_ATTACHMENTS_SIZE}) of images reached.` : ''}`,
			pdfImageCount >= MAX_ATTACHMENTS_SIZE ? 'warning' : 'success'
		);
	}

	const skippedCount = totalCount - uploadedItems.length;
	if (skippedCount > 0) {
		const message = `${skippedCount} files skipped. ${uploadedItems.length >= MAX_ATTACHMENTS_SIZE ? 'Image limit reached.' : ''}`.trim();
		showToast(toastStore, message, 'warning');
	}
}

export async function handleFileExtractionRequest(files: FileList, toastStore: ToastStore, uploadedImageCount: number) {
	const results: ChatContent[] = [];
	let currentImageCount = uploadedImageCount;
	let filesCount = files.length;
	const lock = new Mutex();
	
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
		if (arrayBuffer.byteLength === 0) {
			showToast(toastStore, `Failed to read file: ${file.name}`, 'error');
			return;
		}

		switch (true) {
			case file.type === 'application/pdf':
				const pdfContent = await extractPdfContent(arrayBuffer, MAX_ATTACHMENTS_SIZE, toastStore);
				if (pdfContent) {
					pdfContent.textResults.forEach(item => {
						if (item.fileData) {
							item.fileData.name = file.name;
							item.text = `{BEGINNING OF ${file.name}}\n${item.text}\n{END OF ${file.name}}`;
						}
					});
					if (pdfContent.textResults.length > 0) {
						results.push(...pdfContent.textResults);
					}
					if (pdfContent.images.length > 0) {
						await lock.runExclusive(() => {
							const availableSlots = MAX_ATTACHMENTS_SIZE - currentImageCount;
							const imagesToAdd = pdfContent.images.slice(0, availableSlots);
							currentImageCount += imagesToAdd.length;
							results.push(...imagesToAdd);
						});
					}
				}
				break;
			case isImageFile(file):
				if (currentImageCount < MAX_ATTACHMENTS_SIZE) {
					try {
						await lock.runExclusive(() => {
							currentImageCount++;
						});
						const chatContent = await processImageFile(file);
						results.push(chatContent);
					} catch (error) {
						showToast(toastStore, `Failed to process image file: ${file.name}`, 'error');
					}
				}
				break;
			case isTextFile(file):
				try {
					const textContent = await extractTextFileContent(file);
					textContent.text = `{BEGINNING OF ${file.name}}\n${textContent.text}\n{END OF ${file.name}}`;
					results.push(textContent);
				} catch (error) {
					showToast(toastStore, `Failed to process text file: ${file.name}`, 'error');
				}
				break;
			default:
				filesCount--;
				showToast(toastStore, `Unsupported file type: ${file.name}`, 'warning');
				break;
		}
	}));

	showUploadResult(results, filesCount, toastStore);

	return results;
}
