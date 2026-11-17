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

export const useDocumentTheme = (): ResolvedTheme => useSyncExternalStore(subscribe, readDocumentTheme, () => 'dark');

export default useDocumentTheme;
