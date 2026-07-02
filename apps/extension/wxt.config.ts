import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'wxt';
import { parse } from 'yaml';
import pkg from '../../package.json';

const year = new Date().getFullYear();
const version = pkg.version;
const banner = `/*! ArenaSwap v${version} Copyright (c) ${year} ArenaSwap Systems, Ryan Mullin, and Contributors. All rights reserved. */`;

// Set ARENASWAP_LOCALE (e.g. `es`) to launch the dev browser in that locale.
// When set, a Vite virtual module replaces @wxt-dev/i18n with an adapter that
// reads the YAML directly — bypassing chrome.i18n.getMessage() which is
// unreliable on macOS.
const devLocale = process.env.ARENASWAP_LOCALE;

if (devLocale) {
	const profileDir = `/private/tmp/chrome-profile-${devLocale}`;
	mkdirSync(profileDir, { recursive: true });
	writeFileSync(
		`${profileDir}/Local State`,
		JSON.stringify({ intl: { app_locale: devLocale, accept_languages: devLocale } }),
	);
}

const DEV_I18N_ID = '\0arenaswap-i18n-dev';

const buildDevI18nModule = (locale: string): string => {
	const ymlPath = resolve(process.cwd(), `locales/${locale}.yml`);
	const messages = parse(readFileSync(ymlPath, 'utf-8'));
	const data = JSON.stringify(messages);
	return `const _msg = ${data};
const _look = (key) => key.split('.').reduce((n, p) => n != null && typeof n === 'object' ? n[p] : undefined, _msg);
const _sub = (tpl, subs) => {
	if (Array.isArray(subs)) return tpl.replace(/\\$(\\d)/g, (_, n) => String(subs[+n - 1] ?? ''));
	if (subs && typeof subs === 'object') return tpl.replace(/\\{(\\w+)\\}/g, (_, k) => String(subs[k] ?? ''));
	return tpl;
};
const t = (key, ...args) => {
	let sub, namedSub, count;
	args.forEach(a => {
		if (a == null) return;
		if (typeof a === 'number') count = a;
		else if (Array.isArray(a)) sub = a;
		else if (typeof a === 'object') namedSub = a;
	});
	if (count != null && sub == null) sub = [String(count)];
	const v = _look(key);
	if (typeof v === 'string') return _sub(v, namedSub ?? sub);
	if (v != null && typeof v === 'object' && count != null) {
		const forms = v;
		const form = forms[String(count)] ?? forms.n ?? forms['1'] ?? '';
		return _sub(form, sub ?? [count]);
	}
	return key;
};
export function createI18n() { return { t }; }
export function isNamedSubstitutions(v) { return typeof v === 'object' && v != null; }
`;
};

export default defineConfig({
	modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
	webExt: {
		chromiumArgs: devLocale ? [`--lang=${devLocale}`] : [],
		chromiumProfile: devLocale ? `/private/tmp/chrome-profile-${devLocale}` : undefined,
		firefoxPref: devLocale
			? { 'intl.locale.requested': devLocale, 'intl.accept_languages': devLocale }
			: {},
	},
	vite: () => ({
		plugins: [
			...(devLocale ? [{
				name: 'arenaswap-i18n-dev',
				enforce: 'pre' as const,
				resolveId(id: string) {
					if (id === '@wxt-dev/i18n') return DEV_I18N_ID;
				},
				load(id: string) {
					if (id === DEV_I18N_ID) return buildDevI18nModule(devLocale);
				},
			}] : []),
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
		default_locale: 'en',
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
