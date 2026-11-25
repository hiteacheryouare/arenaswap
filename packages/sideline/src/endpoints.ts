export const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
export const coreApiBase = 'https://sports.core.api.espn.com/v2/sports';
export const espnStandingsBase = 'https://site.api.espn.com/apis/v2/sports';
export const espnSearchBase = 'https://site.api.espn.com/apis/search/v2';

/* A request that never answers would otherwise hold its in-flight dedup entry for good, so every
   later poll for that league and day would wait on it. `fetchWinProbability` takes its caller's
   signal in place of this one when it is given one, because combining two needs `AbortSignal.any`,
   which Chrome 110 and Firefox 121 (the manifest minimums) do not have. `AbortSignal.timeout` needs
   Chrome 103 and Firefox 100. */
export const requestTimeoutMs = 10_000;
export const requestSignal = (): AbortSignal => AbortSignal.timeout(requestTimeoutMs);

export const summaryUrl = (espnPath: string, gameId: string) => (
	`${espnBase}/${espnPath}/summary?event=${encodeURIComponent(gameId)}`
);

export const standingsUrl = (espnPath: string) => (
	`${espnStandingsBase}/${espnPath}/standings?level=3`
);

export const espnGet = (url: string, init: { signal?: AbortSignal; cache?: RequestCache } = {}) => fetch(url, {
	headers: { Accept: 'application/json' },
	...(init.cache ? { cache: init.cache } : {}),
	signal: init.signal ?? requestSignal(),
});
