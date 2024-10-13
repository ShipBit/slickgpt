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
					else if (id.includes('node_modules')) {
						// Split third-party modules into separate chunks
						const parts = id.split('node_modules/');
						const moduleName = parts[1]?.split('/')[0];
						return moduleName || 'unknown';
					}
				}
			}
		},
		target: "ES2022"
	},
	plugins: [sveltekit()]
});
