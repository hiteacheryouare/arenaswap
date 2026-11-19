import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';
import pkg from '../../package.json';
import { localeCodes } from './src/i18n/locales.ts';
import bootstrapTokenPrefix from '@arenaswap/ui/src/bootstrapTokenPrefix.ts';
import relativeDocLinks from './src/lib/relativeDocLinks.ts';
import scrollableTables from './src/lib/scrollableTables.ts';
import translatedHeadingIds from './src/lib/translatedHeadingIds.ts';
import { translatedPagePaths } from './src/lib/translationSource.ts';

const localeReadingPage = new RegExp(
	`/arenaswap/((?:${localeCodes.filter(code => code !== 'en').join('|')})/(?:docs|releases)/.*)$`,
);
const translatedPages = translatedPagePaths(
	fileURLToPath(new URL('./src/content/docs/', import.meta.url)),
	fileURLToPath(new URL('./src/content/releases/', import.meta.url)),
);
const isUntranslatedLocalePage = page => {
	const path = page.match(localeReadingPage)?.[1];
	return path !== undefined && !translatedPages.has(path);
};

const year = new Date().getFullYear();
const version = pkg.version;

const coverage = process.env.ARENASWAP_SITE_COVERAGE === '1';
const coveragePlugins = coverage
	? [istanbul({
		include: ['src/components/**', 'src/i18n/islandStrings.ts'],
		extension: ['.ts', '.tsx'],
		forceBuildInstrument: true,
	})]
	: [];

export default defineConfig({
	integrations: [
		react(),
		mdx(),
		sitemap({
			filter: page => !page.includes('/screenshots/') && !isUntranslatedLocalePage(page),
			i18n: {
				defaultLocale: 'en',
				locales: Object.fromEntries(localeCodes.map(code => [code, code])),
			},
		}),
	],
	markdown: {
		processor: satteri({ hastPlugins: [relativeDocLinks, translatedHeadingIds, scrollableTables] }),
	},
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
		css: {
			postcss: {
				plugins: [bootstrapTokenPrefix],
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
	site: 'https://hiteacheryouare.github.io',
	base: '/arenaswap/',
	build: {
		emptyOutDir: true,
	},
	redirects: {
		'/blog': '/arenaswap/releases/',
		'/blog/introducing-v2': '/arenaswap/releases/2.0.0/',
		'/credits': '/arenaswap/legal/credits/',
	},
});
