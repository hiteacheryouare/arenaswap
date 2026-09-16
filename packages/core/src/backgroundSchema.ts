import { z as zod } from 'zod';
import {
	isGameArray,
	isLeagueLogoMap,
	normalizeGameBoosts,
	normalizePowerScoreHistory,
	normalizeScoreHistory,
	normalizeScores,
} from './typeGuards';
import type { BackgroundState, LeagueId } from './types';

const defaultState = (): BackgroundState => ({
	games: [],
	scores: [],
	leagueLogos: {},
	scoreHistory: {},
	powerScoreHistory: {},
	gameBoosts: {},
	onStandbyStream: false,
	standbyStreamTabId: null,
	slateShedLeagues: [],
});

export const BackgroundStateSchema = zod.object({
	games:              zod.unknown().default([]).transform(v => isGameArray(v) ? v : []),
	scores:             zod.unknown().default([]).transform(normalizeScores),
	leagueLogos:        zod.unknown().default({}).transform(v => isLeagueLogoMap(v) ? v : {}),
	scoreHistory:       zod.unknown().default({}).transform(normalizeScoreHistory),
	powerScoreHistory:  zod.unknown().default({}).transform(normalizePowerScoreHistory),
	gameBoosts:         zod.unknown().default({}).transform(normalizeGameBoosts),
	onStandbyStream:    zod.unknown().default(false).transform(v => v === true),
	standbyStreamTabId: zod.unknown().default(null).transform(v => typeof v === 'number' ? v : null),
	slateShedLeagues:   zod.unknown().default([]).transform(v => Array.isArray(v) ? v.filter((id): id is LeagueId => typeof id === 'string') : []),
}).catch(defaultState);
