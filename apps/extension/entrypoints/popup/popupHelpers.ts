import { normalizePowerScoreResult, isObjectRecord, isFiniteNumber, isScoreSnapshotLike, isPowerScoreSnapshotLike } from '@arenaswap/core';
import { createFavoriteTeamKey, leagueConfigs } from '@arenaswap/core/constants';
import type {
	BackgroundState,
	Game,
	LeagueId,
	LeagueLogoMap,
	PowerScoreHistoryMap,
	PowerScoreResult,
	ScoreHistoryMap,
	SportType,
} from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';

export type popupView = 'main' | 'setup' | 'detail';
export type leagueGroup = { league: LeagueId; games: Game[] };

export const leagueOrder = Object.fromEntries(leagueConfigs.map((config, index) => [config.id, index])) as Record<LeagueId, number>;
export const sportTypeOrder: Record<SportType, number> = {
	basketball: 0,
	football: 1,
	hockey: 2,
	baseball: 3,
	soccer: 4,
};
export const sportTypeLabels: Record<SportType, string> = {
	basketball: 'Basketball',
	football: 'Football',
	hockey: 'Hockey',
	baseball: 'Baseball',
	soccer: 'Soccer',
};
export const leagueLabels = Object.fromEntries(leagueConfigs.map(config => [config.id, config.label])) as Record<LeagueId, string>;

export const loadingMessages: string[] = [
	'Reviewing the playbook...',
	'Studying the game film...',
	'Calling an audible...',
	'Warming up the bench...',
	'Hyping up the crowd...',
	'Cueing the walk-out music...',
	'Polishing the trophy...',
	'Synchronizing the game clock...',
	'Booting up the jumbotron...',
	'Counting the timeouts...',
	'Reviewing the replay booth...',
	'Cracking open the rulebook...',
	'Tuning the stadium speakers...',
	'Filling the water bottles...',
	'Adjusting the spotlights...',
	'Bribing the refs...',
	'Consulting the sports almanac...',
	'Considering whether to go for it on fourth down...',
	'Updating the GOAT debate...',
	'Filling the press box...',
	'Unfurling the banners...',
	'Syncing the broadcast feed...',
	'Counting the crowd...',
	'Polishing the championship rings...',
	'Hyping up the mascots...',
	'Powering up the stadium lights...',
	'Hitting the gym...',
	'Filling the coolors...',
	'Reviewing the highlight reels...',
	'Booing the commissioner...',
	'Finding the arenas...',
	'Getting a cheesesteak...',
	'Arguing with the sports bar patrons...',
	'Rearranging the fantasy league standings...',
	'Consulting the sports oracle...',
	'Challenging that play...',
	'Checking for a flag on the play...',
	'Reviewing the instant replay...',
	'Playing the hype video...',
	'Considering a mid-game snack...',
	'Planning the post-game celebration...',
	'Wearing the lucky jersey...',
	'Visualizing the victory dance...',
	'Imagining the championship parade...',
	'Polishing the trophy case...',
	'Brushing up on sports trivia...',
	'Organizing the tailgate party...',
	'Getting the face paint ready...',
	'Coordinating team uniforms...',
	'Running the numbers...',
	'Analyzing the stats...',
	'Launching the fireworks...',
	'Getting the light show ready...',
	'Reviewing the pre-game rituals...',
	'Checking the weather for game day...',
	'Updating the fantasy football lineup...',
	'Yelling at the TV...',
	'Yelling at the refs...',
	'go birds'
];

export const getRandomLoadingMessage = (): string => (
	loadingMessages[Math.floor(Math.random() * loadingMessages.length)] ?? ''
);
export const leaguesBySportType = leagueConfigs.reduce<Record<SportType, typeof leagueConfigs>>((groups, config) => {
	groups[config.sportType].push(config);
	return groups;
}, {
	basketball: [],
	football: [],
	hockey: [],
	baseball: [],
	soccer: [],
});

export const byLeague = (a: Game, b: Game) => (leagueOrder[a.league] ?? 99) - (leagueOrder[b.league] ?? 99);

export const isFavoriteTeamGame = (game: Game, favoriteTeamIds: Set<string>): boolean => (
	favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id))
	|| favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id))
);

export const buildFavoritePinnedComparator = (
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
) => (a: Game, b: Game): number => {
	const leagueDiff = (leagueOrder[a.league] ?? 99) - (leagueOrder[b.league] ?? 99);
	if (leagueDiff !== 0) return leagueDiff;
	const aFav = isFavoriteTeamGame(a, favoriteTeamIds);
	const bFav = isFavoriteTeamGame(b, favoriteTeamIds);
	if (aFav !== bFav) return aFav ? -1 : 1;
	return (scoreByGameId.get(b.id) ?? 0) - (scoreByGameId.get(a.id) ?? 0);
};

export const groupByLeague = (games: Game[]): leagueGroup[] => (
	games.reduce<leagueGroup[]>((groups, game) => {
		const last = groups[groups.length - 1];
		if (last?.league === game.league) {
			last.games.push(game);
			return groups;
		}
		return [...groups, { league: game.league, games: [game] }];
	}, [])
);

const isGameArray = (value: unknown): value is Game[] => (
	Array.isArray(value)
);

const isLeagueLogoMap = (value: unknown): value is LeagueLogoMap => (
	isObjectRecord(value)
);

const isPowerScoreLike = (value: unknown): value is Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'> => {
	if (!isObjectRecord(value)) return false;
	return typeof value.gameId === 'string';
};

const normalizeScores = (value: unknown): PowerScoreResult[] => {
	if (!Array.isArray(value)) return [];
	return value
		.filter(isPowerScoreLike)
		.map(score => normalizePowerScoreResult(score, { allowTotalOverflow: true }));
};

const normalizeScoreHistory = (value: unknown): ScoreHistoryMap => {
	if (!isObjectRecord(value)) return {};
	return Object.entries(value).reduce<ScoreHistoryMap>((acc, [gameId, snapshots]) => {
		if (!Array.isArray(snapshots)) return acc;
		acc[gameId] = snapshots.filter(isScoreSnapshotLike);
		return acc;
	}, {});
};

const normalizePowerScoreHistory = (value: unknown): PowerScoreHistoryMap => {
	if (!isObjectRecord(value)) return {};
	return Object.entries(value).reduce<PowerScoreHistoryMap>((acc, [gameId, snapshots]) => {
		if (!Array.isArray(snapshots)) return acc;
		acc[gameId] = snapshots.filter(isPowerScoreSnapshotLike);
		return acc;
	}, {});
};

const normalizeGameBoosts = (value: unknown): Record<string, number> => {
	if (!isObjectRecord(value)) return {};
	const result: Record<string, number> = {};
	for (const [k, v] of Object.entries(value)) {
		if (typeof v === 'number' && Number.isFinite(v) && v > 0) result[k] = v;
	}
	return result;
};

export const normalizeBackgroundState = (value: unknown): BackgroundState => {
	if (!isObjectRecord(value)) return { games: [], scores: [], leagueLogos: {}, scoreHistory: {}, powerScoreHistory: {}, gameBoosts: {} };
	return {
		games: isGameArray(value.games) ? value.games : [],
		scores: normalizeScores(value.scores),
		leagueLogos: isLeagueLogoMap(value.leagueLogos) ? value.leagueLogos : {},
		scoreHistory: normalizeScoreHistory(value.scoreHistory),
		powerScoreHistory: normalizePowerScoreHistory(value.powerScoreHistory),
		gameBoosts: normalizeGameBoosts(value.gameBoosts),
	};
};

export const fetchState = async (forceRefresh = false): Promise<BackgroundState> => {
	const state = await browser.runtime.sendMessage({ type: 'GET_STATE', forceRefresh });
	return normalizeBackgroundState(state);
};

export const formatTabLabel = (tab: Browser.tabs.Tab, allTabs: Browser.tabs.Tab[]): string => {
	const title = tab.title ?? '';
	if (!title) return `Tab #${tab.id}`;
	const duplicates = allTabs.filter(t => t.title === title);
	if (duplicates.length <= 1) return title.slice(0, 35);
	try {
		const pathname = new URL(tab.url ?? '').pathname;
		const truncated = pathname.length > 25 ? `${pathname.slice(0, 22)}...` : pathname;
		return `${title.slice(0, 25)} (${truncated})`;
	} catch {
		return `${title.slice(0, 30)} (#${tab.id})`;
	}
};
