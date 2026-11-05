import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { primaryCondition } from '@arenaswap/ui/src/components/weatherUtils';

export type fallingKind = 'snow' | 'leaves';

export interface holidayDecorationPrefs {
	holidayDecorationsEnabled: boolean;
	holidaySnowEnabled: boolean;
	holidayLightsEnabled: boolean;
	holidayLeavesEnabled: boolean;
	holidayChristmasEnabled: boolean;
	holidayBuntingEnabled: boolean;
	holidayFireworksEnabled: boolean;
}

export interface decorationState {
	lights: boolean;
	christmas: boolean;
	bunting: boolean;
	// Armed for the day. What actually sets one off is a score change, which the screen watches.
	fireworks: boolean;
	falling: fallingKind | null;
	// 0 to 1, how buried the floor of the screen is right now.
	depth: number;
}

export const noDecorations: decorationState = { lights: false, christmas: false, bunting: false, fireworks: false, falling: null, depth: 0 };

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

// ESPN varies the wording a lot — "Light Snow", "Mostly cloudy w/ snow", "Heavy Snow/Wind" — so
// this reads the primary condition of a compound label and then matches on the word rather than the
// whole string. Sleet counts; freezing rain does not, since neither of them settles as snow.
export const isSnowing = (game: Game): boolean => {
	const label = game.weather?.conditionLabel;
	if (!label) return false;
	const primary = primaryCondition(label);
	return primary.includes('snow') || primary.includes('sleet') || primary === 'flurries';
};

// US Thanksgiving: the fourth Thursday of November.
export const thanksgivingDate = (year: number): Date => {
	const firstOfNovember = new Date(year, 10, 1);
	const firstThursday = 1 + ((4 - firstOfNovember.getDay() + 7) % 7);
	return new Date(year, 10, firstThursday + 21);
};

// The Monday-to-Sunday week around it, so Tuesday and Wednesday college football are included.
export const isThanksgivingWeek = (now: Date): boolean => {
	const thanksgiving = thanksgivingDate(now.getFullYear());
	const monday = new Date(thanksgiving);
	monday.setDate(thanksgiving.getDate() - 3);
	const sunday = new Date(thanksgiving);
	sunday.setDate(thanksgiving.getDate() + 3);
	sunday.setHours(23, 59, 59, 999);
	monday.setHours(0, 0, 0, 0);
	return now >= monday && now <= sunday;
};

export const isDecember = (now: Date): boolean => now.getMonth() === 11;

const isCalendarDay = (date: Date, month: number, day: number): boolean => date.getMonth() === month && date.getDate() === day;

// The last Christmas tip-off is 10:30 at night on the East Coast, so a game still going after
// midnight keeps the day it started on.
export const isGameOnDay = (game: Game, now: Date, month: number, day: number): boolean => {
	if (isCalendarDay(now, month, day)) return true;
	if (game.status !== 'in' || !game.startTime) return false;
	const start = new Date(game.startTime);
	return !Number.isNaN(start.getTime()) && isCalendarDay(start, month, day);
};

export const isChristmasGame = (game: Game, now: Date): boolean => {
	if (game.sportType === 'football' && isGameOnDay(game, now, 11, 24)) return true;
	if (game.league === 'nba' || game.league === 'nfl') return isGameOnDay(game, now, 11, 25);
	return game.sportType === 'soccer' && isGameOnDay(game, now, 11, 26);
};

const gamesPlayed = (record: string | undefined): number | null => {
	const parts = record?.split('-').map(Number);
	if (!parts || parts.length < 2 || parts.some(part => !Number.isInteger(part) || part < 0)) return null;
	return parts.reduce((sum, part) => sum + part, 0);
};

export const homeOpenerSeriesGames = 3;

// The regular season's start date is nowhere on the scoreboard, but the home team's home record
// is, and it reads 0-0 on the day the park opens.
export const isHomeOpenerSeries = (game: Game): boolean => {
	if (game.league !== 'mlb' || game.isPreseason || game.isPostseason) return false;
	const played = gamesPlayed(game.homeTeam.homeRecord);
	if (played === null) return false;
	const playedBefore = game.status === 'post' ? played - 1 : played;
	return playedBefore < homeOpenerSeriesGames;
};

export const hasBunting = (game: Game): boolean => (
	game.league === 'mlb' && !game.isPreseason && (game.isPostseason === true || isHomeOpenerSeries(game))
);

const playsIn = (game: Game, abbreviation: string): boolean => (
	game.homeTeam.abbreviation === abbreviation || game.awayTeam.abbreviation === abbreviation
);

export const hasFireworks = (game: Game, now: Date): boolean => {
	if (game.league === 'mls') return isGameOnDay(game, now, 6, 4);
	if (game.league !== 'mlb') return false;
	return isGameOnDay(game, now, 6, 4) || (playsIn(game, 'TOR') && isGameOnDay(game, now, 6, 1));
};

export interface stockingFill {
	treats: number;
	coal: boolean;
}

export const maxTreats = 3;

const fillFor = (score: number, opponentScore: number, lostAtFinal: boolean): stockingFill => {
	if (lostAtFinal) return { treats: 0, coal: true };
	const leader = Math.max(score, opponentScore);
	if (score <= 0 || leader <= 0) return { treats: 0, coal: false };
	return { treats: Math.max(1, Math.round((maxTreats * score) / leader)), coal: false };
};

// The leader's stocking is the full one, and the other fills in proportion. A draw at the final
// leaves both without coal; a shootout does not, since somebody still lost it.
export const stockingFills = (game: Game): { home: stockingFill; away: stockingFill } => {
	const home = game.homeTeam.score;
	const away = game.awayTeam.score;
	const final = game.status === 'post';
	const homeDecider = home === away ? (game.homeTeam.shootoutScore ?? 0) : home;
	const awayDecider = home === away ? (game.awayTeam.shootoutScore ?? 0) : away;
	return {
		home: fillFor(home, away, final && homeDecider < awayDecider),
		away: fillFor(away, home, final && awayDecider < homeDecider),
	};
};

export type demoSeason = 'real' | 'thanksgiving' | 'december' | 'christmas' | 'boxingDay' | 'julyFourth';

export const demoSeasons: readonly demoSeason[] = ['real', 'thanksgiving', 'december', 'christmas', 'boxingDay', 'julyFourth'];

export const isDemoSeason = (value: unknown): value is demoSeason =>
	demoSeasons.includes(value as demoSeason);

// Demo mode borrows a date rather than forcing a decoration, so what it shows is a state the real
// rules can actually produce. Thanksgiving is computed for the current year rather than pinned to
// one, so this cannot go stale.
export const resolveDecorationDate = (now: Date, season: demoSeason): Date => {
	if (season === 'thanksgiving') return thanksgivingDate(now.getFullYear());
	if (season === 'december') return new Date(now.getFullYear(), 11, 14, 12);
	if (season === 'christmas') return new Date(now.getFullYear(), 11, 25, 12);
	if (season === 'boxingDay') return new Date(now.getFullYear(), 11, 26, 12);
	if (season === 'julyFourth') return new Date(now.getFullYear(), 6, 4, 12);
	return now;
};

// How far through the current period, quarter, half or inning the game is.
//
// The clock sports read it off the clock and the league's own period length. Soccer's clock is
// total elapsed rather than per-half, so the second half runs 45:00 to 90:00 and needs the offset
// taken back off. The inning sports have no clock at all and are handled separately.
export const periodProgress = (game: Game): number => {
	const league = leagueConfigMap[game.league];
	if (!league) return 0;
	if (league.periodDurationSecs <= 0) return inningProgress(game);

	const period = Math.max(1, game.period);
	const clockRunsUp = game.sportType === 'soccer';
	if (clockRunsUp) {
		const elapsedThisPeriod = game.clockSeconds - (period - 1) * league.periodDurationSecs;
		return clamp01(elapsedThisPeriod / league.periodDurationSecs);
	}
	return clamp01(1 - game.clockSeconds / league.periodDurationSecs);
};

// Baseball and softball have no clock, so progress through an inning is read off the outs. Six to
// an inning, three to a half, which makes each out a sixth and the half change the midpoint rather
// than a second run at the whole range. An inning where nobody is retired sits at zero the whole
// time, which is exactly when it is longest — the alternative was to read the base runners too, and
// a pile that shrinks because a runner was thrown out at second is a stranger thing to ship.
export const inningProgress = (game: Game): number => {
	const outs = game.bso?.outs ?? 0;
	// Defaults to the top: an unreported half should read as the start of the inning, not its middle.
	const topOfInning = game.topOfInning ?? true;
	return clamp01(((topOfInning ? 0 : 3) + outs) / 6);
};

// Every period ends deeper than the one before it, so a game gets visibly worse to play in as it
// goes. Overtime keeps the regulation maximum rather than pushing past it.
export const accumulationDepth = (game: Game): number => {
	if (game.status === 'pre') return 0;
	if (game.status === 'post') return 1;
	const league = leagueConfigMap[game.league];
	if (!league) return 0;
	const ceiling = clamp01(Math.max(1, game.period) / league.regularPeriods);
	return clamp01(periodProgress(game) * ceiling);
};

export const resolveDecorations = (game: Game, now: Date, prefs: holidayDecorationPrefs): decorationState => {
	if (!prefs.holidayDecorationsEnabled) return noDecorations;

	// Thanksgiving is four days a year and snow is most of a winter, so the rarer one wins the week.
	const leaves = prefs.holidayLeavesEnabled && game.sportType === 'football' && isThanksgivingWeek(now);
	const snow = prefs.holidaySnowEnabled && isSnowing(game);
	const falling: fallingKind | null = leaves ? 'leaves' : snow ? 'snow' : null;

	return {
		lights: prefs.holidayLightsEnabled && isDecember(now),
		christmas: prefs.holidayChristmasEnabled && isChristmasGame(game, now),
		bunting: prefs.holidayBuntingEnabled && hasBunting(game),
		fireworks: prefs.holidayFireworksEnabled && hasFireworks(game, now),
		falling,
		depth: falling ? accumulationDepth(game) : 0,
	};
};
