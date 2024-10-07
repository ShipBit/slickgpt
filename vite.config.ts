import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: {
		esbuildOptions: {
			target: "ES2022",
		},
	},
	build: {
		target: "ES2022",
	},
	plugins: [sveltekit()]
});
