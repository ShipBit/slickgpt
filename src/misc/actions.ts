export function scrollIntoView(node: HTMLElement) {
	// timeout needed because otherwise the rendered elements of this page have no height yet
	setTimeout(() => {
		node.scrollIntoView({ behavior: 'smooth' });
	}, 100);
}
