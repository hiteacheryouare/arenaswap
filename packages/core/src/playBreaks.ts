import { leagueConfigMap, sportTypeConfigMap } from 'powerscore';
import { hockeyFlowTypes, pitchTypes, type CommercialBreakEntry } from './commercialBreaks';
import type { Game, LeagueId } from './types';

/*
	Content-aware switching: a switch away from a game waits until that game stops, so the at-bat,
	the snap or the possession being watched isn't cut off. The signals and caps were measured
	against nine days of recorded polls: the scoreboard runs 27–45s behind play, about as long as
	a stoppage, so a switch lands on the break a typical stream is only now showing.
*/

export type PlayBreakSport = 'baseball' | 'football' | 'basketball' | 'hockey';

// The game as it stood at one poll, for a later poll to be compared against.
export interface PlayMark {
	lastPlayId?: string;
	period: number;
	clockSeconds: number;
	homeScore: number;
	awayScore: number;
	half?: string;
	batterId?: string;
	pitcherId?: string;
	outs?: number;
}

const sportCapMs: Record<PlayBreakSport, number> = {
	baseball: 120_000,
	football: 45_000,
	basketball: 90_000,
	hockey: 90_000,
};
const leagueCapMs: Partial<Record<LeagueId, number>> = {
	cbase: 150_000,
	csoft: 100_000,
};
// Feeds too stale to time a break by: holding there lands no more switches on a dead ball.
const unheldLeagues: ReadonlySet<LeagueId> = new Set(['ncaaf', 'ncaamh']);

// The scoreboard clock only refreshes along with a new play, so one unchanged reading proves
// little. The same clock three polls running does.
const clockStoppedPolls = 3;

// Steals ("Bad Pass Turnover", "Lost Ball Turnover") are live; "No Foul" and friends are not plays.
const basketballDeadBallTypes = /foul|timeout|traveling|kicked ball|lane|delay of game|3-seconds|double dribble|back court|second turnover|shot clock|goaltending|jump ?ball|end period|end game|substitution|free throw|challenge|review|ejection|technical|inbound turnover|out of bounds|offensive charge/;
const basketballNonPlays = /^no (foul|violation|turnover|shot)/;

const playType = (game: Game): string => (game.lastPlayType ?? '').toLowerCase();
const margin = (game: Game): number => Math.abs(game.homeTeam.score - game.awayTeam.score);
const regularPeriods = (game: Game): number => leagueConfigMap[game.league]?.regularPeriods ?? 4;

export const playBreakSport = (game: Pick<Game, 'league' | 'sportType'>): PlayBreakSport | undefined => {
	if (game.sportType === 'baseball' || game.sportType === 'softball') return 'baseball';
	if (game.sportType === 'soccer' || unheldLeagues.has(game.league)) return undefined;
	return game.sportType;
};

export const playBreakCapMs = (game: Pick<Game, 'league' | 'sportType'>): number => {
	const sport = playBreakSport(game);
	return leagueCapMs[game.league] ?? (sport ? sportCapMs[sport] : 0);
};

export const markPlay = (game: Game): PlayMark => ({
	lastPlayId: game.lastPlayId,
	period: game.period,
	clockSeconds: game.clockSeconds,
	homeScore: game.homeTeam.score,
	awayScore: game.awayTeam.score,
	half: game.topOfInning === undefined ? undefined : `${game.topOfInning ? 'top' : 'bottom'}${game.period}`,
	batterId: game.atBat?.batter.id,
	pitcherId: game.atBat?.pitcher.id,
	outs: game.bso?.outs,
});

// Past the sport's widest closeness margin, where PowerScore already calls it a blowout.
const isBlowout = (game: Game): boolean => {
	const widest = sportTypeConfigMap[game.sportType]?.closenessMargins[2];
	return widest !== undefined && margin(game) > widest;
};

// Between periods, held up, or in a commercial: nothing on screen for a switch to cut into.
export const isPlayStopped = (game: Game, entry: CommercialBreakEntry | undefined): boolean => (
	game.status !== 'in' || game.intermission === true || game.delayed === true || game.inningBreak === true || entry?.kind !== undefined
);

const baseballDecider = (game: Game): boolean => {
	if (game.period < regularPeriods(game) || game.topOfInning === undefined) return false;
	const [batting, fielding] = game.topOfInning ? [game.awayTeam, game.homeTeam] : [game.homeTeam, game.awayTeam];
	const deficit = fielding.score - batting.score;
	const runners = Object.values(game.baseRunners ?? {}).filter(Boolean).length;
	return (deficit > 0 && deficit <= runners + 1) || (deficit === 0 && !game.topOfInning);
};

const footballDecider = (game: Game): boolean => {
	if (game.league === 'ncaaf' && game.period > regularPeriods(game)) return true;
	if (game.period < regularPeriods(game) || game.clockSeconds > 120 || margin(game) > 8) return false;
	const yardsToGoal = game.yardLine === undefined ? undefined : (game.possessionTeamId === game.homeTeam.id ? 100 - game.yardLine : game.yardLine);
	return game.down === 4 || (yardsToGoal !== undefined && yardsToGoal <= 35);
};

// The moments a switch should not sit out a hold for: the last chance to tie or win.
export const isDecisiveMoment = (game: Game): boolean => {
	if (game.status !== 'in') return false;
	const sport = playBreakSport(game);
	if (sport === 'baseball') return baseballDecider(game);
	if (sport === 'football') return footballDecider(game);
	if (sport === 'basketball') return game.period >= regularPeriods(game) && game.clockSeconds <= 30 && margin(game) <= 3;
	if (sport === 'hockey') return game.period >= regularPeriods(game) && game.clockSeconds <= 60 && margin(game) <= 1;
	return false;
};

const scored = (current: PlayMark, mark: PlayMark): boolean => current.homeScore !== mark.homeScore || current.awayScore !== mark.awayScore;

// Whether play has stopped at least once since `mark`. `clockPolls` counts the polls in a row,
// this one included, that the clock has read the same.
export const reachedPlayBreak = (game: Game, mark: PlayMark, clockPolls: number): boolean => {
	const sport = playBreakSport(game);
	if (!sport) return true;
	const current = markPlay(game);
	if (current.period !== mark.period) return true;
	const type = playType(game);
	const newPlay = current.lastPlayId !== undefined && current.lastPlayId !== mark.lastPlayId;
	if (sport === 'baseball') {
		if (current.half !== mark.half || current.outs !== mark.outs || scored(current, mark)) return true;
		if (current.pitcherId !== undefined && mark.pitcherId !== undefined && current.pitcherId !== mark.pitcherId) return true;
		// A pinch hitter takes over the count, so only a fresh one means a new plate appearance.
		const freshCount = (game.bso?.balls ?? 0) + (game.bso?.strikes ?? 0) === 0;
		if (current.batterId !== undefined && mark.batterId !== undefined && current.batterId !== mark.batterId && freshCount) return true;
		// The ball put in play ends the plate appearance; the break detector counts it as a pitch.
		return newPlay && (type === 'play result' || !pitchTypes.test(type));
	}
	if (sport === 'football') return newPlay;
	if (clockPolls >= clockStoppedPolls) return true;
	if (sport === 'hockey') return scored(current, mark) || (newPlay && !hockeyFlowTypes.test(type));
	return newPlay && basketballDeadBallTypes.test(type) && !basketballNonPlays.test(type);
};

export interface HeldSwitch {
	gameId: string;
	tabId: number;
	reason?: string;
	leavingGameId: string;
	sport: PlayBreakSport;
	holdUntil: number;
	mark: PlayMark;
	// The clock at the last poll, and how many polls in a row it has read that.
	clockSeconds: number;
	clockPolls: number;
}

export interface HoldTarget {
	gameId: string;
	tabId: number;
	reason?: string;
}

export interface HoldCheck {
	now: number;
	// Whether this pass carries a fresh poll of the game being left, rather than another league's.
	observed: boolean;
	// Whether the game being left is still the one on screen.
	watching: boolean;
	arriving?: Game;
}

export type HoldVerdict =
	| { release: false; held: HeldSwitch }
	| { release: true; waitedFor?: PlayBreakSport };

const skipsHold = (leaving: Game, arriving: Game | undefined): boolean => (
	isBlowout(leaving) || (arriving !== undefined && isDecisiveMoment(arriving) && !isDecisiveMoment(leaving))
);

// Null when there is nothing to wait for: soccer, a game already stopped or out of reach, or a
// target at the moment that decides it.
export const holdSwitch = (target: HoldTarget, leaving: Game, entry: CommercialBreakEntry | undefined, now: number, arriving?: Game): HeldSwitch | null => {
	const sport = playBreakSport(leaving);
	if (!sport || isPlayStopped(leaving, entry) || skipsHold(leaving, arriving)) return null;
	return { ...target, leavingGameId: leaving.id, sport, holdUntil: now + playBreakCapMs(leaving), mark: markPlay(leaving), clockSeconds: leaving.clockSeconds, clockPolls: 1 };
};

// `waitedFor` is only set when play actually stopped, not when the cap ran out or the user moved on.
export const checkHeldSwitch = (held: HeldSwitch, leaving: Game | undefined, entry: CommercialBreakEntry | undefined, { now, observed, watching, arriving }: HoldCheck): HoldVerdict => {
	if (!leaving || !watching || skipsHold(leaving, arriving)) return { release: true };
	const clockPolls = !observed ? held.clockPolls : leaving.clockSeconds === held.clockSeconds ? held.clockPolls + 1 : 1;
	if (isPlayStopped(leaving, entry) || (observed && reachedPlayBreak(leaving, held.mark, clockPolls))) return { release: true, waitedFor: held.sport };
	if (now >= held.holdUntil) return { release: true };
	return { release: false, held: observed ? { ...held, clockSeconds: leaving.clockSeconds, clockPolls } : held };
};
