import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

export type fallingKind = 'snow' | 'leaves';

export interface holidayDecorationPrefs {
	holidayDecorationsEnabled: boolean;
	holidaySnowEnabled: boolean;
	holidayLightsEnabled: boolean;
	holidayLeavesEnabled: boolean;
}

export interface decorationState {
	lights: boolean;
	falling: fallingKind | null;
	// 0 to 1, how buried the floor of the screen is right now.
	depth: number;
}

export const noDecorations: decorationState = { lights: false, falling: null, depth: 0 };

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

// ESPN varies the wording a lot — "Light Snow", "Snow Showers", "Heavy Snow/Wind" — so this reads
// the primary condition of a compound label and then matches on the word rather than the whole
// string. Sleet counts; freezing rain does not, since neither of them settles as snow.
export const isSnowing = (game: Game): boolean => {
	const label = game.weather?.conditionLabel;
	if (!label) return false;
	const primary = (label.split('/')[0] ?? label).trim().toLowerCase();
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

export type demoSeason = 'real' | 'thanksgiving' | 'december';

export const demoSeasons: readonly demoSeason[] = ['real', 'thanksgiving', 'december'];

export const isDemoSeason = (value: unknown): value is demoSeason =>
	demoSeasons.includes(value as demoSeason);

// Demo mode borrows a date rather than forcing a decoration, so what it shows is a state the real
// rules can actually produce. Thanksgiving is computed for the current year rather than pinned to
// one, so this cannot go stale.
export const resolveDecorationDate = (now: Date, season: demoSeason): Date => {
	if (season === 'thanksgiving') return thanksgivingDate(now.getFullYear());
	if (season === 'december') return new Date(now.getFullYear(), 11, 14, 12);
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
		falling,
		depth: falling ? accumulationDepth(game) : 0,
	};
};
