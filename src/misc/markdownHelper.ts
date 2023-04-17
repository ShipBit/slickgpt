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
