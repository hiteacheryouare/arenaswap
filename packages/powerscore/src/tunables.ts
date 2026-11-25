import type { ScorerTunables } from './types';
import { scoreMaxCloseness, scoreMaxLateGame, scoreMaxMomentum, scoreMaxLeadChanges, scoreMaxComeback } from './scoreMaxima';

const lateGameCloseCeiling = 36;

export const scorerTunables: ScorerTunables = {
	scores: {
		closeness: {
			tied: scoreMaxCloseness,
			tight: 34,
			zeroZero: 22,
			close: 20,
			fringe: 8,
			none: 0,
		},
		closenessFlatFloor: 12,
		lateGame: {
			overtime: scoreMaxLateGame,
			closeCeiling: lateGameCloseCeiling,
			fringeCeiling: 22,
			blowoutCeiling: 15,
			finalPeriodStart: 3,
			previousPeriodTouch: 3,
			otPreBoostMax: scoreMaxLateGame - lateGameCloseCeiling,
			none: 0,
		},
		momentum: {
			bigRun: scoreMaxMomentum,
			smallRun: 20,
			none: 0,
		},
		leadChanges: {
			multiple: scoreMaxLeadChanges,
			single: 12,
			none: 0,
		},
		comeback: {
			big: scoreMaxComeback,
			moderate: 11,
			flatFloor: 2,
			none: 0,
		},
		winProbabilityVariance: {
			halfLife: 0.1,
			swingWeight: 0.3,
			coinFlipZeroDistance: 0.175,
			openLead: 0.8,
			decidedLead: 0.97,
			penaltyFromProgress: 0.5,
			scales: { movementFullScale: 1.77, swingFullScale: 0.27, neutralBlend: 0.52 },
		},
	},
	reasons: {
		fallback: 'best game available',
	},
};

export const boostBucketCaps = {
	moment: 20,
	noHitter: 70,
	context: 16,
} as const;

export const goAheadRunTunables = { goAhead: 8, tyingRun: 5, earlyFactor: 0.5, lastChanceFactor: 1.25 } as const;

export const twoMinuteDrillTunables = { max: 12, oneScore: 8, peakYards: 35, ownTwentyFactor: 0.4 } as const;

export const noHitterTunables = {
	ladder: [10, 22, 38, 52] as const,
	finalStagePerOut: 5,
	battingFactor: 0.7,
	softballFactor: 0.6,
} as const;

export const redCardTunables = { fullMinutes: 2, fadeMinutes: 10, secondCardFactor: 1.5, siegeClosenessBump: 4, tiedMagnitude: 10 } as const;

export const upsetTunables = { max: 12 } as const;

export const stakesTunables = { max: 10, raceMax: 6 } as const;

export const hockeyTunables = { emptyNetWindowSecs: 240 } as const;
