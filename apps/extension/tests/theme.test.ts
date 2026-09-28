import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { ThemePreference } from '@arenaswap/core/types';
import { resolveTheme, themeStorageKey } from '../utils/theme';

const bootScript = readFileSync(path.join(__dirname, '../public/themeBoot.js'), 'utf8');

// What the boot script sets on <html> for a stored preference and an OS setting, run the way a page
// runs it: as a plain script with nothing but the globals a page has.
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

// The boot script repeats resolveTheme's rule because it has to run before the bundle does. If the
// two ever disagree, the popup opens in one theme and switches to the other a moment later.
describe('the boot script agrees with resolveTheme', () => {
	const preferences: ThemePreference[] = ['dark', 'light', 'system'];

	test.each(preferences.flatMap(preference => [true, false].map(prefersLight => [preference, prefersLight] as const)))(
		'%s with the system preferring light: %s',
		(preference, prefersLight) => {
			expect(bootTheme(preference, prefersLight)).toBe(resolveTheme(preference, prefersLight));
		},
	);

	// A profile that has never opened the popup since the setting shipped has no copy at all.
	test.each([null, '', 'LIGHT', 'sepia'])('an absent or unknown copy (%p) boots dark', stored => {
		expect(bootTheme(stored, true)).toBe('dark');
	});
});
