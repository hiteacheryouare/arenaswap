// The site's half of the Theme control. themeBoot.js repeats `resolveSiteTheme` because it runs in
// the head before any bundle has loaded; the e2e spec holds the two to the same answer.
export type ThemePreference = 'system' | 'light' | 'dark';

export const themeStorageKey = 'arenaswap.theme';

const lightSchemeQuery = '(prefers-color-scheme: light)';

const themeColors = { light: '#ffffff', dark: '#000000' };

export const readThemePreference = (): ThemePreference => {
	const stored = localStorage.getItem(themeStorageKey);
	return stored === 'light' || stored === 'dark' ? stored : 'system';
};

export const resolveSiteTheme = (preference: ThemePreference, prefersLight: boolean): 'light' | 'dark' => (
	preference === 'system' ? (prefersLight ? 'light' : 'dark') : preference
);

// Three modes always leave one click that changes nothing on screen, because System matches one of
// the other two. Stepping to the opposite of the OS first puts that quiet step last, where it hands
// control back to the OS rather than looking like a dead button.
export const nextThemePreference = (preference: ThemePreference, prefersLight: boolean): ThemePreference => {
	const system = prefersLight ? 'light' : 'dark';
	const opposite = prefersLight ? 'dark' : 'light';
	if (preference === 'system') return opposite;
	return preference === opposite ? system : 'system';
};

export const prefersLightScheme = () => matchMedia(lightSchemeQuery).matches;

export const applyThemePreference = (preference: ThemePreference) => {
	const theme = resolveSiteTheme(preference, prefersLightScheme());
	document.documentElement.dataset.bsTheme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
};

export const watchSystemTheme = (onChange: () => void) => {
	matchMedia(lightSchemeQuery).addEventListener('change', onChange);
};
