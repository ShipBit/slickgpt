import type { ChatContent } from './shared';
import { showToast } from './shared';
import type { ToastStore } from '@skeletonlabs/skeleton';

const MAX_ATTACHMENTS = 10;

export function handleFiles(files: FileList, toastStore: ToastStore, uploadedCount: number): Promise<ChatContent[]> {
    const remainingSlots = MAX_ATTACHMENTS - uploadedCount;
    const filesToUpload = Math.min(files.length, remainingSlots);
    
    if (filesToUpload <= 0) {
        showToast(
            toastStore,
            `Maximum number of images (${MAX_ATTACHMENTS}) already uploaded.`,
            'warning'
        );
        return Promise.resolve([]);
    }

    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/png'];

    const newAttachments = Array.from(files)
        .slice(0, filesToUpload)
        .filter((file) => allowedFormats.includes(file.type))
        .map((file) => processFile(file));

    return Promise.all(newAttachments).then((validAttachments) => {
        showUploadResult(validAttachments.length, filesToUpload, toastStore);
        return validAttachments;
    });
}

function processFile(file: File): Promise<ChatContent> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve({
                type: 'image_url',
                image_url: {
                    url: e.target?.result as string,
                    detail: 'high' // TODO: make this user configurable
                },
                fileName: file.name
            });
        };
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
