import type { SportType } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { i18n } from '#i18n';

export type popupView = 'main' | 'setup' | 'detail' | 'suggest';
export const sportTypeOrder: Record<SportType, number> = {
	basketball: 0,
	football: 1,
	hockey: 2,
	baseball: 3,
	softball: 4,
	soccer: 5,
};
export const sportTypeLabels: Record<SportType, string> = {
	basketball: i18n.t('sport.basketball'),
	football: i18n.t('sport.football'),
	hockey: i18n.t('sport.hockey'),
	baseball: i18n.t('sport.baseball'),
	softball: i18n.t('sport.softball'),
	soccer: i18n.t('sport.soccer'),
};

const cutAtCodePoint = (text: string, length: number) => {
	const characters = Array.from(text);
	return characters.length > length ? `${characters.slice(0, length).join('')}…` : text;
};

export const formatTabLabel = (tab: Browser.tabs.Tab, allTabs: Browser.tabs.Tab[]): string => {
	const title = tab.title ?? '';
	if (!title) return i18n.t('tab.fallback', [String(tab.id)]);
	const duplicates = allTabs.filter(t => t.title === title);
	if (duplicates.length <= 1) return title;
	try {
		const pathname = new URL(tab.url ?? '').pathname;
		return `${cutAtCodePoint(title, 25)} (${(Array.from(pathname).length > 25 ? cutAtCodePoint(pathname, 22) : pathname)})`;
	} catch {
		return `${cutAtCodePoint(title, 30)} (#${tab.id})`;
	}
};
