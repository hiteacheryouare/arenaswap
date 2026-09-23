import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';
import pkg from '../../package.json';
import { localeCodes } from './src/i18n/locales.ts';
import sassOptions from '@arenaswap/ui/src/sassOptions.ts';

const year = new Date().getFullYear();
const version = pkg.version;

// Off unless ARENASWAP_SITE_COVERAGE is set, so a normal build — including the one that writes the
// tracked docs/ directory GitHub Pages serves — never ships instrumented JavaScript. Only the files
// that actually reach a browser are listed: the React islands and the one helper they share. The
// rest of src/ runs in Astro frontmatter at build time, and counting it would report a denominator
// no visitor ever executes.
const coverage = process.env.ARENASWAP_SITE_COVERAGE === '1';
const coveragePlugins = coverage
	? [istanbul({
		include: ['src/components/**', 'src/i18n/islandStrings.ts'],
		extension: ['.ts', '.tsx'],
		// `astro build` is a production build, which the plugin skips instrumenting by default.
		forceBuildInstrument: true,
	})]
	: [];

export default defineConfig({
	integrations: [
		react(),
		mdx(),
		// The nine /screenshots/ pages are store assets, rendered to be captured rather than
		// landed on. They stay out of the sitemap and carry noindex of their own.
		sitemap({
			filter: page => !page.includes('/screenshots/'),
			// Emits the hreflang alternates into the sitemap as well as into each page's head. The
			// keys are URL segments and the values are the hreflang codes, which for this site are
			// the same string — `defaultLocale` is what tells the integration which one owns the
			// unprefixed URLs.
			i18n: {
				defaultLocale: 'en',
				locales: Object.fromEntries(localeCodes.map(code => [code, code])),
			},
		}),
	],
	// English keeps the root, so every URL this site has ever published still resolves. The other
	// eleven take one segment: /arenaswap/de/, /arenaswap/pt-BR/ and so on.
	//
	// `manual` routing rather than Astro's redirect-based strategies: this is a static build on
	// GitHub Pages with no server to negotiate on, and the localized pages are generated explicitly
	// by the `[...locale]` rest parameter in src/pages. What this config buys is `Astro.currentLocale`
	// and the sitemap's alternates.
	i18n: {
		defaultLocale: 'en',
		locales: localeCodes,
		routing: {
			prefixDefaultLocale: false,
			redirectToDefaultLocale: false,
		},
	},
	vite: {
		plugins: [tailwindcss(), ...coveragePlugins],
		// Silences Bootstrap 5.3's Sass deprecation warnings, and only for as long as Bootstrap
		// is the one emitting them. See packages/ui/src/sassOptions.ts.
		css: {
			preprocessorOptions: {
				scss: sassOptions,
			},
		},
		// Astro 7 builds with rolldown-vite, which reads build.rolldownOptions.output (see astro's
		// vite-build-config.js). A top-level rollupOptions key here is dropped without a word, which
		// is how the banner went missing.
		build: {
			rolldownOptions: {
				output: {
					// Rolldown adds the banner before minifying, and the minifier strips legal
					// comments unless they are kept on purpose. Without this the banner is emitted
					// and then deleted.
					comments: { legal: true },
					banner: `/*! ArenaSwap v${version} Copyright (c) ${year} Ryan Mullin, Lattice & Company, and Contributors. All rights reserved. */`,
				},
			},
		},
	},
	// GitHub Pages project site. Needed for canonical URLs and the release notes feed.
	site: 'https://hiteacheryouare.github.io',
	outDir: '../../docs',
	base: '/arenaswap/',
	build: {
		emptyOutDir: true,
	},
	// Retired URLs. `/blog/` and the one post it held were published, and `/credits/` shipped in 2.0,
	// so they redirect rather than 404. Static output makes these meta-refresh pages, which is all
	// GitHub Pages can serve.
	// Keys are routes, so `base` is applied to them the same way it is to a page in src/pages.
	// Destinations are written out literally, base included.
	redirects: {
		'/blog': '/arenaswap/releases/',
		'/blog/introducing-v2': '/arenaswap/releases/2.0.0/',
		'/credits': '/arenaswap/legal/credits/',
	},
});
