import type { SportType } from '@arenaswap/core/types';

// What the countdown is counting down *to*, in the sport's own words. Softball shares
// baseball's first pitch and soccer shares football's kickoff; anything we have no word for
// falls back to plain gametime rather than borrowing another sport's.
// `as const` keeps the literals so these stay assignable to i18n.t's key union.
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
