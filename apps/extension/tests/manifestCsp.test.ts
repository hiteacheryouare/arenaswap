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
