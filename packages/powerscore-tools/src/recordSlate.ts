import { createWriteStream, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import { constants as zlibConstants, createGzip, type Gzip } from 'node:zlib';
import { execSync, spawn } from 'node:child_process';
import { allLeagueIds, leagueConfigMap, type LeagueId } from 'powerscore';
import { collegeDivisions } from '@arenaswap/core';

const siteBase = 'https://site.api.espn.com/apis/site/v2/sports';
const standingsBase = 'https://site.api.espn.com/apis/v2/sports';
const coreBase = 'https://sports.core.api.espn.com/v2/sports';
const packageRoot = join(__dirname, '..');
const recordingsDir = join(packageRoot, 'recordings');
const pidFile = join(recordingsDir, 'recorder.pid');
const logFile = join(recordingsDir, 'recorder.log');

const livePollMs = 15_000;
const idlePollMs = 5 * 60_000;
const summaryEveryMs = 60_000;
const standingsEveryMs = 30 * 60_000;
const flushEveryMs = 30_000;
const maxConcurrentRequests = 6;
const requestTimeoutMs = 10_000;
const startedAt = Date.now();

const situationLeagues = new Set<LeagueId>(['nhl']);
const standingsLeagues = new Set<LeagueId>(['nba', 'wnba', 'nhl', 'mlb', 'nfl', 'mls', 'epl', 'laliga', 'bundesliga', 'seriea', 'ligamx', 'nwsl']);

const args = process.argv.slice(2);
const requestedLeagues = args.filter((id): id is LeagueId => allLeagueIds.includes(id as LeagueId));
const leagues = requestedLeagues.length > 0 ? requestedLeagues : allLeagueIds;

const isAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

mkdirSync(recordingsDir, { recursive: true });
const runningPid = existsSync(pidFile) ? Number(readFileSync(pidFile, 'utf8')) : NaN;
if (Number.isFinite(runningPid) && runningPid !== process.pid && isAlive(runningPid)) {
	console.error(`A recorder is already running (pid ${runningPid}). Stop it with: kill ${runningPid}`);
	process.exit(1);
}

if (args.includes('--detach')) {
	const log = openSync(logFile, 'a');
	const child = spawn(process.execPath, [process.argv[1]!, ...args.filter(arg => arg !== '--detach')], { detached: true, stdio: ['ignore', log, log] });
	child.unref();
	console.log(`Recording in the background (pid ${child.pid}), logging to ${logFile}. Stop it with: kill ${child.pid}`);
	process.exit(0);
}

writeFileSync(pidFile, String(process.pid));
if (process.platform === 'darwin') spawn('caffeinate', ['-i', '-w', String(process.pid)], { detached: true, stdio: 'ignore' }).unref();

let activeRequests = 0;
const waiting: (() => void)[] = [];

const withSlot = async <T>(run: () => Promise<T>): Promise<T> => {
	if (activeRequests >= maxConcurrentRequests) await new Promise<void>(resolve => waiting.push(resolve));
	activeRequests++;
	try {
		return await run();
	} finally {
		activeRequests--;
		waiting.shift()?.();
	}
};

const getJson = (url: string): Promise<unknown> => withSlot(async () => {
	const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(requestTimeoutMs) });
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return await res.json();
});

const easternParts = (date: Date) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
	}).formatToParts(date);
	const part = (type: string) => parts.find(p => p.type === type)!.value;
	return { day: `${part('year')}-${part('month')}-${part('day')}`, hour: part('hour') };
};

const dateKey = (date: Date): string => easternParts(date).day.replaceAll('-', '');

let currentFileKey = '';
let gzip: Gzip | null = null;
let fileStream: WriteStream | null = null;
const readGitSha = (): string => {
	try {
		return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
	} catch {
		return 'unknown';
	}
};

const gitSha = readGitSha();

const closeFile = () => new Promise<void>(resolve => {
	if (!gzip || !fileStream) return resolve();
	fileStream.once('finish', () => resolve());
	gzip.end();
	gzip = null;
	fileStream = null;
});

const write = (line: Record<string, unknown>): void => {
	const { day, hour } = easternParts(new Date());
	const fileKey = `${day}/${hour}`;
	if (fileKey !== currentFileKey) {
		gzip?.end();
		currentFileKey = fileKey;
		mkdirSync(join(recordingsDir, day), { recursive: true });
		const base = join(recordingsDir, day, `${hour}-${startedAt}`);
		const path = existsSync(`${base}.jsonl.gz`) ? `${base}-${Date.now()}.jsonl.gz` : `${base}.jsonl.gz`;
		gzip = createGzip();
		fileStream = createWriteStream(path, { flags: 'wx' });
		const onError = (error: Error) => {
			stats.errors++;
			console.error(`  ! writing ${path}: ${error.message}`);
			currentFileKey = '';
		};
		gzip.on('error', onError);
		fileStream.on('error', onError);
		gzip.pipe(fileStream);
		gzip.write(`${JSON.stringify({ t: 'meta', v: 1, ts: Date.now(), leagues, gitSha })}\n`);
	}
	gzip!.write(`${JSON.stringify(line)}\n`);
};

setInterval(() => gzip?.flush(zlibConstants.Z_SYNC_FLUSH), flushEveryMs).unref();

interface RawEvent {
	id?: string;
	status?: { type?: { state?: string } };
	competitions?: { id?: string }[];
}

const eventState = (event: RawEvent): string => event.status?.type?.state ?? 'unknown';

const lastWritten = new Map<string, string>();
const finalsWritten = new Set<string>();
const lastSummaryAt = new Map<string, number>();
const lastStandingsAt = new Map<LeagueId, number>();
const lastFileKeyByLeague = new Map<LeagueId, string>();
const stats = { polls: 0, liveEvents: 0, summaries: 0, situations: 0, standings: 0, errors: 0 };

const groupsFor = (league: LeagueId): (string | undefined)[] => {
	const divisions = (collegeDivisions as Partial<Record<LeagueId, readonly { groups?: string }[]>>)[league];
	if (!divisions) return [undefined];
	return divisions.filter(d => d.groups === '80' || d.groups === '81' || d.groups === '50' || !d.groups).map(d => d.groups);
};

const scoreboardUrls = (league: LeagueId): string[] => {
	const config = leagueConfigMap[league]!;
	const now = new Date();
	const days = new Set([dateKey(now), dateKey(new Date(now.getTime() - 6 * 3_600_000))]);
	return [...days].flatMap(day => groupsFor(league).map(groups => {
		const params = new URLSearchParams({ limit: '500', dates: day });
		if (groups) params.set('groups', groups);
		return `${siteBase}/${config.espnPath}/scoreboard?${params.toString()}`;
	}));
};

const recordSummary = async (league: LeagueId, eventId: string): Promise<void> => {
	const config = leagueConfigMap[league]!;
	const raw = await getJson(`${siteBase}/${config.espnPath}/summary?event=${encodeURIComponent(eventId)}`) as Record<string, unknown>;
	const { winprobability, pickcenter, boxscore, predictor, header, injuries } = raw;
	write({ t: 'summary', ts: Date.now(), league, gameId: eventId, raw: { winprobability, pickcenter, boxscore, predictor, header, injuries } });
	stats.summaries++;
};

const recordSituation = async (league: LeagueId, event: RawEvent): Promise<void> => {
	const config = leagueConfigMap[league]!;
	const competitionId = event.competitions?.[0]?.id ?? event.id;
	const [sport, leaguePath] = config.espnPath.split('/');
	const url = `${coreBase}/${sport}/leagues/${leaguePath}/events/${event.id}/competitions/${competitionId}/situation`;
	const raw = await getJson(url);
	write({ t: 'situation', ts: Date.now(), league, gameId: event.id, raw });
	stats.situations++;
};

const recordStandings = async (league: LeagueId): Promise<void> => {
	const config = leagueConfigMap[league]!;
	const raw = await getJson(`${standingsBase}/${config.espnPath}/standings?level=3`);
	write({ t: 'standings', ts: Date.now(), league, raw });
	stats.standings++;
};

const settle = async (work: Promise<unknown>[]): Promise<void> => {
	for (const result of await Promise.allSettled(work)) {
		if (result.status === 'rejected') {
			stats.errors++;
			console.error(`  ! ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
		}
	}
};

const pollLeague = async (league: LeagueId): Promise<boolean> => {
	const responses = await Promise.all(scoreboardUrls(league).map(url => getJson(url) as Promise<{ events?: RawEvent[] }>));
	const byId = new Map<string, RawEvent>();
	for (const response of responses) for (const event of response.events ?? []) if (event.id) byId.set(event.id, event);

	const now = Date.now();
	const { day, hour } = easternParts(new Date(now));
	const newFile = lastFileKeyByLeague.get(league) !== `${day}/${hour}`;
	lastFileKeyByLeague.set(league, `${day}/${hour}`);
	const events: unknown[] = [];
	const unchanged: string[] = [];
	const live: RawEvent[] = [];
	for (const [id, event] of byId) {
		const state = eventState(event);
		if (state === 'post') {
			if (finalsWritten.has(id) || !lastWritten.has(id)) continue;
			finalsWritten.add(id);
			lastWritten.delete(id);
			events.push(event);
			continue;
		}
		if (state === 'in') live.push(event);
		const serialized = JSON.stringify(event);
		if (!newFile && lastWritten.get(id) === serialized) {
			if (state === 'in') unchanged.push(id);
			continue;
		}
		lastWritten.set(id, serialized);
		events.push(event);
	}

	stats.polls++;
	stats.liveEvents += live.length;
	if (events.length > 0 || unchanged.length > 0) write({ t: 'scoreboard', ts: now, league, events, unchanged });

	const extras: Promise<unknown>[] = [];
	for (const event of live) {
		if ((now - (lastSummaryAt.get(event.id!) ?? 0)) >= summaryEveryMs) {
			lastSummaryAt.set(event.id!, now);
			extras.push(recordSummary(league, event.id!));
		}
		if (situationLeagues.has(league)) extras.push(recordSituation(league, event));
	}
	if (live.length > 0 && standingsLeagues.has(league) && (now - (lastStandingsAt.get(league) ?? 0)) >= standingsEveryMs) {
		lastStandingsAt.set(league, now);
		extras.push(recordStandings(league));
	}
	await settle(extras);
	return live.length > 0;
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const runLeague = async (league: LeagueId, startDelayMs: number): Promise<void> => {
	await sleep(startDelayMs);
	let hasLive = false;
	for (;;) {
		try {
			hasLive = await pollLeague(league);
		} catch (error) {
			stats.errors++;
			console.error(`  ! ${league}: ${error instanceof Error ? error.message : String(error)}`);
		}
		await sleep(hasLive ? livePollMs : idlePollMs);
	}
};

setInterval(() => {
	console.log(`${new Date().toLocaleTimeString()} polls=${stats.polls} liveEventPolls=${stats.liveEvents} summaries=${stats.summaries} situations=${stats.situations} standings=${stats.standings} errors=${stats.errors}`);
}, 60_000).unref();

const shutdown = async () => {
	await closeFile();
	if (existsSync(pidFile) && readFileSync(pidFile, 'utf8') === String(process.pid)) rmSync(pidFile);
	process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

console.log(`Recording ${leagues.length} leagues to ${recordingsDir} (Ctrl-C to stop).`);
leagues.forEach((league, index) => void runLeague(league, index * 400));
