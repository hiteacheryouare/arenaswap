import { useEffect, useState } from 'react';
import type { ResolvedTheme, ThemePreference } from '@arenaswap/core/types';
import { readDocumentTheme } from '@arenaswap/ui/src/components/useDocumentTheme';

// A copy of the Theme setting outside `UserPreferences`, for public/themeBoot.js, which sets the
// attribute before the first paint and cannot wait on the async storage API.
export const themeStorageKey = 'arenaswap.theme';

const lightSchemeQuery = '(prefers-color-scheme: light)';

export const resolveTheme = (preference: ThemePreference, prefersLight: boolean): ResolvedTheme => (
	preference === 'system' ? (prefersLight ? 'light' : 'dark') : preference
);

export const fullLogoSrc = (theme: ResolvedTheme): string => (
	theme === 'light' ? '/images/full_logo_black.svg' : '/images/full_logo_white_on_transparent.svg'
);

// `preference` is null while the stored prefs are still loading, which leaves what themeBoot.js set
// alone instead of flashing the default in and back out. `pinDark` is for the screens that stay dark
// whatever the setting says; it changes what is shown and never what is remembered.
export const useTheme = (preference: ThemePreference | null, pinDark = false): ResolvedTheme => {
	const [theme, setTheme] = useState(readDocumentTheme);

	useEffect(() => {
		if (preference === null) return;
		globalThis.localStorage?.setItem(themeStorageKey, preference);
	}, [preference]);

	useEffect(() => {
		if (preference === null && !pinDark) return;
		const query = window.matchMedia(lightSchemeQuery);
		const apply = () => {
			const next = preference === null || pinDark ? 'dark' : resolveTheme(preference, query.matches);
			document.documentElement.dataset.bsTheme = next;
			setTheme(next);
		};
		apply();
		if (preference !== 'system' || pinDark) return;
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, [preference, pinDark]);

	return theme;
};
