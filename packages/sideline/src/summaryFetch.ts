import { leagueConfigMap } from '@arenaswap/core';
import type { Game, LeagueId } from '@arenaswap/core';
import { usesFullLeagueStandings } from './standingsParse';

// Our sources send a `max-age` of five seconds at most, already counted down by their edge, so the
// browser's cache rarely lasts from a hover to the click after it. Both go through this one instead.
export const sharedRequestFreshMs = 15_000;

// A summary fetched before tip-off has no box score in it, so it only answers for the status it was
// fetched under. The league table is the same either side of a start and carries no status.
interface sharedRequest {
	startedAt: number;
	status: string | null;
	body: Promise<unknown>;
}

const requests = new Map<string, sharedRequest>();

const isFresh = (request: sharedRequest) => {
	const age = Date.now() - request.startedAt;
	return age >= 0 && age < sharedRequestFreshMs;
};

export const summaryUrl = (espnPath: string, gameId: string) => (
	`https://site.api.espn.com/apis/site/v2/sports/${espnPath}/summary?event=${encodeURIComponent(gameId)}`
);

export const standingsUrl = (espnPath: string) => (
	`https://site.api.espn.com/apis/v2/sports/${espnPath}/standings?level=3`
);

const fetchSharedJson = (url: string, status: string | null = null): Promise<unknown> => {
	for (const [key, request] of requests) if (!isFresh(request)) requests.delete(key);
	const existing = requests.get(url);
	if (existing && existing.status === status) return existing.body;
	const body = fetch(url, { headers: { Accept: 'application/json' } }).then(r => {
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		return r.json() as Promise<unknown>;
	});
	requests.set(url, { startedAt: Date.now(), status, body });
	body.catch(() => {
		if (requests.get(url)?.body === body) requests.delete(url);
	});
	return body;
};

export const fetchSummary = (espnPath: string, gameId: string, status: Game['status']) => (
	fetchSharedJson(summaryUrl(espnPath, gameId), status)
);

export const fetchSharedLeagueStandings = (espnPath: string) => fetchSharedJson(standingsUrl(espnPath));

export const prefetchGameDetail = (game: Pick<Game, 'id' | 'league' | 'status'>) => {
	if (game.id.startsWith('mock-')) return;
	const config = leagueConfigMap[game.league as LeagueId];
	if (!config) return;
	void fetchSummary(config.espnPath, game.id, game.status);
	if (usesFullLeagueStandings(game.league)) void fetchSharedLeagueStandings(config.espnPath);
};

export const clearSharedRequests = () => {
	requests.clear();
};
