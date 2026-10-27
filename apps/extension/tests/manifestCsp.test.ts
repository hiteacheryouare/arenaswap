import config from '../wxt.config';

jest.mock('wxt', () => ({ defineConfig: (value: unknown) => value }));

const imageSources = (browser: string): string[] => {
	const manifest = (config.manifest as (env: { browser: string }) => { content_security_policy: { extension_pages: string } })({ browser });
	const directive = manifest.content_security_policy.extension_pages
		.split(';')
		.map(part => part.trim().split(/\s+/))
		.find(([name]) => name === 'img-src');
	return directive?.slice(1) ?? [];
};

describe('extension page CSP', () => {
	// Tab favicons are served by every site the user has open, so a host allowlist blanks them all.
	test.each(['chrome', 'edge', 'firefox'])('lets the %s popup load a favicon from any https site', browser => {
		expect(imageSources(browser)).toContain('https:');
	});

	test.each(['chrome', 'edge', 'firefox'])('still keeps %s scripts to the extension itself', browser => {
		const manifest = (config.manifest as (env: { browser: string }) => { content_security_policy: { extension_pages: string } })({ browser });
		expect(manifest.content_security_policy.extension_pages).toMatch(/script-src 'self';/);
	});
});

describe('Multiview permissions', () => {
	interface permissionsManifest {
		permissions: string[];
		optional_permissions?: string[];
		optional_host_permissions?: string[];
		host_permissions: string[];
	}
	const manifestFor = (browser: string) => (config.manifest as (env: { browser: string }) => permissionsManifest)({ browser });

	// AMO forbids relaxing a page's security headers at all.
	test('leaves the Firefox build without them', () => {
		const manifest = manifestFor('firefox');
		expect(manifest.permissions).not.toContain('declarativeNetRequestWithHostAccess');
		expect(manifest.permissions).not.toContain('scripting');
		expect(manifest.optional_host_permissions).toBeUndefined();
		expect(manifest.optional_permissions).toBeUndefined();
	});

	// Every site and the frame tree are asked for when Multiview is turned on, never at install.
	test.each(['chrome', 'edge'])('asks %s for every site only as an optional permission', browser => {
		const manifest = manifestFor(browser);
		expect(manifest.permissions).toEqual(expect.arrayContaining(['declarativeNetRequestWithHostAccess', 'scripting']));
		expect(manifest.optional_host_permissions).toEqual(['<all_urls>']);
		expect(manifest.optional_permissions).toEqual(['webNavigation']);
		expect(manifest.host_permissions).not.toContain('<all_urls>');
		expect(manifest.permissions).not.toContain('webNavigation');
	});
});
