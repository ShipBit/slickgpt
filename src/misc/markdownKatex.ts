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

export function customLatexRenderer(md: markdownIt, options: MarkdownKatexOptions = defaultOptions) {
    md.inline.ruler.after('text', 'escaped_bracket', escapedBracketRule(options));
}

const md = markdownIt({ html: true, breaks: true }).use(customLatexRenderer, defaultOptions);

export function renderMarkdown(message: ChatMessage): string {
	let content = '';

	if (Array.isArray(message.content)) {
		message.content.forEach(contentItem => {
			if (contentItem.type === 'text' && contentItem.text) {
				content += md.render(contentItem.text);
			} else if (contentItem.type === 'image_url' && contentItem.image_url) {
				content += `<img src="${contentItem.image_url.url}" alt="${contentItem.fileName}" />`;
			}
		});
	} else {
		// Fallback for backward compatibility, in case content is still a string
		content += md.render(message.content);
	}
	return content;
}