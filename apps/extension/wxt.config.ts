import { defineConfig } from 'wxt';
import pkg from '../../package.json';

const year = new Date().getFullYear();
const version = pkg.version;
const banner = `/*! ArenaSwap v${version} Copyright (c) ${year} ArenaSwap Systems, Ryan Mullin, and Contributors. All rights reserved. */`;

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
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
	}),
	manifest: {
		name: 'ArenaSwap',
		description: 'Watches every live game across 12 leagues and auto-switches your browser tab to the most exciting one every 15 seconds.',
		browser_specific_settings: {
			gecko: {
				id: 'arenaswap@hiteacheryouare.github.io',
				strict_min_version: '109.0',
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
	},
});
