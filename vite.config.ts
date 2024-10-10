import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: {
		esbuildOptions: {
			target: "ES2022",
		},
	},
	build: {
		rollupOptions: {
			output: {
			  manualChunks(id) {
				if (id.includes('pdfjs-dist')) {
				  return 'pdfjs';
				}
			  }
			}
		},
		target: "ES2022",
	},
	plugins: [sveltekit()]
});
