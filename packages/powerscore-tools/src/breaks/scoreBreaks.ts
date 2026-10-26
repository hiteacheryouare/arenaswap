import type { DeadInterval, Play } from './groundTruth';

export interface PollFlag {
	at: number;
	kind?: string;
	lastPlayId?: string;
}

export interface GameTrace {
	gameId: string;
	polls: PollFlag[];
	intervals: DeadInterval[];
	action: Play[];
	plays: Play[];
}

export interface FalseAlarm {
	gameId: string;
	at: number;
	seconds: number;
	kind?: string;
}

export interface BreakScore {
	games: number;
	hours: number;
	// Stretches of consecutive flagged polls.
	runs: number;
	// Runs that overlap no dead interval at all.
	falseAlarms: FalseAlarm[];
	falseAlarmShare: number;
	// Runs and false alarms by the kind of break that started the run.
	byKind: Record<string, { runs: number; falseAlarms: number }>;
	breaks: number;
	caught: number;
	missed: { gameId: string; start: number; seconds: number; kind: string }[];
	// Flagged polls that sit inside a dead interval.
	pollPrecision: number;
	// Seconds from the start of a break to the first flagged poll in it.
	latencyMedian?: number;
	// Seconds from the end of a break to the first unflagged poll after it; negative is early.
	releaseMedian?: number;
}

export interface ScoreOptions {
	// Moves the truth later by the feed's lag, to score against what the feed could have known.
	shiftMs?: number;
	// Clock sports: halftimes and intermissions are already frozen by the status, so they and the
	// minute either side of them are left out. Unrecorded stretches always are.
	excludeIntermissions: boolean;
}

const median = (values: number[]): number | undefined => {
	if (values.length === 0) return undefined;
	const sorted = values.toSorted((a, b) => a - b);
	return Math.round(sorted[Math.floor(sorted.length / 2)]!);
};

// Polls inside an excluded interval are already gone, so a run also ends where one sat between two
// polls; otherwise flags either side of halftime would join into one run spanning it.
const flaggedRuns = (polls: PollFlag[], separated: (from: number, to: number) => boolean): { start: number; end: number; kind?: string }[] => {
	const runs: { start: number; end: number; kind?: string }[] = [];
	let current: { start: number; end: number; kind?: string } | undefined;
	for (const poll of polls) {
		if (current && separated(current.end, poll.at)) {
			runs.push(current);
			current = undefined;
		}
		if (poll.kind && current) current.end = poll.at;
		else if (poll.kind) current = { start: poll.at, end: poll.at, kind: poll.kind };
		else if (current) {
			runs.push(current);
			current = undefined;
		}
	}
	if (current) runs.push(current);
	return runs;
};

interface Prepared {
	polls: PollFlag[];
	intervals: DeadInterval[];
	excluded: DeadInterval[];
}

const prepare = (trace: GameTrace, options: ScoreOptions): Prepared | undefined => {
	const shift = options.shiftMs ?? 0;
	const shifted = trace.intervals.map(interval => ({ ...interval, start: interval.start + shift, end: interval.end + shift }));
	const isExcluded = (interval: DeadInterval) => interval.kind === 'unrecorded' || (options.excludeIntermissions && interval.kind === 'intermission');
	const excluded = shifted.filter(isExcluded);
	const intervals = shifted.filter(interval => !isExcluded(interval));
	const first = trace.action[0];
	const last = trace.action[trace.action.length - 1];
	if (!first || !last) return undefined;
	const polls = trace.polls.filter(poll => poll.at >= first.at + shift && poll.at <= last.at + shift
		&& !excluded.some(interval => poll.at >= interval.start - 60_000 && poll.at <= interval.end + 60_000));
	return polls.length > 0 ? { polls, intervals, excluded } : undefined;
};

export const scoreBreaks = (traces: GameTrace[], options: ScoreOptions): BreakScore => {
	let hours = 0;
	let runs = 0;
	let flagged = 0;
	let flaggedInside = 0;
	let breaks = 0;
	let caught = 0;
	let games = 0;
	const falseAlarms: FalseAlarm[] = [];
	const byKind: Record<string, { runs: number; falseAlarms: number }> = {};
	const missed: BreakScore['missed'] = [];
	const latencies: number[] = [];
	const releases: number[] = [];

	for (const trace of traces) {
		const prepared = prepare(trace, options);
		if (!prepared) continue;
		const { polls, intervals, excluded } = prepared;
		games++;
		hours += (polls[polls.length - 1]!.at - polls[0]!.at) / 3_600_000;
		const inside = (at: number) => intervals.some(interval => at >= interval.start && at <= interval.end);

		for (const poll of polls) {
			if (!poll.kind) continue;
			flagged++;
			if (inside(poll.at)) flaggedInside++;
		}

		for (const interval of intervals) {
			const within = polls.filter(poll => poll.at >= interval.start && poll.at <= interval.end);
			if (within.length === 0) continue;
			breaks++;
			const hits = within.filter(poll => poll.kind);
			if (hits.length === 0) {
				missed.push({ gameId: trace.gameId, start: interval.start, seconds: Math.round((interval.end - interval.start) / 1000), kind: interval.kind });
				continue;
			}
			caught++;
			latencies.push((hits[0]!.at - interval.start) / 1000);
			const lastHit = hits[hits.length - 1]!.at;
			const release = polls.find(poll => poll.at > lastHit && !poll.kind);
			if (release) releases.push((release.at - interval.end) / 1000);
		}

		const separated = (from: number, to: number) => excluded.some(interval => from < interval.start && to > interval.end);
		for (const run of flaggedRuns(polls, separated)) {
			runs++;
			const tally = byKind[run.kind ?? ''] ??= { runs: 0, falseAlarms: 0 };
			tally.runs++;
			const overlaps = intervals.some(interval => !(interval.end < run.start || interval.start > run.end));
			if (overlaps) continue;
			tally.falseAlarms++;
			falseAlarms.push({ gameId: trace.gameId, at: run.start, seconds: Math.round((run.end - run.start) / 1000), kind: run.kind });
		}
	}

	return {
		games,
		hours,
		runs,
		falseAlarms,
		falseAlarmShare: runs > 0 ? falseAlarms.length / runs : 0,
		byKind,
		breaks,
		caught,
		missed,
		pollPrecision: flagged > 0 ? flaggedInside / flagged : 0,
		latencyMedian: median(latencies),
		releaseMedian: median(releases),
	};
};

// How long the feed takes to show a play: when a poll first carried its id, less when it happened.
export const feedLagMs = (traces: GameTrace[]): number => {
	const lags = traces.flatMap(trace => {
		const playedAt = new Map(trace.plays.map(play => [play.id, play.at]));
		const firstSeen = new Map<string, number>();
		for (const poll of trace.polls) if (poll.lastPlayId && !firstSeen.has(poll.lastPlayId)) firstSeen.set(poll.lastPlayId, poll.at);
		return [...firstSeen].flatMap(([id, at]) => (playedAt.has(id) ? [at - playedAt.get(id)!] : []));
	});
	return median(lags) ?? 0;
};
