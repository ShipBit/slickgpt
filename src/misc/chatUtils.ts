import type { ChatMessage, ChatContent } from './shared';

export function processChatContent(messages: ChatMessage[]): string[] {
    let extractedTexts: string[] = [];
    messages.forEach((message) => {
        if (Array.isArray(message.content)) {
            // If content is an array (new format)
            message.content.forEach((contentItem: ChatContent) => {
                if (contentItem.type === 'text' && contentItem.text) {
                    extractedTexts.push(contentItem.text);
                }
            });
        } else if (typeof message.content === 'string') {
            // If content is a string (backward compatibility)
            extractedTexts.push(message.content);
        }
    });

    return extractedTexts;
}

export function containsMarkdownCodeBlock(input: string): boolean {
    const codeBlockRegex = /`[^`]+`|```[\s\S]+?```/;
    return codeBlockRegex.test(input);
}

export function closeOpenedCodeTicks(input: string) {
    const oneTickCount = (input.match(/`/g) || []).length;
    const threeTickCount = (input.match(/```/g) || []).length;

    if (oneTickCount % 2 !== 0) {
        input += '`';
    }

    if (threeTickCount % 2 !== 0) {
        input += '\n```';
    }

    return input;
}
