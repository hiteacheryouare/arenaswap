import * as z from 'zod/mini';
// zod/mini names the `.default()` equivalent `_default`, `default` being a reserved word.
import { _default as withDefault } from 'zod/mini';
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

// zod/mini has no method chain, so a defaulted-then-normalized field is a pipe rather than
// `.default().transform()`. Same two steps, same order.
const normalized = <T>(fallback: unknown, normalize: (value: unknown) => T) =>
	z.pipe(withDefault(z.unknown(), fallback), z.transform(normalize));

export const BackgroundStateSchema = z.catch(z.object({
	games:              normalized([], v => isGameArray(v) ? v : []),
	scores:             normalized([], normalizeScores),
	leagueLogos:        normalized({}, v => isLeagueLogoMap(v) ? v : {}),
	scoreHistory:       normalized({}, normalizeScoreHistory),
	powerScoreHistory:  normalized({}, normalizePowerScoreHistory),
	gameBoosts:         normalized({}, normalizeGameBoosts),
	onStandbyStream:    normalized(false, v => v === true),
	standbyStreamTabId: normalized(null, v => typeof v === 'number' ? v : null),
	slateShedLeagues:   normalized([], v => Array.isArray(v) ? v.filter((id): id is LeagueId => typeof id === 'string') : []),
}), defaultState);
