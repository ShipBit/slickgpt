import { handleFiles } from './fileUtils';
import type { ToastStore } from '@skeletonlabs/skeleton';
import type { ChatContent } from './shared';

export function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.types.includes('Files')) {
        return true;
    }
    return false;
}

export function handleDragLeave(event: DragEvent, element: HTMLElement) {
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    if (
        rect &&
        (event.clientX <= rect.left ||
            event.clientX >= rect.right ||
            event.clientY <= rect.top ||
            event.clientY >= rect.bottom)
    ) {
        return false;
    }
    return true;
}

export function handlePaste(event: ClipboardEvent, toastStore: ToastStore, uploadedCount: number): Promise<ChatContent[]> {
    const items = event.clipboardData?.items;
    if (!items) return Promise.resolve([]);

    const imageFiles = Array.from(items)
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

    if (imageFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((file) => dataTransfer.items.add(file));
        event.preventDefault(); 
        return handleFiles(dataTransfer.files, toastStore, uploadedCount);
    }
    return Promise.resolve([]);
}
