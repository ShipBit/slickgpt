import { join } from 'path';
import type { Config } from 'tailwindcss';

// 1. Import the Skeleton plugin
import { skeleton } from '@skeletonlabs/tw-plugin';

const config = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// 3. Append the path to the Skeleton package
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			colors: {
				shipbit: {
					DEFAULT: '#E81748'
				}
			},
			fontFamily: {
				inter: ['Inter', 'sans-serif'],
				'architects-daughter': ['"Architects Daughter"', 'sans-serif'],
				barlow: ['Barlow', 'sans-serif'],
				code: ['Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace']
			},
			fontSize: {
				xs: '0.875rem',
				sm: '0.925rem',
				base: '1rem',
				lg: '1.125rem',
				xl: '1.25rem',
				'2xl': '1.5rem',
				'3xl': '1.75rem',
				'4xl': '2rem',
				'5xl': '2.25rem',
				'6xl': '2.5rem'
			},
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
		skeleton({
			themes: {
				// Register each theme within this array:
				preset: [{ name: 'skeleton', enhancements: true }]
			}
		}),
		function({ addUtilities }) {
            addUtilities({
                '.overflow-wrap-anywhere': {
                    'overflow-wrap': 'anywhere',
                },
            });
        }
	]
} satisfies Config;

export default config;
