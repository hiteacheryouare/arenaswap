import { useSyncExternalStore } from 'react';
import type { ResolvedTheme } from '@arenaswap/core/types';

export const readDocumentTheme = (): ResolvedTheme => (
	document.documentElement.dataset.bsTheme === 'light' ? 'light' : 'dark'
);

const subscribe = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
	return () => observer.disconnect();
};

// For a leaf that only needs to know which way the page is lit — a logo picking its variant — and is
// too deep to be handed the theme. The attribute on <html> is the source; the website never sets it,
// so there this is always dark. Server rendering has no document and gets dark too.
export const useDocumentTheme = (): ResolvedTheme => useSyncExternalStore(subscribe, readDocumentTheme, () => 'dark');

export default useDocumentTheme;
