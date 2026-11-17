import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { ThemePreference } from '@arenaswap/core/types';
import { fullLogoSrc, iconSrc, resolveTheme, themeStorageKey } from '../utils/theme';

const bootScript = readFileSync(path.join(__dirname, '../public/themeBoot.js'), 'utf8');

const bootTheme = (stored: string | null, prefersLight: boolean): string | undefined => {
	const dataset: Record<string, string> = {};
	vm.runInNewContext(bootScript, {
		localStorage: { getItem: (key: string) => (key === themeStorageKey ? stored : null) },
		matchMedia: (query: string) => ({ matches: query === '(prefers-color-scheme: light)' && prefersLight }),
		document: { documentElement: { dataset } },
	});
	return dataset.bsTheme;
};

describe('resolveTheme', () => {
	test('an explicit choice ignores the system', () => {
		expect(resolveTheme('dark', true)).toBe('dark');
		expect(resolveTheme('light', false)).toBe('light');
	});

	test('system follows the system', () => {
		expect(resolveTheme('system', true)).toBe('light');
		expect(resolveTheme('system', false)).toBe('dark');
	});
});

describe('the boot script agrees with resolveTheme', () => {
	const preferences: ThemePreference[] = ['dark', 'light', 'system'];

	test.each(preferences.flatMap(preference => [true, false].map(prefersLight => [preference, prefersLight] as const)))(
		'%s with the system preferring light: %s',
		(preference, prefersLight) => {
			expect(bootTheme(preference, prefersLight)).toBe(resolveTheme(preference, prefersLight));
		},
	);

	test.each([null, '', 'LIGHT', 'sepia'])('an absent or unknown copy (%p) boots dark', stored => {
		expect(bootTheme(stored, true)).toBe('dark');
	});
});

describe('fullLogoSrc', () => {
	test('the white mark on dark and the black mark on light', () => {
		expect(fullLogoSrc('dark')).toBe('/images/full_logo_white_on_transparent.svg');
		expect(fullLogoSrc('light')).toBe('/images/full_logo_black.svg');
	});

	test.each(['dark', 'light'] as const)('the %s mark ships', theme => {
		expect(() => readFileSync(path.join(__dirname, '../public', fullLogoSrc(theme)))).not.toThrow();
	});
});

describe('iconSrc', () => {
	test('the white icon on dark and the black icon on light', () => {
		expect(iconSrc('dark')).toBe('/images/icon_white_on_transparent.svg');
		expect(iconSrc('light')).toBe('/images/icon_black_on_transparent.svg');
	});

	test.each(['dark', 'light'] as const)('the %s icon ships', theme => {
		expect(() => readFileSync(path.join(__dirname, '../public', iconSrc(theme)))).not.toThrow();
	});
});
