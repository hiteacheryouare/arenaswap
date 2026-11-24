import { collegeFetchGroups, hasMissedItsWindow, isWithinFinalRetention, leagueConfigMap, logWarn, pollLookaheadDays, pollMaxEagerMs, pollMinEagerMs, resolveLeagueLogoUrl, upcomingGamesDaysMax } from '@arenaswap/core';
import type { Game, LeagueConfig, LeagueId, LeagueLogoMap, LeagueSchedule, LeagueScheduleMap } from '@arenaswap/core';
import { parseWinProbabilityReadings } from './winProbabilityReadings';
import type { WinProbabilityReading } from 'powerscore';
import { toLeagueSchedule } from './leagueCalendar';
import { buildDayWindowKeys, shiftDayKey, toQueryDate } from './dayWindow';
import { warnOnDroppedCountChange } from './dropWarnings';
import { parseScoreboard } from './espnSchemas';
import type { EspnScoreboardResponse } from './espnSchemas';
import { parseEvent } from './scoreboardEvent';
import { settledInPool, takeRequestSlot } from './requestPool';
import { coreApiBase, espnBase, espnGet, standingsUrl, summaryUrl } from './endpoints';

export { requestTimeoutMs } from './endpoints';

/* How often ESPN will actually tell us something new, per league, read off the `cache-control` it
   answered with. `Cache-Control` is on the CORS-safelist, so this is readable on a cross-origin
   response without the host exposing anything. */
const scoreboardRefreshFloorMs = 6_000;
const scoreboardMaxAgeSamples = 5;
const observedScoreboardMaxAgesMs = new Map<LeagueId, number[]>();

// The edge counts max-age down as a cached copy ages, so any one reply understates the period.
// The largest of the recent ones is the freshest copy, which is the true period.
const recordScoreboardMaxAge = (leagueId: LeagueId, cacheControl: string | null): void => {
	const match = /max-age\s*=\s*(\d+)/i.exec(cacheControl ?? '');
	if (!match) return;
	const seconds = Number(match[1]);
	if (!Number.isFinite(seconds) || seconds <= 0) return;
	const recent = [...(observedScoreboardMaxAgesMs.get(leagueId) ?? []), seconds * 1000];
	observedScoreboardMaxAgesMs.set(leagueId, recent.slice(-scoreboardMaxAgeSamples));
};

export const scoreboardRefreshMs = (leagueId: LeagueId): number => {
	const recent = observedScoreboardMaxAgesMs.get(leagueId);
	if (!recent) return pollMinEagerMs;
	return Math.min(Math.max(Math.max(...recent), scoreboardRefreshFloorMs), pollMaxEagerMs);
};

// The "dark" variant is the light-coloured one, meant for dark UIs.
const pickLeagueLogo = (logos?: { href?: string; rel?: string[] }[]): string | undefined => (
	logos?.find(l => l.rel?.includes('dark') && l.href)?.href ?? logos?.[0]?.href
);

class LeagueFetchError extends Error {
	leagueId: LeagueId;

	status?: number;

	constructor(leagueId: LeagueId, status?: number) {
		super(`ESPN ${leagueId} API returned ${status ?? 'an error'}`);
		this.name = 'LeagueFetchError';
		this.leagueId = leagueId;
		this.status = status;
	}
}

export interface LeagueFetchOptions {
	includeUpcoming?: boolean;
	upcomingDays?: number;
	includeFinal?: boolean;
	groupsByLeague?: Partial<Record<LeagueId, string[]>>;
}

interface LeagueGamesResult {
	leagueId: LeagueId;
	games: Game[];
	logoUrl: string;
	schedule?: LeagueSchedule;
}

const fetchScoreboard = async (url: string, leagueId: LeagueId, warnKey: string = leagueId, recordMaxAge = false): Promise<EspnScoreboardResponse> => {
	await takeRequestSlot();
	const res = await espnGet(url);
	if (!res.ok) throw new LeagueFetchError(leagueId, res.status);
	if (recordMaxAge) recordScoreboardMaxAge(leagueId, res.headers.get('cache-control'));
	const parsed = parseScoreboard(await res.json());
	warnOnDroppedCountChange(
		`scoreboard:${warnKey}`,
		parsed.droppedEvents,
		() => `Skipped ${parsed.droppedEvents} unparseable ${leagueId} event(s); kept ${parsed.events.length}.`,
	);
	if (parsed.events.length === 0 && parsed.droppedEvents > 0) throw new LeagueFetchError(leagueId);
	return parsed;
};

/* `groups` is required for reliable coverage in the college leagues; see `collegeDivisions`.

   `limit` lifts a server-side cap we had been eating silently. The published reference says to pass
   a high limit alongside `groups` to get a full NCAA slate, and measured, an MLB month query
   answered 100 events without it and 369 with it. 500 rather than higher because `limit=1000`
   answered a dated college football Saturday with 25 events — the undated curated week, meaning the
   `dates` filter had quietly stopped being applied — and 1500 did the same. Verified against all 31
   leagues on a single-date query: identical answers, so it only ever lifts a cap. */
const scoreboardEventLimit = 500;

const scoreboardParams = (groups?: string): URLSearchParams => {
	const params = new URLSearchParams();
	if (groups) params.set('groups', groups);
	params.set('limit', String(scoreboardEventLimit));
	return params;
};

const settledDayTtlMs = 30 * 60 * 1000;
const scheduleDayTtlMs = 10 * 60 * 1000;

const finalsLookbackDays = 2;
const easternDateStraddleDays = 1;
const dayCachePastDays = finalsLookbackDays + easternDateStraddleDays;
const dayCacheFutureDays = upcomingGamesDaysMax + easternDateStraddleDays;

export const espnDayPoolSize = 3;

interface CachedDay {
	games: Game[];
	espnLogo?: string;
	schedule: LeagueSchedule;
	fetchedAt: number;
	ttlMs: number;
}

const dayCache = new Map<string, CachedDay>();
const dayRequests = new Map<string, Promise<CachedDay>>();

const dayTtlMs = (dayKey: string, todayKey: string, games: Game[]): number => {
	if (dayKey === todayKey) return 0;
	if (dayKey > todayKey) return scheduleDayTtlMs;
	if (games.some(game => game.status === 'in')) return 0;
	return games.every(game => game.status === 'post') ? settledDayTtlMs : scheduleDayTtlMs;
};

const pruneDayCache = (todayKey: string): void => {
	const first = shiftDayKey(todayKey, -dayCachePastDays);
	const last = shiftDayKey(todayKey, dayCacheFutureDays);
	for (const key of dayCache.keys()) {
		const dayKey = key.slice(key.lastIndexOf(':') + 1);
		if (dayKey < first || dayKey > last) dayCache.delete(key);
	}
};

const fetchDayFromEspn = async (
	config: LeagueConfig,
	dayKey: string,
	todayKey: string,
	cached: CachedDay | undefined,
	groups?: string,
): Promise<CachedDay> => {
	const cacheKey = dayCacheKey(config.id, dayKey, groups);
	const params = scoreboardParams(groups);
	params.set('dates', dayKey);
	const url = `${espnBase}/${config.espnPath}/scoreboard?${params.toString()}`;

	try {
		const response = await fetchScoreboard(url, config.id, cacheKey, dayKey === todayKey);
		const games = (response.events ?? [])
			.map(event => parseEvent(event, config.id))
			.filter((game): game is Game => game !== null)
			.map(game => (groups ? { ...game, collegeGroups: [groups] } : game));
		const entry: CachedDay = {
			games,
			espnLogo: pickLeagueLogo(response.leagues?.[0]?.logos),
			schedule: toLeagueSchedule(response.leagues?.[0]?.calendar),
			fetchedAt: Date.now(),
			ttlMs: dayTtlMs(dayKey, todayKey, games),
		};
		dayCache.set(cacheKey, entry);
		pruneDayCache(todayKey);
		return entry;
	} catch (err) {
		if (!cached || dayKey === todayKey) throw err;
		logWarn(`ESPN would not answer for ${config.id} on ${dayKey}; keeping the last answer for that day.`);
		const retried = { ...cached, fetchedAt: Date.now() };
		dayCache.set(cacheKey, retried);
		return retried;
	}
};

const dayCacheKey = (leagueId: LeagueId, dayKey: string, groups?: string): string => (
	groups ? `${leagueId}#${groups}:${dayKey}` : `${leagueId}:${dayKey}`
);

const fetchDayGames = async (
	config: LeagueConfig,
	dayKey: string,
	todayKey: string,
	groups: string | undefined = collegeFetchGroups(config.id)[0],
): Promise<CachedDay> => {
	const cacheKey = dayCacheKey(config.id, dayKey, groups);
	const cached = dayCache.get(cacheKey);
	if (cached && dayKey !== todayKey && cached.ttlMs > 0 && Date.now() - cached.fetchedAt < cached.ttlMs) {
		return cached;
	}

	const running = dayRequests.get(cacheKey);
	if (running) return await running;

	const pending = fetchDayFromEspn(config, dayKey, todayKey, cached, groups);
	dayRequests.set(cacheKey, pending);
	try {
		return await pending;
	} finally {
		dayRequests.delete(cacheKey);
	}
};

const fetchDayAcrossGroups = async (config: LeagueConfig, dayKey: string, todayKey: string, groups: string[]): Promise<CachedDay> => {
	if (groups.length <= 1) return await fetchDayGames(config, dayKey, todayKey, groups[0]);
	const settled = await Promise.allSettled(groups.map(group => fetchDayGames(config, dayKey, todayKey, group)));
	const days = settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
	if (days.length === 0) throw (settled[0] as PromiseRejectedResult).reason;
	const byId = new Map<string, Game>();
	for (const day of days) {
		for (const game of day.games) {
			const seen = byId.get(game.id);
			byId.set(game.id, seen
				? { ...seen, collegeGroups: [...new Set([...(seen.collegeGroups ?? []), ...(game.collegeGroups ?? [])])] }
				: game);
		}
	}
	const [first] = days;
	return {
		games: [...byId.values()],
		espnLogo: days.find(day => day.espnLogo)?.espnLogo,
		schedule: first!.schedule,
		fetchedAt: Math.min(...days.map(day => day.fetchedAt)),
		ttlMs: Math.min(...days.map(day => day.ttlMs)),
	};
};

const fetchLeagueGames = async (config: LeagueConfig, options: LeagueFetchOptions = {}): Promise<LeagueGamesResult> => {
	const { includeUpcoming = true, upcomingDays = 7, includeFinal = false } = options;
	const groups = options.groupsByLeague?.[config.id] ?? collegeFetchGroups(config.id);
	const keepGame = (game: Game): boolean => {
		if (game.status === 'pre') return !hasMissedItsWindow(game);
		if (game.status !== 'post') return true;
		return includeFinal && isWithinFinalRetention(game);
	};

	const now = new Date();
	const todayKey = toQueryDate(now);
	const dayKeys = buildDayWindowKeys(
		includeUpcoming ? upcomingDays : 0,
		now,
		includeUpcoming && includeFinal ? finalsLookbackDays : 1,
	);

	const results = await settledInPool(
		dayKeys,
		dayKey => fetchDayAcrossGroups(config, dayKey, todayKey, groups),
		espnDayPoolSize,
	);
	const isLiveWindow = !includeUpcoming;
	if (isLiveWindow) {
		const todayResult = results[dayKeys.indexOf(todayKey)];
		if (todayResult?.status !== 'fulfilled') {
			throw todayResult?.reason ?? new LeagueFetchError(config.id);
		}
	}
	const answered = results
		.filter((result): result is PromiseFulfilledResult<CachedDay> => result.status === 'fulfilled')
		.map(result => result.value);
	if (answered.length === 0) {
		const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
		throw rejected?.reason ?? new LeagueFetchError(config.id);
	}

	const byId = new Map<string, Game>();
	results.forEach((result, index) => {
		if (result.status !== 'fulfilled') return;
		const isToday = dayKeys[index] === todayKey;
		for (const game of result.value.games) {
			if (isToday || !byId.has(game.id)) byId.set(game.id, game);
		}
	});
	const games = [...byId.values()].filter(keepGame);

	const espnLogo = answered.find(day => day.espnLogo)?.espnLogo;
	const schedule = answered.find(day => day.schedule.startsAt !== undefined)?.schedule ?? answered[0]?.schedule;
	return { leagueId: config.id, games, logoUrl: resolveLeagueLogoUrl(config.id, espnLogo), schedule };
};

export const getEnabledLeagueConfigs = (enabledLeagues: LeagueId[]): LeagueConfig[] => (
	enabledLeagues
		.map(league => leagueConfigMap[league])
		.filter((config): config is LeagueConfig => Boolean(config))
);

export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[], options: LeagueFetchOptions = {}): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap; leagueSchedules: LeagueScheduleMap; shedLeagues: LeagueId[] }> => {
	if (enabledLeagues.length === 0) return { games: [], leagueLogos: {}, leagueSchedules: {}, shedLeagues: [] };
	const leagueConfigs = getEnabledLeagueConfigs(enabledLeagues);
	if (leagueConfigs.length === 0) return { games: [], leagueLogos: {}, leagueSchedules: {}, shedLeagues: [] };

	const results = await settledInPool(leagueConfigs, config => fetchLeagueGames(config, options));

	const fulfilled = results
		.filter((r): r is PromiseFulfilledResult<LeagueGamesResult> => r.status === 'fulfilled')
		.map(r => r.value);
	const shedLeagues = leagueConfigs
		.filter((_, index) => results[index]?.status === 'rejected')
		.map(config => config.id);
	const games = fulfilled.flatMap(result => result.games);
	const leagueLogos = fulfilled.reduce<LeagueLogoMap>((acc, result) => {
		acc[result.leagueId] = result.logoUrl;
		return acc;
	}, {});
	const leagueSchedules = fulfilled.reduce<LeagueScheduleMap>((acc, result) => {
		if (result.schedule) acc[result.leagueId] = result.schedule;
		return acc;
	}, {});
	return { games, leagueLogos, leagueSchedules, shedLeagues };
};

export const fetchNextScheduledStart = async (
	leagueId: LeagueId,
	options: { days?: number; now?: Date; groups?: string[] } = {},
): Promise<number | null> => {
	const config = leagueConfigMap[leagueId];
	if (!config) return null;
	const { days = pollLookaheadDays, now = new Date(), groups = [] } = options;
	const todayKey = toQueryDate(now);
	const nowMs = now.getTime();

	for (const dayKey of buildDayWindowKeys(days, now)) {
		const { games } = groups.length > 0
			? await fetchDayAcrossGroups(config, dayKey, todayKey, groups)
			: await fetchDayGames(config, dayKey, todayKey);
		let earliest: number | null = null;
		for (const game of games) {
			if (!game.startTime) continue;
			const startMs = new Date(game.startTime).getTime();
			if (!Number.isFinite(startMs) || startMs <= nowMs) continue;
			if (earliest === null || startMs < earliest) earliest = startMs;
		}
		if (earliest !== null) return earliest;
	}
	return null;
};

export const fetchGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	if (enabledLeagues.length === 0) return [];
	const { games } = await fetchGamesWithLeagueLogos(enabledLeagues);
	return games;
};

export const fetchLiveGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	const games = await fetchGames(enabledLeagues);
	return games.filter(g => g.status === 'in');
};

export const fetchLeagueLogos = async (enabledLeagues: LeagueId[], options: { includeUpcoming?: boolean; upcomingDays?: number } = {}): Promise<LeagueLogoMap> => {
	const { leagueLogos } = await fetchGamesWithLeagueLogos(enabledLeagues, options);
	return leagueLogos;
};

export const fetchWinProbability = async (game: Pick<Game, 'id' | 'league'>, init?: { signal?: AbortSignal; onSummary?: (summary: unknown) => void }): Promise<WinProbabilityReading[]> => {
	const config = leagueConfigMap[game.league];
	if (!config) return [];

	const url = summaryUrl(config.espnPath, game.id);
	await takeRequestSlot();
	const res = await espnGet(url, { signal: init?.signal });
	if (!res.ok) throw new Error(`Failed to fetch win probability for ${game.id}: HTTP ${res.status}`);

	const summary: unknown = await res.json();
	init?.onSummary?.(summary);
	return parseWinProbabilityReadings(summary, game.league);
};

// The live situation our sources' core API keeps per competition: hockey's power play and empty net,
// basketball's fouls and timeouts. Served with open CORS, so it needs no host permission.
export const fetchCompetitionSituation = async (game: Pick<Game, 'id' | 'league'>): Promise<unknown> => {
	const config = leagueConfigMap[game.league];
	const [sport, leaguePath] = config.espnPath.split('/');
	await takeRequestSlot();
	// Its replies are cacheable for seconds and stale for hours, so it's always asked afresh.
	const res = await espnGet(`${coreApiBase}/${sport}/leagues/${leaguePath}/events/${game.id}/competitions/${game.id}/situation`, { cache: 'no-cache' });
	if (!res.ok) throw new Error(`Failed to fetch the situation for ${game.id}: HTTP ${res.status}`);
	return await res.json();
};

export const fetchLeagueStandings = async (league: LeagueId): Promise<unknown> => {
	const config = leagueConfigMap[league];
	await takeRequestSlot();
	const res = await espnGet(standingsUrl(config.espnPath));
	if (!res.ok) throw new Error(`Failed to fetch ${league} standings: HTTP ${res.status}`);
	return await res.json();
};

// ESPN sends `gameInfo.gameDuration` as "3:14" — hours and minutes, not a clock time. It is
// baseball-only among the leagues sampled.
export const parseGameDurationMins = (data: unknown): number | null => {
	const raw = (data as { gameInfo?: { gameDuration?: unknown } })?.gameInfo?.gameDuration;
	if (typeof raw !== 'string') return null;
	const matched = /^(\d{1,2}):([0-5]\d)$/.exec(raw.trim());
	if (!matched) return null;
	return (Number(matched[1]) * 60) + Number(matched[2]);
};

// A whole summary payload for one short string, so worth asking only where the league sends it —
// MLB did and the NFL and MLS did not, when sampled in September 2026.
export const fetchGameDurationMins = async (game: Pick<Game, 'id' | 'league'>): Promise<number | null> => {
	const config = leagueConfigMap[game.league];
	if (!config) return null;

	const url = summaryUrl(config.espnPath, game.id);
	await takeRequestSlot();
	const res = await espnGet(url);
	if (!res.ok) throw new Error(`Failed to fetch the duration of ${game.id}: HTTP ${res.status}`);
	return parseGameDurationMins(await res.json());
};
