import type { SportType } from '@arenaswap/core/types';

const startPhraseKeys = {
	basketball: 'detail.getReadyTipOff',
	football: 'detail.getReadyKickoff',
	hockey: 'detail.getReadyPuckDrop',
	baseball: 'detail.getReadyFirstPitch',
	softball: 'detail.getReadyFirstPitch',
	soccer: 'detail.getReadyKickoff',
} as const satisfies Record<SportType, string>;

const fallbackKey = 'detail.getReadyGametime' as const;

export type StartPhraseKey = typeof startPhraseKeys[SportType] | typeof fallbackKey;

export const startPhraseKey = (sportType: SportType | undefined): StartPhraseKey => (
	(sportType && startPhraseKeys[sportType]) || fallbackKey
);
