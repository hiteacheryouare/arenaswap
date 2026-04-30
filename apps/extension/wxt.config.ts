import { defineConfig } from 'wxt';

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	manifest: {
		name: 'ArenaSwap',
		description: 'Automatically flip to the most exciting game',
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
