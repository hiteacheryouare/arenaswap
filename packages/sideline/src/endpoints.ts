export const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
export const coreApiBase = 'https://sports.core.api.espn.com/v2/sports';

/* A request that never answers would otherwise hold its in-flight dedup entry for good, so every
   later poll for that league and day would wait on it. `fetchWinProbability` takes its caller's
   signal in place of this one when it is given one, because combining two needs `AbortSignal.any`,
   which Chrome 110 and Firefox 115 (the manifest minimums) do not have. `AbortSignal.timeout` needs
   Chrome 103 and Firefox 100. */
export const requestTimeoutMs = 10_000;
export const requestSignal = (): AbortSignal => AbortSignal.timeout(requestTimeoutMs);
