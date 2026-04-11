import { LEAGUE_CONFIG_MAP, SPORT_TYPE_CONFIG_MAP, SCORER_TUNABLES, STALL_THRESHOLD_POLLS, STALL_PENALTY_MULTIPLIER } from './constants';
import type { SportTypeConfig } from './types';
import type { Game, ScoreSnapshot, PowerScoreResult } from './types';

interface Signal { score: number; reason: string; }

const toFiniteNumber = (value: unknown, fallback = 0): number => (
	typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const normalizePowerScoreResult = (
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>
): PowerScoreResult => {
	const closeness = toFiniteNumber(score.closeness);
	const lateGame = toFiniteNumber(score.lateGame);
	const momentum = toFiniteNumber(score.momentum);
	const leadChanges = toFiniteNumber(score.leadChanges);
	const comeback = toFiniteNumber(score.comeback);
	const rawTotal = closeness + lateGame + momentum + leadChanges + comeback;
	const total = toFiniteNumber(score.total, rawTotal);

	return {
		gameId: score.gameId,
		total,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		reason: typeof score.reason === 'string' ? score.reason : SCORER_TUNABLES.reasons.fallback,
		stalled: score.stalled === true,
	};
};

const getClosenessUnit = (game: Game): string => (
	SCORER_TUNABLES.reasons.closenessUnitBySportType[game.sportType] ?? SCORER_TUNABLES.reasons.defaultClosenessUnit
);

const getCloseness = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0)
		// reason string intentionally reuses 'tied' — UI label is the same
		return { score: config.zeroZeroAsFullTie ? scores.closeness.tied : scores.closeness.zeroZero, reason: reasons.tied };
	if (margin === 0) return { score: scores.closeness.tied, reason: reasons.tied };
	if (margin <= t1) return { score: scores.closeness.tight, reason: `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}` };
	if (margin <= t2) return { score: scores.closeness.close, reason: `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}` };
	if (margin <= t3) return { score: scores.closeness.fringe, reason: '' };
	return { score: scores.closeness.none, reason: '' };
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};

const ordinal = (n: number): string => {
	if (n === 1) return '1st';
	if (n === 2) return '2nd';
	if (n === 3) return '3rd';
	return `${n}th`;
};

const getLateGame = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	const leagueConfig = LEAGUE_CONFIG_MAP[game.league];
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;

	// Overtime / extra innings
	if (game.period > regularPeriods)
		return { score: scores.lateGame.overtime, reason: clockBased ? reasons.overtime : reasons.extraInnings };

	if (!clockBased) {
		// MLB: use inning number as a proxy for time pressure
		const inningTier = scores.lateGame.baseballInningTiers.find(tier => game.period >= tier.minInning);
		if (inningTier) {
			const reason = inningTier.includeReason ? `${ordinal(game.period)} ${reasons.inningSuffix}` : '';
			return { score: inningTier.score, reason };
		}
		return { score: scores.lateGame.none, reason: '' };
	}

	// Clock-based sports
	const isLastPeriod = game.period === regularPeriods;
	const isPrevPeriod = game.period === regularPeriods - 1;

	// Soccer (and any future count-up sport) reports elapsed time; convert to time remaining.
	const secsRemaining = config.clockCountsUp
		? Math.max(0, leagueConfig.periodDurationSecs - game.clockSeconds)
		: game.clockSeconds;

	if (isLastPeriod && secsRemaining <= config.lateGameCriticalSecs)
		return { score: scores.lateGame.clockBased.critical, reason: `${formatClock(secsRemaining)} ${reasons.clockLeftSuffix}` };
	if (isLastPeriod && secsRemaining <= config.lateGameTenseSecs)
		return { score: scores.lateGame.clockBased.tense, reason: `${reasons.underPrefix} ${config.lateGameTenseSecs / 60} ${reasons.minutesLeftSuffix}` };
	if (isPrevPeriod && secsRemaining <= config.lateGamePrevPeriodSecs)
		return { score: scores.lateGame.clockBased.previousPeriod, reason: '' };
	return { score: scores.lateGame.none, reason: '' };
};

const getMomentum = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0];
	const newest = history[history.length - 1];
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

	if (run >= config.momentumBigRun)
		return { score: scores.momentum.bigRun, reason: `${runTeam} ${reasons.momentumRunPrefix} ${run}-0 ${reasons.momentumRunSuffix}` };
	if (run >= config.momentumSmallRun)
		return { score: scores.momentum.smallRun, reason: `${runTeam} ${reasons.momentumRolling}` };
	return { score: scores.momentum.none, reason: '' };
};

const getLeadChanges = (history: ScoreSnapshot[]): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	let changes = 0;
	for (let i = 1; i < history.length; i++) {
		const prevDiff = history[i - 1].homeScore - history[i - 1].awayScore;
		const currDiff = history[i].homeScore - history[i].awayScore;
		if (Math.sign(prevDiff) !== Math.sign(currDiff) && !(prevDiff === 0 && currDiff === 0))
			changes++;
	}

	if (changes >= 2) return { score: scores.leadChanges.multiple, reason: reasons.leadChangeMultiple };
	if (changes === 1) return { score: scores.leadChanges.single, reason: reasons.leadChangeSingle };
	return { score: scores.leadChanges.none, reason: '' };
};

const getComeback = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldDiff = Math.abs(history[0].homeScore - history[0].awayScore);
	const newDiff = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const shrinkage = oldDiff - newDiff;

	if (shrinkage >= config.comebackThresholdBig) return { score: scores.comeback.big, reason: reasons.comebackBig };
	if (shrinkage >= config.comebackThresholdSmall) return { score: scores.comeback.moderate, reason: reasons.comebackModerate };
	return { score: scores.comeback.none, reason: '' };
};

export const computePowerScore = (
	game: Game,
	history: ScoreSnapshot[],
	stallCount: number = 0,
): PowerScoreResult => {
	if (game.intermission)
		return normalizePowerScoreResult({
			gameId: game.id,
			total: 0,
			closeness: 0,
			lateGame: 0,
			momentum: 0,
			leadChanges: 0,
			comeback: 0,
			reason: '',
			stalled: false,
		});

	const config = SPORT_TYPE_CONFIG_MAP[game.sportType] ?? SPORT_TYPE_CONFIG_MAP.basketball;

	const closeness = getCloseness(game, config);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config);
	const leadChanges = getLeadChanges(history);
	const comeback = getComeback(game, history, config);

	const stalled = stallCount >= STALL_THRESHOLD_POLLS;
	const rawTotal = closeness.score + lateGame.score + momentum.score + leadChanges.score + comeback.score;
	const total = stalled ? Math.round(rawTotal * STALL_PENALTY_MULTIPLIER) : rawTotal;

	const reason = [momentum.reason, comeback.reason, leadChanges.reason, lateGame.reason, closeness.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || SCORER_TUNABLES.reasons.fallback;

	return normalizePowerScoreResult({
		gameId: game.id,
		total,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		leadChanges: leadChanges.score,
		comeback: comeback.score,
		reason,
		stalled,
	});
};
