import { defineConfig } from 'wxt';

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	manifest: {
		name: 'Madness',
		description: 'Automatically flip to the most exciting March Madness game',
		permissions: ['tabs', 'storage', 'notifications'],
		host_permissions: [
			'https://site.api.espn.com/*',
		],
	},
});
