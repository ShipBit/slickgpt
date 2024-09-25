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
                return item.text ? md.render(item.text) : '';
            case 'image_url':
                if (item.image_url?.url) {
                    const alt = item.fileName || 'Image';
                    return `<img src="${item.image_url.url}" alt="${alt}" class="w-3/5 h-auto my-2 rounded-lg shadow-md" />`;
                }
                return '';
            default:
                console.error(`This should not happen. Unsupported content type: ${item.type}`);
                return '';
        }
    }).join('');
}
