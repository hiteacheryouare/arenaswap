import { leagueConfigMap, type Side } from 'powerscore';
import { nextClockStall, type ClockStallEntry } from './scoring';
import type { Game, LeagueId } from './types';

/*
	Spots commercial breaks from the scoreboard alone, one poll at a time. Each sport family reads
	the feed differently: baseball from its inning text and pitcher, the NFL and basketball from the
	play types our sources log for TV timeouts, college football from the plays a break follows, the
	NHL from where its TV timeouts fall on the clock. Leagues whose feed carries no plays fall back to
	a frozen clock, and soccer has no breaks during play.

	The rules and their thresholds were measured against nine days of recorded games; run
	`npm run powerscore:breaks` to score them again.
*/

export type CommercialBreakKind =
	| 'inningBreak'
	| 'pitchingChange'
	| 'tvTimeout'
	| 'teamTimeout'
	| 'twoMinuteWarning'
	| 'periodEnd'
	| 'scoreBreak'
	| 'clockStall';

export interface CommercialBreakEntry {
	kind?: CommercialBreakKind;
	lastPlayId?: string;
	// When the current last play first showed up.
	lastPlaySeenAt: number;
	// Baseball: who was pitching, in which half, and whether a pitch has been thrown in it yet.
	pitcherId?: string;
	half?: string;
	pitchedThisHalf?: boolean;
	// NHL: the TV timeout marks (minutes remaining) already used, by period.
	usedTvMarks?: Record<number, number[]>;
	// College football: the scoreboard clock when the last play arrived, and whether it had moved
	// for each of the most recent plays, newest last.
	clockAtLastPlay?: number;
	clockMovedForPlays?: boolean[];
	clockStall?: ClockStallEntry;
}

export interface CommercialBreakInput {
	now: number;
	// As the scoring context carries it: a side, or `true` when the feed only says one is on.
	powerPlay?: Side | boolean;
}

type Rule = (game: Game, previous: CommercialBreakEntry, next: CommercialBreakEntry, input: CommercialBreakInput) => CommercialBreakKind | undefined;

const clockStallPolls = 8;
const lateClockSeconds = 120;
const nhlTvMarkMinutes = [14, 10, 6];
// An NHL stoppage often ends before our sources even post it, so one only counts as the TV timeout
// once it has stayed on screen this long.
const nhlStoppageConfirmMs = 30_000;
const staleFeedWindow = 10;
const staleFeedFrozenShare = 0.8;

const playType = (game: Game): string => (game.lastPlayType ?? '').toLowerCase();
const isNewPlay = (game: Game, previous: CommercialBreakEntry): boolean => game.lastPlayId !== previous.lastPlayId;
const quietFor = (next: CommercialBreakEntry, now: number): number => now - next.lastPlaySeenAt;

const margin = (game: Game): number => Math.abs(game.homeTeam.score - game.awayTeam.score);

// The last two minutes of a close game: coaches call timeouts to draw up the final play, and the
// fan wants to see the inbound or the snap. Only a broadcast's own TV timeout counts then.
const isCloseFinish = (game: Game, closeMargin: number): boolean => {
	const regularPeriods = leagueConfigMap[game.league]?.regularPeriods ?? 4;
	return game.period >= regularPeriods && game.clockSeconds <= lateClockSeconds && margin(game) <= closeMargin;
};

// The last two minutes of either half, whatever the score. A team timeout there is the offense
// saving the clock, and a score is followed straight by the kickoff: the broadcast saves its break
// for the two-minute timeout. College plays carry their own clock ("Timeout Kansas, clock 00:59",
// "(01:21) field goal attempt"), which is the one to trust: the college scoreboard clock can sit
// frozen for minutes while a drive goes on.
const isTwoMinuteDrill = (game: Game): boolean => {
	const stated = /clock (\d+):(\d+)|^\((\d+):(\d+)\)/.exec(game.lastPlay ?? '');
	const clockSeconds = stated ? Number(stated[1] ?? stated[3]) * 60 + Number(stated[2] ?? stated[4]) : game.clockSeconds;
	return (game.period === 2 || game.period >= 4) && clockSeconds <= lateClockSeconds;
};

export const pitchTypes = /^(ball|strike|foul|bunted|play result|automatic|stolen base|pickoff|caught stealing|balk|wild pitch|passed ball)/;

const baseballRule: Rule = (game, previous, next) => {
	if (game.inningBreak) {
		next.pitchedThisHalf = false;
		return 'inningBreak';
	}
	const half = `${game.topOfInning ? 'top' : 'bottom'}${game.period}`;
	const pitcherId = game.atBat?.pitcher.id;
	const pitched = pitchTypes.test(playType(game));
	const sameHalf = half === previous.half;
	next.half = half;
	if (pitcherId !== undefined) next.pitcherId = pitcherId;
	// The new half opens still showing the last one's three outs for a poll, so three don't count.
	const outs = game.bso?.outs ?? 0;
	next.pitchedThisHalf = (sameHalf && previous.pitchedThisHalf === true) || (pitched && playType(game) !== 'play result') || (outs > 0 && outs < 3);

	// The half flips to Top or Bot before the new half's pitcher is filled in, so a new name only
	// means a pitching change once somebody has already pitched this half.
	const relieved = sameHalf && previous.pitchedThisHalf === true && pitcherId !== undefined && previous.pitcherId !== undefined && pitcherId !== previous.pitcherId;
	if (relieved) return 'pitchingChange';
	if (previous.kind === 'pitchingChange' && sameHalf && !(isNewPlay(game, previous) && pitched)) return 'pitchingChange';
	return undefined;
};

const proFootballTvTypes: Record<string, CommercialBreakKind> = {
	'official timeout': 'tvTimeout',
	'two-minute warning': 'twoMinuteWarning',
	'end period': 'periodEnd',
};
const footballScoreTypes = /^(extra point (good|missed)|field goal good|two point (pass|rush))$/;

// The NFL logs its own TV timeouts, including the one after a score, so a score by itself isn't one.
const proFootballRule: Rule = game => proFootballTvTypes[playType(game)];

const isStaleFeed = (moved: boolean[] | undefined): boolean => (
	moved !== undefined && moved.length >= staleFeedWindow && moved.filter(entry => !entry).length / moved.length >= staleFeedFrozenShare
);

// A college scoreboard whose clock stops moving between plays has stopped being kept live, and its
// plays turn up a minute or more late: too late to time a break by. Only the end of a quarter is
// trusted then.
const trackCollegeClock = (game: Game, previous: CommercialBreakEntry, next: CommercialBreakEntry): boolean => {
	if (!isNewPlay(game, previous)) return isStaleFeed(next.clockMovedForPlays);
	const moved = previous.clockAtLastPlay === undefined || game.clockSeconds !== previous.clockAtLastPlay;
	next.clockAtLastPlay = game.clockSeconds;
	next.clockMovedForPlays = [...(previous.clockMovedForPlays ?? []), moved].slice(-staleFeedWindow);
	return isStaleFeed(next.clockMovedForPlays);
};

// No TV timeouts in the college feed, so a team timeout, the end of a quarter or the kick after a
// score stands in for one. Each lasts as long as it is the last play.
const collegeFootballRule: Rule = (game, previous, next) => {
	const type = playType(game);
	const stale = trackCollegeClock(game, previous, next);
	if (type === 'end period') return 'periodEnd';
	if (stale || isTwoMinuteDrill(game)) return undefined;
	if (type === 'timeout') return 'teamTimeout';
	if (footballScoreTypes.test(type)) return 'scoreBreak';
	return undefined;
};

const basketballTvTypes: Record<string, CommercialBreakKind> = {
	'full timeout': 'teamTimeout',
	'official timeout': 'tvTimeout',
	'official tv timeout': 'tvTimeout',
	'media timeout': 'tvTimeout',
	'end period': 'periodEnd',
};
// Plays logged during a timeout that don't mean the ball is back in play.
const basketballDeadBallTypes = /^(substitution|full timeout|reset timeout|official( tv)? timeout|media timeout|end period)$/;

const basketballRule: Rule = (game, previous) => {
	const type = playType(game);
	const marker = basketballTvTypes[type];
	if (marker) return marker === 'teamTimeout' && isCloseFinish(game, 6) ? undefined : marker;
	if (previous.kind && basketballDeadBallTypes.test(type)) return previous.kind;
	return undefined;
};

// Plays that happen with the puck in play; anything else on the scoreboard is a stoppage.
export const hockeyFlowTypes = /^(face off|shot|missed|blocked|hit|giveaway|takeaway|goal|period start|period end|end of game|shootout end)$/;

// Three TV timeouts a period, each at the first stoppage after 14:00, 10:00 and 6:00 remain. Never
// straight after an icing, and never during a power play. A mark is only used up once the stoppage
// has lasted long enough to be the TV timeout, so a whistle that was over before the feed showed it
// leaves the mark for the next one.
const nhlRule: Rule = (game, previous, next, { now, powerPlay }) => {
	if (previous.kind === 'tvTimeout' && !isNewPlay(game, previous)) return 'tvTimeout';
	const text = (game.lastPlay ?? '').toLowerCase();
	const announced = text.startsWith('tv timeout');
	const onPowerPlay = powerPlay !== undefined && powerPlay !== false;
	const stoppage = !hockeyFlowTypes.test(playType(game));
	const eligible = stoppage && game.period <= 3 && !text.includes('icing') && !onPowerPlay && quietFor(next, now) >= nhlStoppageConfirmMs;
	const used = previous.usedTvMarks?.[game.period] ?? [];
	const due = nhlTvMarkMinutes.filter(mark => game.clockSeconds < mark * 60 && !used.includes(mark));
	if ((announced || eligible) && due.length > 0) {
		next.usedTvMarks = { ...previous.usedTvMarks, [game.period]: [...used, Math.max(...due)] };
		return 'tvTimeout';
	}
	return announced ? 'tvTimeout' : undefined;
};

const clockStallRule: Rule = (game, previous, next) => {
	next.clockStall = nextClockStall(game, previous.clockStall);
	return (next.clockStall?.stallCount ?? 0) >= clockStallPolls ? 'clockStall' : undefined;
};

const rulesByLeague: Partial<Record<LeagueId, Rule>> = {
	nfl: proFootballRule,
	ufl: proFootballRule,
	ncaaf: collegeFootballRule,
	nhl: nhlRule,
};

const ruleFor = (game: Pick<Game, 'league' | 'sportType'>): Rule | undefined => {
	const leagueRule = rulesByLeague[game.league];
	if (leagueRule) return leagueRule;
	if (game.sportType === 'baseball' || game.sportType === 'softball') return baseballRule;
	if (game.sportType === 'basketball') return basketballRule;
	if (game.sportType === 'hockey') return clockStallRule;
	return undefined;
};

// Whether a league's games are ever put on a commercial break. Soccer's run straight through.
export const hasCommercialBreaks = (game: Pick<Game, 'league' | 'sportType'>): boolean => ruleFor(game) !== undefined;

export const nextCommercialBreak = (game: Game, previous: CommercialBreakEntry | undefined, input: CommercialBreakInput): CommercialBreakEntry => {
	const before: CommercialBreakEntry = previous ?? { lastPlaySeenAt: input.now };
	const next: CommercialBreakEntry = {
		...before,
		kind: undefined,
		lastPlayId: game.lastPlayId,
		lastPlaySeenAt: previous && !isNewPlay(game, before) ? before.lastPlaySeenAt : input.now,
	};
	if (game.intermission || game.delayed) return next;
	const kind = ruleFor(game)?.(game, before, next, input);
	return kind ? { ...next, kind } : next;
};
