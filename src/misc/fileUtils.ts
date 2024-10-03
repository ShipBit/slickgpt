import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';

const MAX_ATTACHMENTS = 10;

export async function uploadFiles(
	files: FileList,
	toastStore: ToastStore,
	uploadedCount: number
): Promise<ChatContent[]> {
	const remainingSlots = MAX_ATTACHMENTS - uploadedCount;
	const filesToUpload = Math.min(files.length, remainingSlots);

	if (filesToUpload <= 0) {
		showToast(
			toastStore,
			`Maximum number of images (${MAX_ATTACHMENTS}) already uploaded.`,
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
				: `Uploaded ${uploadedCount} out of ${totalCount} images. Maximum limit (${MAX_ATTACHMENTS}) reached.`;
		showToast(toastStore, message, 'warning');
	}
}
