import type { Config } from 'tailwindcss';

export default {
	content: ['./entrypoints/**/*.{ts,tsx,html}', './components/**/*.{ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {},
	},
	plugins: [],
} satisfies Config;
