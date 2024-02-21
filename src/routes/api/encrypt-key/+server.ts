import { json } from '@sveltejs/kit';
import Cryptr from 'cryptr';
import { SITE_SECRET } from '$env/static/private';
import cryptr from '$misc/cryptr';

export const POST = async ({ request }) => {
	const body = await request.json();
	if (!body.key) return json({ success: false, error: 'No key provided' });

	const encryptedKey = cryptr.encrypt(body.key);

	return json({ success: true, encryptedKey });
};
