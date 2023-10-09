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
			letterSpacing: {
				tighter: '-0.02em',
				tight: '-0.01em',
				normal: '0',
				wide: '0.01em',
				wider: '0.02em',
				widest: '0.4em'
			},
			fontSize: {
				xs: '0.875rem',
				sm: '1rem',
				base: '1.125rem',
				lg: '1.25rem',
				xl: '1.375rem',
				'2xl': '1.5rem',
				'3xl': '2rem',
				'4xl': '2.5rem',
				'5xl': '3.25rem',
				'6xl': '4rem'
			}
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
		})
	]
} satisfies Config;

export default config;
