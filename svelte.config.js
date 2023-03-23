import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs18.x'
		}),
		alias: {
			$misc: 'src/misc'
		}
	},
	preprocess: [
		vitePreprocess({
			postcss: true
		})
	]
};

export default config;
