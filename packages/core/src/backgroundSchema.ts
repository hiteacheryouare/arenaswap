import { z as zod } from 'zod';
import {
	isGameArray,
	isLeagueLogoMap,
	normalizeGameBettingData,
	normalizeGameBoosts,
	normalizePowerScoreHistory,
	normalizeScoreHistory,
	normalizeScores,
} from './typeGuards';
import type { BackgroundState } from './types';

const defaultState = (): BackgroundState => ({
	games: [],
	scores: [],
	leagueLogos: {},
	scoreHistory: {},
	powerScoreHistory: {},
	gameBoosts: {},
	bettingData: {},
	onStandbyStream: false,
	standbyStreamTabId: null,
});

export const BackgroundStateSchema = zod.object({
	games:              zod.unknown().default([]).transform(v => isGameArray(v) ? v : []),
	scores:             zod.unknown().default([]).transform(normalizeScores),
	leagueLogos:        zod.unknown().default({}).transform(v => isLeagueLogoMap(v) ? v : {}),
	scoreHistory:       zod.unknown().default({}).transform(normalizeScoreHistory),
	powerScoreHistory:  zod.unknown().default({}).transform(normalizePowerScoreHistory),
	gameBoosts:         zod.unknown().default({}).transform(normalizeGameBoosts),
	bettingData:        zod.unknown().default({}).transform(normalizeGameBettingData),
	onStandbyStream:    zod.unknown().default(false).transform(v => v === true),
	standbyStreamTabId: zod.unknown().default(null).transform(v => typeof v === 'number' ? v : null),
}).catch(defaultState);
