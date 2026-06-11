import { BackgroundStateSchema } from '@arenaswap/core';
import { createFavoriteTeamKey, leagueConfigs } from '@arenaswap/core/constants';
import type {
	BackgroundState,
	Game,
	LeagueId,
	SportType,
} from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';

export type popupView = 'main' | 'setup' | 'detail';
export type leagueGroup = { league: LeagueId; games: Game[] };
export type dateGroup = { dateLabel: string; games: Game[] };

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
	'Polishing the trophy case...',
	'Brushing up on sports trivia...',
	'Organizing the tailgate party...',
	'Getting the face paint ready...',
	'Coordinating team uniforms...',
	'Running the numbers...',
	'Analyzing the stats...',
	'Launching the fireworks...',
	'Getting the light show ready...',
	'Checking the weather for game day...',
	'Updating the fantasy football lineup...',
	'Yelling at the TV...',
	'Yelling at the refs...',
	'go birds',
	'Reviewing the coach\'s clipboard...',
	'Checking if the hot dog guy is ready...',
	'Deflating... er, inflating the footballs...',
	'Consulting the Vegas odds...',
	'Tightening the batting gloves...',
	'Stretching out the kicker\'s hamstring...',
	'Reviewing the contract negotiations...',
	'Ordering the victory pizza...',
	'Checking the backup QB\'s confidence level...',
	'Reconsidering that trade...',
	'Polishing up the player stats cards...',
	'Setting up the slow-motion replay...',
	'Confirming the coin flip is real...',
	'Briefing the ball boy...',
	'Turning up the crowd noise...',
	'Dusting off the championship merchandise...',
	'Hydrating the water boy...',
];

export const getRandomLoadingMessage = (): string => (
	loadingMessages[Math.floor(Math.random() * loadingMessages.length)] ?? ''
);

export const noGamesMessages: { title: string; sub: string }[] = [
	{ title: 'Still waiting for tip-off. 🕐', sub: 'No live games in your selected leagues.' },
	{ title: 'The arena\'s dark.', sub: 'No live action in your leagues. Check back when the games kick off.' },
	{ title: 'It\'s a slow sports day.', sub: 'Nothing live right now.' },
	{ title: 'Even the refs are taking a break.', sub: 'No live games detected across your selected leagues.' },
	{ title: 'The scoreboard is still.', sub: 'Your leagues are quiet. Check back when the games tip off.' },
	{ title: 'The hot dog guy left. 🌭', sub: 'No live action in your leagues. Nothing to track right now.' },
	{ title: 'Checking under the bleachers...', sub: 'Still no live games in your selected leagues.' },
];

export const getRandomNoGamesMessage = (): { title: string; sub: string } => (
	noGamesMessages[Math.floor(Math.random() * noGamesMessages.length)] ?? noGamesMessages[0]!
);
export const leaguesBySportType = leagueConfigs.reduce<Record<SportType, typeof leagueConfigs>>((groups, config) => {
	if (config.sportType in groups) groups[config.sportType].push(config);
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

export const buildUpcomingComparator = (
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
) => {
	const fallbackSort = buildFavoritePinnedComparator(favoriteTeamIds, scoreByGameId);
	const dayStart = (game: Game): number => {
		if (!game.startTime) return Number.POSITIVE_INFINITY;
		const date = new Date(game.startTime);
		return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	};
	return (a: Game, b: Game): number => {
		const aDay = dayStart(a);
		const bDay = dayStart(b);
		if (aDay !== bDay) return aDay - bDay;
		return fallbackSort(a, b);
	};
};

const formatDateLabel = (dateStr: string): string => {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	const toKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	const gameDate = new Date(dateStr);
	if (toKey(gameDate) === toKey(today)) return 'Today';
	if (toKey(gameDate) === toKey(tomorrow)) return 'Tomorrow';
	return gameDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const groupByDate = (games: Game[]): dateGroup[] => {
	const groups = new Map<string, Game[]>();
	for (const game of games) {
		const key = game.startTime
			? new Date(game.startTime).toDateString()
			: 'Unknown';
		const group = groups.get(key) ?? [];
		group.push(game);
		groups.set(key, group);
	}
	return Array.from(groups.entries()).map(([key, grpGames]) => {
		const first = grpGames[0];
		return {
			dateLabel: first?.startTime ? formatDateLabel(first.startTime) : 'Upcoming',
			games: grpGames,
		};
	});
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

export const normalizeBackgroundState = (value: unknown): BackgroundState =>
	BackgroundStateSchema.parse(value);

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
