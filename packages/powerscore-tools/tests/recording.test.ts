import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { constants as zlibConstants, createGzip } from 'node:zlib';
import { listRecordingFiles, readRecording, unreadableLines, type ReplayEvent } from '../src/replay/recording';

// A real live NHL event (Carolina at Philadelphia, tied in the third), shared with packages/sideline.
const liveEvent = (JSON.parse(readFileSync(join(__dirname, '../../sideline/tests/fixtures/scoreboards/nhlTiedThirdPeriod.json'), 'utf8')) as { event: Record<string, any> }).event;
const gameId = liveEvent.id as string;

const withState = (state: 'in' | 'post', clock: string) => {
	const event = structuredClone(liveEvent);
	event.competitions[0].status.type.state = state;
	event.competitions[0].status.displayClock = clock;
	if (state === 'post') event.competitions[0].status.type.name = 'STATUS_FINAL';
	return event;
};

const scoreboard = (ts: number, events: unknown[], unchanged: string[] = []) => (
	JSON.stringify({ t: 'scoreboard', ts, league: 'nhl', events, unchanged })
);

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'arenaswap-recording-'));
	unreadableLines.clear();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// Written the way the recorder writes: whole lines into one gzip stream, sync-flushed as it goes.
// `tornTail` is what a killed recorder leaves: part of a line, flushed, and the stream never ended.
const writeRecording = async (name: string, lines: string[], tornTail?: string): Promise<string> => {
	const gzip = createGzip();
	const chunks: Buffer[] = [];
	gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
	for (const line of lines) gzip.write(`${line}\n`);
	if (tornTail === undefined) {
		await new Promise<void>(resolve => { gzip.on('end', () => resolve()); gzip.end(); });
	} else {
		gzip.write(tornTail);
		await new Promise<void>(resolve => gzip.flush(zlibConstants.Z_SYNC_FLUSH, () => resolve()));
		await new Promise<void>(resolve => setImmediate(resolve));
	}
	const path = join(dir, name);
	mkdirSync(join(path, '..'), { recursive: true });
	writeFileSync(path, Buffer.concat(chunks));
	return path;
};

const readAll = async (files: string[], until?: number, leagues?: ReadonlySet<'nhl' | 'nba'>): Promise<ReplayEvent[]> => {
	const events: ReplayEvent[] = [];
	for await (const event of readRecording(files, until, leagues)) events.push(event);
	return events;
};

const livePolls = (events: ReplayEvent[]) => events
	.filter((event): event is Extract<ReplayEvent, { kind: 'poll' }> => event.kind === 'poll')
	.map(poll => poll.live.map(game => `${game.id}@${game.clockSeconds}`));

test('reads every whole line of a file the recorder is still writing, and counts the torn one', async () => {
	const file = await writeRecording('live.jsonl.gz', [scoreboard(1_000, [withState('in', '5:49')])], scoreboard(2_000, [withState('in', '5:20')]).slice(0, 80));

	expect(livePolls(await readAll([file]))).toEqual([[`${gameId}@349`]]);
	expect(unreadableLines.get(file)).toBe(1);
});

test('a game written as unchanged is still live in that poll, as its last full copy', async () => {
	const file = await writeRecording('a.jsonl.gz', [
		scoreboard(1_000, [withState('in', '5:49')]),
		scoreboard(2_000, [], [gameId]),
		scoreboard(3_000, [withState('in', '5:20')]),
	]);

	expect(livePolls(await readAll([file]))).toEqual([[`${gameId}@349`], [`${gameId}@349`], [`${gameId}@320`]]);
});

test('a game that goes final leaves the live list', async () => {
	const file = await writeRecording('a.jsonl.gz', [
		scoreboard(1_000, [withState('in', '0:12')]),
		scoreboard(2_000, [withState('post', '0:00')]),
	]);

	expect(livePolls(await readAll([file]))).toEqual([[`${gameId}@12`], []]);
});

test('refuses to replay two recorders interleaved, rather than corrupt every history after it', async () => {
	const file = await writeRecording('a.jsonl.gz', [
		scoreboard(100_000, [withState('in', '5:49')]),
		scoreboard(90_000, [withState('in', '5:49')]),
	]);

	await expect(readAll([file])).rejects.toThrow('were two recorders running?');
});

test('stops at the requested moment, and skips the leagues it was not asked for', async () => {
	const nbaLine = JSON.stringify({ t: 'scoreboard', ts: 1_500, league: 'nba', events: [], unchanged: [] });
	const file = await writeRecording('a.jsonl.gz', [
		scoreboard(1_000, [withState('in', '5:49')]),
		nbaLine,
		scoreboard(2_000, [withState('in', '5:20')]),
	]);

	expect((await readAll([file], 1_500)).map(event => event.kind === 'poll' && event.league)).toEqual(['nhl', 'nba']);
	expect((await readAll([file], undefined, new Set(['nhl'] as const))).map(event => event.kind === 'poll' && event.league)).toEqual(['nhl', 'nhl']);
});

test('lists hours in order across days and recorder restarts, and ignores everything else', () => {
	for (const name of ['2026-10-04/21-1791164676576.jsonl.gz', '2026-10-04/21-1791154553554.jsonl.gz', '2026-10-05/00-1791164676576.jsonl.gz', '2026-10-04/09-1791071042937.jsonl.gz', 'playByPlay/nfl-401872965.json', 'recorder.log']) {
		mkdirSync(join(dir, name, '..'), { recursive: true });
		writeFileSync(join(dir, name), '');
	}

	expect(listRecordingFiles(dir).map(file => file.slice(dir.length + 1))).toEqual([
		'2026-10-04/09-1791071042937.jsonl.gz',
		'2026-10-04/21-1791154553554.jsonl.gz',
		'2026-10-04/21-1791164676576.jsonl.gz',
		'2026-10-05/00-1791164676576.jsonl.gz',
	]);
});
