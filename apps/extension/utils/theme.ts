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

// `preference` is null while the stored prefs are still loading, which leaves what themeBoot.js set
// alone instead of flashing the default in and back out.
export const useTheme = (preference: ThemePreference | null): ResolvedTheme => {
	const [theme, setTheme] = useState(readDocumentTheme);

	useEffect(() => {
		if (preference === null) return;
		globalThis.localStorage?.setItem(themeStorageKey, preference);
	}, [preference]);

	useEffect(() => {
		if (preference === null) return;
		const query = window.matchMedia(lightSchemeQuery);
		const apply = () => {
			const next = resolveTheme(preference, query.matches);
			document.documentElement.dataset.bsTheme = next;
			setTheme(next);
		};
		apply();
		if (preference !== 'system') return;
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, [preference]);

	return theme;
};
