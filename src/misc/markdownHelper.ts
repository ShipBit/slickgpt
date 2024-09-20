import markdownIt from 'markdown-it';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { ChatMessage } from '$misc/shared';

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
    // @ts-expect-error
    return (state, silent: boolean) => {
        const max = state.posMax;
        const start = state.pos;

        for (const { left, right, display } of options.delimiters) {
            // Check if it starts with the left delimiter
            if (!state.src.slice(start).startsWith(left)) continue;

            // Skip the length of the left delimiter
            let pos = start + left.length;

            // Find the matching right delimiter
            while (pos < max) {
                if (state.src.slice(pos).startsWith(right)) {
                    break;
                }
                pos++;
            }

            // If no matching right delimiter is found, skip to the next match
            if (pos >= max) continue;

            // If not silent mode, convert LaTeX to MathML
            if (!silent) {
                const content = state.src.slice(start + left.length, pos);
                try {
                    const renderedContent = katex.renderToString(content, {
                        throwOnError: false,
                        displayMode: display,
                    });
                    const token = state.push('html_inline', '', 0);
                    token.content = renderedContent;
                } catch (e) {
                    console.error(e);
                }
            }

            // Update the position, skipping the length of the right delimiter
            state.pos = pos + right.length;
            return true;
        }

        return false;
    };
}

export function containsMarkdownCodeBlock(input: string): boolean {
    const oneTickCodeBlockRegex = /`[^`]*`/;
    const threeTicksCodeBlockRegex = /```[\s\S]*?```/;

    return oneTickCodeBlockRegex.test(input) || threeTicksCodeBlockRegex.test(input);
}

export function closeOpenedCodeTicks(input: string) {
    const oneTickMatches = input.match(/(?<!`)`(?!`)/g) || [];
    const threeTickMatches = input.match(/(?<!``)```(?!``)/g) || [];

    if (oneTickMatches.length % 2 !== 0) {
        input += '`';
    }

    if (threeTickMatches.length % 2 !== 0) {
        input += '\n```';
    }

    return input;
}

export function customLatexRenderer(md: markdownIt, options: MarkdownKatexOptions = defaultOptions) {
    md.inline.ruler.after('text', 'escaped_bracket', escapedBracketRule(options));
}

export function renderMarkdown(message: ChatMessage): string {
    const content = Array.isArray(message.content)
        ? renderContentArray(message.content)
        : md.render(message.content);

    return formatContent(content);
}

function renderContentArray(contentArray: Array<{ type: string; text?: string; image_url?: { url: string }; fileName?: string }>): string {
    return contentArray.map(item => {
        if (item.type === 'text' && item.text) {
            return md.render(item.text);
        } else if (item.type === 'image_url' && item.image_url) {
            return `<img src="${item.image_url.url}" alt="${item.fileName || ''}" width="60%" height="auto" />`;
        }
        return '';
    }).join('');
}

function formatContent(content: string): string {
    content = content
        .replace(/\\n\\n|\n\n/g, '</p><p>')
        .replace(/\n(?!$)/g, '<br />')
        .replace(/<br \/>$/, '');

    if (!content.startsWith('<p>')) {
        content = `<p>${content}`;
    }
    if (!content.endsWith('</p>')) {
        content += '</p>';
    }

    return content;
}