import { defineConfig } from 'wxt';
import pkg from '../../package.json';

const year = new Date().getFullYear();
const version = pkg.version;
const banner = `/*! ArenaSwap v${version} Copyright (c) ${year} Ryan Mullin, Lattice & Company, and Contributors. All rights reserved. */`;

export default defineConfig({
	modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
	// dist/ is gitignored build output from the retired zip-builds scripts, so a stale copy on one
	// machine would otherwise be swept into the sources archive an AMO reviewer downloads. marketing/
	// is store screenshots and promo tiles — ~7MB of the archive, and nothing to do with building.
	zip: {
		excludeSources: ['dist/**', 'marketing/**'],
	},
	vite: () => ({
		plugins: [
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
		name: 'ArenaSwap',
		default_locale: 'en',
		description: 'Watches every live game across 31 leagues and auto-switches your browser tab to the most exciting one, as fast as every 6 seconds.',
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
