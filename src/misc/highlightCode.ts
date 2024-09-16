import { tick } from 'svelte';
import hljs from 'highlight.js';

export async function highlightCode() {
    // Wait for the DOM to update
    await tick();

    // Select all code blocks that haven't been highlighted yet
    document.querySelectorAll('pre code:not([data-highlighted])').forEach((element) => {
        const block = element as HTMLElement;

        // Extract language class if present
        const languageClass = block.className.split(' ').find((cls) => cls.startsWith('language-'));
        const language = languageClass?.replace('language-', '');

        /**
         * Applies syntax highlighting to the code block
         */
        const highlight = () => {
            try {
                hljs.highlightElement(block);
                block.dataset.highlighted = 'true';
            } catch (error) {
                console.error(`Highlighting failed:`, error);
            }
        };

        // If a supported language is specified, use it for highlighting
        if (language && hljs.getLanguage(language)) {
            highlight();
        } else {
            // If language is not supported or not specified, use auto-detection
            console.warn(`Language ${language ?? 'unspecified'} not supported, using auto-detection.`);

            // Remove the language class if present to allow auto-detection
            if (languageClass) block.classList.remove(languageClass);

            highlight();
        }
    });
}