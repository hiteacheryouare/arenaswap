import { defineConfig } from 'wxt';
import pkg from '../../package.json';
import sassOptions from '@arenaswap/ui/src/sassOptions';

const year = new Date().getFullYear();
const version = pkg.version;
const banner = `/*! ArenaSwap v${version} Copyright (c) ${year} Ryan Mullin, Lattice & Company, and Contributors. All rights reserved. */`;

// Coverage instrumentation for the e2e build only. `build:e2e` writes to .output/e2e, which is
// gitignored and never zipped, and the environment variable is set by the coverage script
// alone — so `wxt build`, `build:firefox` and `build:edge` produce the same bytes they always
// have. vite-plugin-istanbul ships ESM only and this config is loaded as CommonJS.
const istanbulPlugins = async () => {
	if (process.env.ARENASWAP_COVERAGE_TARGET !== 'e2e') return [];
	const { default: istanbul } = await import('vite-plugin-istanbul');
	return [istanbul({ requireEnv: false, forceBuildInstrument: true })];
};

export default defineConfig({
	modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
	// Cypress serves a build directory over HTTP for the whole length of an e2e run, and `wxt zip`
	// wipes and rewrites `.output/chrome-mv3` as part of its own build. Turbo schedules those two
	// tasks in parallel, so they raced and left the served directory half-written. The e2e build
	// takes this override to claim a directory nothing else writes.
	outDir: process.env.WXT_OUT_DIR ?? '.output',
	// dist/ is gitignored build output from the retired zip-builds scripts, so a stale copy on one
	// machine would otherwise be swept into the sources archive an AMO reviewer downloads. marketing/
	// is store screenshots and promo tiles — ~7MB of the archive, and nothing to do with building.
	zip: {
		excludeSources: ['dist/**', 'marketing/**'],
	},
	vite: async () => ({
		plugins: [
			...(await istanbulPlugins()),
			{
				name: 'arenaswap-banner',
				generateBundle(_, bundle) {
					for (const chunk of Object.values(bundle)) {
						if (chunk.type === 'chunk' && chunk.isEntry) {
							chunk.code = `${banner}\n${chunk.code}`;
						}
					}
				},
			},
		],
		build: {
			target: 'es2023',
		},
		// Silences Bootstrap 5.3's Sass deprecation warnings, and only for as long as Bootstrap
		// is the one emitting them. See packages/ui/src/sassOptions.ts.
		css: {
			preprocessorOptions: {
				scss: sassOptions,
			},
		},
		// Firefox MV3 dev server: serve responses uncompressed. Compressed responses trip
		// NS_ERROR_CORRUPTED_CONTENT when loaded from an extension page.
		server: {
			headers: {
				'Content-Encoding': 'identity',
			},
		},
	}),
	// Array.prototype.toSorted is Chrome/Edge 110+ and Firefox 115+, and browser.storage.session is
	// Firefox 115+ as well. Neither is polyfilled — build.target down-levels syntax, not built-ins —
	// so these floors have to exclude the browsers the popup would crash on open.
	manifest: ({ browser }) => ({
		// The two strings a browser shows in its own extension list, and the two the stores put at
		// the top of a listing, so they are the ones worth having in the reader's language. Both
		// resolve out of locales/<lang>.json — @wxt-dev/i18n flattens that file into the _locales
		// each browser expects, and a top-level key comes through under its own name. Anything
		// nested would arrive as `meta_extName` and stop matching what is asked for here.
		//
		// `name` is capped at 75 characters and `description` at 132, both counted in characters
		// rather than bytes. apps/extension/marketing/README.md records where those come from.
		name: '__MSG_extName__',
		default_locale: 'en',
		description: '__MSG_extDescription__',
		// Chrome-only key: AMO's linter flags it as an unknown property, and Firefox's floor is
		// carried by strict_min_version below.
		...(browser === 'firefox' ? {} : { minimum_chrome_version: '110' }),
		browser_specific_settings: {
			gecko: {
				id: 'arenaswap@hiteacheryouare.github.io',
				strict_min_version: '115.0',
				data_collection_permissions: {
					required: ['none'],
				},
			},
		},
		permissions: ['tabs', 'storage', 'notifications'],
		host_permissions: [
			'https://site.api.espn.com/*',
			'https://a.espncdn.com/*',
		],
		icons: {
			16: 'icon/16.png',
			32: 'icon/32.png',
			48: 'icon/48.png',
			96: 'icon/96.png',
			128: 'icon/128.png',
		},
		content_security_policy: {
			extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' https://a.espncdn.com data:;",
		},
	}),
});
