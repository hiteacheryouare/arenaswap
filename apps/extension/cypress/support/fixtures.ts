import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { BackgroundState, Game, PowerScoreResult, UserPreferences } from '@arenaswap/core/types';
import type { fakeTab } from './fakeBrowser';

export const makeGame = (id: string, overrides: Partial<Game> = {}): Game => ({
	id,
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 120,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 98 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 96 },
	...overrides,
});

export const makeScore = (gameId: string, total: number, overrides: Partial<PowerScoreResult> = {}): PowerScoreResult => ({
	gameId,
	total,
	closeness: total * 0.4,
	lateGame: total * 0.3,
	momentum: total * 0.1,
	leadChanges: total * 0.1,
	comeback: total * 0.1,
	signalsSubtotal: total,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	reason: 'fixture',
	...overrides,
});

export const sixersThunder = makeGame('nba-sixers-thunder', {
	homeTeam: { id: '20', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 108 },
	awayTeam: { id: '25', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 106 },
	venueName: 'Wells Fargo Center',
	venueLocation: 'Philadelphia, PA',
});

export const bullsHeat = makeGame('nba-bulls-heat', {
	homeTeam: { id: '4', name: 'Chicago Bulls', abbreviation: 'CHI', score: 71 },
	awayTeam: { id: '14', name: 'Miami Heat', abbreviation: 'MIA', score: 88 },
	period: 3,
	clockSeconds: 540,
});

export const eaglesCowboys = makeGame('nfl-eagles-cowboys', {
	league: 'nfl',
	sportType: 'football',
	homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 24 },
	awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 21 },
	downDistance: '3rd & 5',
});

/** A close 4th-quarter game beating a blowout, so ordering by PowerScore is observable. */
export const liveState = (): BackgroundState => ({
	games: [bullsHeat, sixersThunder],
	scores: [makeScore(sixersThunder.id, 82), makeScore(bullsHeat.id, 19)],
	leagueLogos: {},
	scoreHistory: {},
	powerScoreHistory: {},
	gameBoosts: {},
	onStandbyStream: false,
	standbyStreamTabId: null,
});

export const openTabs: fakeTab[] = [
	{ id: 101, title: 'Sixers vs Thunder — Stream', url: 'https://example.test/sixers' },
	{ id: 102, title: 'Bulls vs Heat — Stream',     url: 'https://example.test/bulls' },
];

/** Stored prefs skip onboarding, which is what most flows want. */
export const onboardedPrefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
	...createDefaultUserPreferences(),
	enabledLeagues: ['nba', 'nfl'],
	...overrides,
});
