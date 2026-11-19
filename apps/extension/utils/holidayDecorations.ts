import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { primaryCondition } from '@arenaswap/ui/src/components/weatherUtils';

export { maxTreats, stockingFills, type stockingFill } from '@arenaswap/ui/src/components/stockingFills';

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
	fireworks: boolean;
	falling: fallingKind | null;
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

export const thanksgivingDate = (year: number): Date => {
	const firstOfNovember = new Date(year, 10, 1);
	const firstThursday = 1 + ((4 - firstOfNovember.getDay() + 7) % 7);
	return new Date(year, 10, firstThursday + 21);
};

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

export type demoSeason = 'real' | 'thanksgiving' | 'december' | 'christmas' | 'boxingDay' | 'julyFourth';

export const demoSeasons: readonly demoSeason[] = ['real', 'thanksgiving', 'december', 'christmas', 'boxingDay', 'julyFourth'];

export const isDemoSeason = (value: unknown): value is demoSeason =>
	demoSeasons.includes(value as demoSeason);

export const resolveDecorationDate = (now: Date, season: demoSeason): Date => {
	if (season === 'thanksgiving') return thanksgivingDate(now.getFullYear());
	if (season === 'december') return new Date(now.getFullYear(), 11, 14, 12);
	if (season === 'christmas') return new Date(now.getFullYear(), 11, 25, 12);
	if (season === 'boxingDay') return new Date(now.getFullYear(), 11, 26, 12);
	if (season === 'julyFourth') return new Date(now.getFullYear(), 6, 4, 12);
	return now;
};

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

export const inningProgress = (game: Game): number => {
	const outs = game.bso?.outs ?? 0;
	const topOfInning = game.topOfInning ?? true;
	return clamp01(((topOfInning ? 0 : 3) + outs) / 6);
};

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
