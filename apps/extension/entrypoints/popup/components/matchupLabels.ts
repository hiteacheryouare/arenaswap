import type { SportType } from '@arenaswap/core/types';
import type { InjuryStatus } from '@arenaswap/sideline';

export const injuryStatusLabelKeys = {
	out: 'detail.injuryOut',
	doubtful: 'detail.injuryDoubtful',
	questionable: 'detail.injuryQuestionable',
	dayToDay: 'detail.injuryDayToDay',
} as const satisfies Record<InjuryStatus, string>;

export const showsRestDays = (sportType: SportType | undefined): boolean => (
	sportType === 'basketball' || sportType === 'hockey'
);
