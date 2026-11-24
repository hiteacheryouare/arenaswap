import { scoreGame, signalPoints, boostPoints, getTimelineProgress, resolveLeagueConfig, resolveSportConfig, sportTypeConfigMap } from 'powerscore';
import type { Game as ScoringGame, PowerScore, PowerScoreResult, ScoreOptions, ScoringContext, ScoreSnapshot, Side, WinProbabilityReading } from 'powerscore';
import { createFavoriteTeamKey } from './constants';
import { getHistoryWindowMsForGame, recentSnapshots } from './snapshotHistory';
import { resolveModeForGame } from './scoringMode';
import type { Game, LiveScore, Team, UserPreferences } from './types';

const sideOf = (game: Game, teamId: string | undefined): Side | undefined => {
	if (teamId === undefined) return undefined;
	if (teamId === game.homeTeam.id) return 'home';
	if (teamId === game.awayTeam.id) return 'away';
	return undefined;
};

const yardsToEndZone = (yardLine: number | undefined, possession: Side | undefined): number | undefined => {
	if (yardLine === undefined || possession === undefined) return undefined;
	return possession === 'home' ? 100 - yardLine : yardLine;
};

const reasonName = (team: Team, sportType: Game['sportType']): string | undefined => (
	sportType === 'soccer' ? team.shortName ?? team.nickname : team.nickname ?? team.shortName
);

const toTeamState = (team: Team, sportType: Game['sportType'], seeded: boolean): ScoringGame['homeTeam'] => ({
	score: team.score,
	...(team.abbreviation ? { abbreviation: team.abbreviation } : {}),
	...(reasonName(team, sportType) ? { nickname: reasonName(team, sportType)! } : {}),
	...(team.rank !== undefined && !seeded ? { rank: team.rank } : {}),
	...(team.timeouts !== undefined ? { timeouts: team.timeouts } : {}),
	...(team.hits !== undefined ? { hits: team.hits } : {}),
	...(team.errors !== undefined ? { errors: team.errors } : {}),
});

const toRedCards = (game: Game): ScoringGame['redCards'] => game.redCardEvents
	?.map(card => ({ side: sideOf(game, card.teamId), minute: card.minute }))
	.filter((card): card is { side: Side; minute: number } => card.side !== undefined);

const inningState = (game: Game): Pick<ScoringGame, 'period' | 'topOfInning' | 'outs' | 'baseRunners'> => {
	if (game.inningEnded) return { period: game.period, topOfInning: false, outs: 3, baseRunners: { first: false, second: false, third: false } };
	return {
		period: game.period,
		...(game.topOfInning !== undefined ? { topOfInning: game.topOfInning } : {}),
		...(game.baseRunners !== undefined ? { baseRunners: game.baseRunners } : {}),
		...(game.bso !== undefined ? { outs: game.bso.outs } : {}),
	};
};

export const toScoringGame = (game: Game): ScoringGame => {
	const possession = sideOf(game, game.possessionTeamId);
	const seeded = game.collegeSeeded === true;
	const yards = yardsToEndZone(game.yardLine, possession);
	return {
		id: game.id,
		league: game.league,
		sportType: game.sportType,
		homeTeam: toTeamState(game.homeTeam, game.sportType, seeded),
		awayTeam: toTeamState(game.awayTeam, game.sportType, seeded),
		...(game.period !== undefined ? inningState(game) : {}),
		...(game.clockSeconds !== undefined ? { clockSeconds: game.clockSeconds } : {}),
		...(game.intermission !== undefined ? { intermission: game.intermission } : {}),
		...(game.delayed !== undefined ? { delayed: game.delayed } : {}),
		...(game.status !== undefined ? { status: game.status } : {}),
		...(game.isRedZone !== undefined ? { isRedZone: game.isRedZone } : {}),
		...(game.down !== undefined ? { down: game.down } : {}),
		...(game.distance !== undefined ? { distance: game.distance } : {}),
		...(game.isGoalToGo !== undefined ? { isGoalToGo: game.isGoalToGo } : {}),
		...(possession !== undefined ? { possession } : {}),
		...(yards !== undefined ? { yardsToEndZone: yards } : {}),
		...(game.postseasonRound !== undefined ? { postseasonRound: game.postseasonRound } : {}),
		seasonType: game.isPostseason ? 'postseason' : 'regular',
		...(game.series?.kind === 'playoff' ? { series: { homeWins: game.series.homeWins, awayWins: game.series.awayWins, bestOf: game.series.bestOf } } : {}),
		...(game.redCardEvents ? { redCards: toRedCards(game) } : {}),
	};
};


export interface ClockStallEntry {
	lastClock: number;
	stallCount: number;
}

export const nextClockStall = (game: Game, previous: ClockStallEntry | undefined): ClockStallEntry | undefined => {
	if (!sportTypeConfigMap[game.sportType]?.clockBased) return undefined;
	if (!previous) return { lastClock: game.clockSeconds, stallCount: 0 };
	if (game.clockSeconds === previous.lastClock) return { lastClock: previous.lastClock, stallCount: previous.stallCount + 1 };
	return { lastClock: game.clockSeconds, stallCount: 0 };
};

export const getFavoriteTeamCount = (game: Game, favoriteTeamIds: ReadonlySet<string>): number => (
	(favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id)) ? 1 : 0)
	+ (favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id)) ? 1 : 0)
);

export const rivalSidesOf = (game: Game, rivalTeamIds: readonly string[]): Side[] => (
	(['home', 'away'] as const).filter(side => rivalTeamIds.includes(createFavoriteTeamKey(game.league, (side === 'home' ? game.homeTeam : game.awayTeam).id)))
);

export interface LiveScoringInput {
	game: Game;
	history: readonly ScoreSnapshot[];
	onBreak: boolean;
	winProbability: readonly WinProbabilityReading[];
	now: number;
	extras?: Omit<ScoringContext, 'history' | 'onBreak' | 'winProbability'>;
}

export const scoringContextFor = ({ game, history, onBreak, winProbability, now, extras }: LiveScoringInput): ScoringContext => ({
	...extras,
	history: recentSnapshots(history, now - getHistoryWindowMsForGame(game)),
	onBreak,
	winProbability,
});

export type ScoringPrefs = Pick<UserPreferences, 'favoriteTeamIds' | 'favoriteTeamBonusPoints' | 'postseasonBoostPoints' | 'disabledSignals'>
	& Partial<Pick<UserPreferences, 'scoringMode' | 'leagueModes' | 'modeDisabledSignals' | 'fantasyBlend' | 'rivalTeamIds'>>;

export const scoreOptionsFor = (game: Game, prefs: ScoringPrefs, gameBoost: number, favoriteTeamIds = new Set(prefs.favoriteTeamIds)): ScoreOptions => {
	const mode = resolveModeForGame({ scoringMode: prefs.scoringMode ?? 'classic', leagueModes: prefs.leagueModes ?? {} }, game);
	return {
		mode,
		disabledSignals: mode === 'classic' ? prefs.disabledSignals : (prefs.modeDisabledSignals?.[mode] ?? []),
		classicDisabledSignals: prefs.disabledSignals,
		...(mode === 'fantasy' && prefs.fantasyBlend !== undefined ? { classicBlend: { kind: 'boost', weight: prefs.fantasyBlend / 100 } } : {}),
		favoriteTeamCount: getFavoriteTeamCount(game, favoriteTeamIds),
		favoriteBoostPoints: prefs.favoriteTeamBonusPoints,
		postseasonBoostPoints: prefs.postseasonBoostPoints,
		gameBoost,
		...(mode === 'blowouts' && prefs.rivalTeamIds?.length ? { rivalSides: rivalSidesOf(game, prefs.rivalTeamIds) } : {}),
	};
};

export const timelineProgressOf = (game: Game): number => {
	const scoring = toScoringGame(game);
	return getTimelineProgress(scoring, resolveSportConfig(scoring.sportType), resolveLeagueConfig(scoring));
};

export const scoreLiveGame = (input: LiveScoringInput, prefs: ScoringPrefs, gameBoost: number, favoriteTeamIds?: Set<string>): PowerScore => (
	scoreGame(toScoringGame(input.game), scoringContextFor(input), scoreOptionsFor(input.game, prefs, gameBoost, favoriteTeamIds))
);

export const toLiveScore = (score: PowerScore): LiveScore => ({
	...toLegacyPowerScoreResult(score),
	breakdown: {
		modeId: score.modeId,
		signals: score.signals,
		boosts: score.boosts,
		reasons: score.reasons,
		frozen: score.frozen,
		scaledSubtotal: score.scaledSubtotal,
		signalCeiling: score.signalCeiling,
		...(score.classicTotal !== undefined ? { classicTotal: score.classicTotal } : {}),
		...(score.blend ? { blend: score.blend } : {}),
		...(score.rivalry ? { rivalry: score.rivalry } : {}),
	},
});

export const toLegacyPowerScoreResult = (score: PowerScore): PowerScoreResult => ({
	gameId: score.gameId,
	total: score.total,
	closeness: signalPoints(score, 'closeness'),
	lateGame: signalPoints(score, 'lateGame'),
	momentum: signalPoints(score, 'momentum'),
	leadChanges: signalPoints(score, 'leadChanges'),
	comeback: signalPoints(score, 'comeback'),
	...(score.winProbabilityVariance !== undefined ? { winProbabilityVariance: score.winProbabilityVariance } : {}),
	reason: score.reason,
	onBreak: score.onBreak,
	...(score.frozen ? {} : { breakPenalty: score.breakPenalty }),
	signalsSubtotal: score.scaledSubtotal,
	favoriteBonus: boostPoints(score, 'favoriteBoost'),
	favoriteTeamCount: score.boosts.find(boost => boost.id === 'favoriteBoost')?.meta?.teams ?? 0,
	gameBoost: boostPoints(score, 'gameBoost'),
	scoringOpportunityBoost: boostPoints(score, 'scoringOpportunity'),
	postseasonBoost: boostPoints(score, 'postseasonBoost'),
});

