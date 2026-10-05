import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { constants as zlibConstants, createGunzip } from 'node:zlib';
import { parseScoreboardEvents, parseWinProbability } from '../../../packages/core/src/apiClient';
import type { Game, LeagueId } from '../../../packages/core/src/types';

interface RawEvent {
	id?: string;
	status?: { type?: { state?: string } };
}

type RecordedLine =
	| { t: 'meta'; ts: number }
	| { t: 'scoreboard'; ts: number; league: LeagueId; events: RawEvent[]; unchanged: string[] }
	| { t: 'summary'; ts: number; league: LeagueId; gameId: string; raw: Record<string, unknown> }
	| { t: 'situation'; ts: number; league: LeagueId; gameId: string; raw: Record<string, unknown> }
	| { t: 'standings'; ts: number; league: LeagueId; raw: unknown };

export type ReplayEvent =
	// One league's poll: every game live in that league right now.
	| { kind: 'poll'; ts: number; league: LeagueId; live: Game[] }
	| { kind: 'summary'; ts: number; league: LeagueId; gameId: string; winProbability: number[]; raw: Record<string, unknown> }
	| { kind: 'situation'; ts: number; league: LeagueId; gameId: string; raw: Record<string, unknown> }
	| { kind: 'standings'; ts: number; league: LeagueId; raw: unknown };

// Recordings are hourly files under <dir>/<YYYY-MM-DD>/<HH>-<run start>.jsonl.gz; a path may also
// name one day folder or one file.
export const listRecordingFiles = (path: string): string[] => {
	if (!existsSync(path)) throw new Error(`No recording at ${path}`);
	if (statSync(path).isFile()) return [path];
	return readdirSync(path, { withFileTypes: true })
		.flatMap(entry => (entry.isDirectory() ? listRecordingFiles(join(path, entry.name)) : entry.name.endsWith('.jsonl.gz') ? [join(path, entry.name)] : []))
		.toSorted();
};

// A file the recorder is still writing ends mid-line after its last sync flush, so the
// decompressor is told to stop quietly there and the torn line is skipped.
// Lines that wouldn't parse, by file. Only a torn tail is expected; anything more is worth knowing.
export const unreadableLines = new Map<string, number>();

const readLines = async function* (file: string): AsyncGenerator<RecordedLine> {
	const gunzip = createGunzip({ finishFlush: zlibConstants.Z_SYNC_FLUSH });
	const lines = createInterface({ input: createReadStream(file).pipe(gunzip), crlfDelay: Infinity });
	for await (const line of lines) {
		if (!line) continue;
		try {
			yield JSON.parse(line) as RecordedLine;
		} catch {
			unreadableLines.set(file, (unreadableLines.get(file) ?? 0) + 1);
		}
	}
};

export const readRecording = async function* (files: string[], until?: number): AsyncGenerator<ReplayEvent> {
	const lastRawById = new Map<string, { raw: RawEvent; parsed: Game | null }>();
	let lastTs = 0;
	for (const file of files) {
		for await (const line of readLines(file)) {
			if (until !== undefined && line.ts > until) return;
			// Two recorders alive at once would interleave here, and every history and stall count after
			// it would be wrong, so stop rather than replay it.
			if (line.ts < lastTs - 5_000) throw new Error(`${file} goes back in time at ${new Date(line.ts).toISOString()}: were two recorders running?`);
			lastTs = Math.max(lastTs, line.ts);
			if (line.t === 'scoreboard') {
				for (const raw of line.events) {
					if (!raw.id) continue;
					lastRawById.set(raw.id, { raw, parsed: parseScoreboardEvents({ events: [raw] }, line.league)[0] ?? null });
				}
				const liveIds = [
					...line.events.filter(raw => raw.status?.type?.state === 'in').map(raw => raw.id!),
					...line.unchanged,
				];
				const live = liveIds
					.map(id => lastRawById.get(id)?.parsed)
					.filter((game): game is Game => game != null && game.status === 'in');
				yield { kind: 'poll', ts: line.ts, league: line.league, live };
			} else if (line.t === 'summary') {
				yield { kind: 'summary', ts: line.ts, league: line.league, gameId: line.gameId, winProbability: parseWinProbability(line.raw), raw: line.raw };
			} else if (line.t === 'situation') {
				yield { kind: 'situation', ts: line.ts, league: line.league, gameId: line.gameId, raw: line.raw };
			} else if (line.t === 'standings') {
				yield { kind: 'standings', ts: line.ts, league: line.league, raw: line.raw };
			}
		}
	}
};
