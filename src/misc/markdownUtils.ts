import markdownIt from 'markdown-it';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { ChatMessage, ChatContent } from '$misc/shared';

interface Delimiter {
    left: string;
    right: string;
    display: boolean;
}

interface MarkdownKatexOptions {
    delimiters: Delimiter[];
}

const defaultOptions: MarkdownKatexOptions = {
    delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
    ]
}

const md = markdownIt({ breaks: true }).use(customLatexRenderer, defaultOptions);

// Modified from: https://github.com/SchneeHertz/markdown-it-katex-gpt/blob/master/index.js
function escapedBracketRule(options: MarkdownKatexOptions) {
    return (state: any, silent: boolean) => {
        const { src, posMax, pos: start } = state;

        for (const { left, right, display } of options.delimiters) {
            if (!src.startsWith(left, start)) continue;

            const contentStart = start + left.length;
            const contentEnd = src.indexOf(right, contentStart);

            if (contentEnd === -1 || contentEnd >= posMax) continue;

            if (!silent) {
                const content = src.slice(contentStart, contentEnd);
                try {
                    const renderedContent = katex.renderToString(content, {
                        throwOnError: false,
                        displayMode: display,
                    });
                    state.push('html_inline', '', 0).content = renderedContent;
                } catch (e) {
                    console.error('KaTeX rendering error:', e);
                }
            }

            state.pos = contentEnd + right.length;
            return true;
        }

        return false;
    };
}

export function customLatexRenderer(md: markdownIt, options: MarkdownKatexOptions = defaultOptions) {
    md.inline.ruler.after('text', 'escaped_bracket', escapedBracketRule(options));
}

export function renderMarkdown(message: ChatMessage): string {
    if (!message.content) {
        return '';
    }

    return Array.isArray(message.content)
        ? renderContentArray(message.content)
        : md.render(message.content);
}

function renderContentArray(contentArray: ChatContent[]): string {
    return contentArray.map(item => {
        switch (item.type) {
            case 'text':
                if (item.fileData?.attachment?.fileAttached)
                    return `<div class="attachment-container border border-surface-300-600-token rounded-lg p-4 shadow-md bg-surface-50 dark:bg-surface-700">
                        <div class="attachment-header flex items-center justify-between mb-2">
                            <span class="attachment-icon bg-accent-500 text-white rounded-full p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 3.5L18.5 9H13V3.5zM6 20V4h7v5h5v11H6z"/>
                                </svg>
                            </span>
                            <span class="file-name font-semibold text-surface-900 dark:text-surface-50 truncate" title="${item.fileData.name}">
                                ${item.fileData.name}
                            </span>
                        </div>
                    </div>`;
                return item.text ? md.render(item.text) : '';
            case 'image_url':
                if (item.image_url?.url && !item.fileData?.attachment?.fileAttached) {
                    const alt = item.fileData?.name || 'Image';
                    return `<img src="${item.image_url.url}" alt="${alt}" class="w-3/5 h-auto my-2 rounded-lg shadow-md" />`;
                }
                return '';
            default:
                console.error(`This should not happen. Unsupported content type: ${item.type}`);
                return '';
        }
    }).join('');
}
