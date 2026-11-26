import type { SportType } from '@arenaswap/core/types';
import { i18n } from '#i18n';

// Must match the number of `loading.mN` keys in the locale files.
const LOADING_MESSAGE_COUNT = 152;

export const getRandomLoadingMessage = (): string => {
	const index = Math.floor(Math.random() * LOADING_MESSAGE_COUNT) + 1;
	// Every loading.mN has the same shape as m1, so m1 stands in for the generated key type.
	return i18n.t(`loading.m${index}` as 'loading.m1');
};

// Must match the number of `startsSoon.<group>.mN` keys in the locale files.
export const startsSoonMessageCounts: Record<'any' | SportType, number> = {
	any: 42,
	basketball: 8,
	football: 8,
	hockey: 8,
	baseball: 8,
	softball: 6,
	soccer: 8,
};

export const getRandomStartsSoonMessage = (sportType: SportType): string => {
	const anyCount = startsSoonMessageCounts.any;
	const index = Math.floor(Math.random() * (anyCount + startsSoonMessageCounts[sportType]));
	const key = index < anyCount ? `startsSoon.any.m${index + 1}` : `startsSoon.${sportType}.m${index - anyCount + 1}`;
	return i18n.t(key as 'startsSoon.any.m1');
};
