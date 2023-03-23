import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Chat } from '$misc/shared';

export const load: PageLoad = async ({ fetch, params }) => {
	const { slug } = params;
	const response = await fetch(`/api/share?slug=${slug}`);
	const result = await response.json();

	if (!response.ok) {
		// result.message is the text we created in the API function
		throw error(response.status, result.message);
	}

	return {
		chat: result as Chat
	};
};
