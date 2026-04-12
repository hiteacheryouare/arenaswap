import { normalizePowerScoreResult } from '@arenaswap/core';
import { leagueConfigs } from '@arenaswap/core/constants';
import type {
	BackgroundState,
	Game,
	LeagueId,
	LeagueLogoMap,
	PowerScoreResult,
	SportType,
} from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';

export type popupView = 'main' | 'setup';
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

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object' && value !== null
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

export const normalizeBackgroundState = (value: unknown): BackgroundState => {
	if (!isObjectRecord(value)) return { games: [], scores: [], leagueLogos: {} };
	return {
		games: isGameArray(value.games) ? value.games : [],
		scores: normalizeScores(value.scores),
		leagueLogos: isLeagueLogoMap(value.leagueLogos) ? value.leagueLogos : {},
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
