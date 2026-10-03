// Replays recorded slates through 2.2.0 and the working tree's PowerScore, then scores both against
// labelled flip-to moments.
//
// Run: npm run powerscore:replay -- [options]
//   --recording <path>   a recordings folder, day folder or file (default: every recording)
//   --from <iso>         only report from here (state still warms up from the start)
//   --to <iso>           stop here
//   --labels <file>      labelled moments to score against (default: fixtures/labels/*.json)
//   --modes a,b          v3 modes to run beside v2 (default: classic)
//   --timeline <file>    write a minute-by-minute slate for labelling
//   --diff               list the stretches where the first two scorers disagree on the top game
//   --json <file>        write the scorecard as JSON
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { listRecordingFiles, readRecording } from './replay/recording';
import { createReplaySession, type Frame, type Scorer } from './replay/session';
import { createV3Scorer, replayPrefs, v2Scorer } from './replay/scorers';
import { readReplayExtras } from './replay/extras';
import { describeGame } from './replay/describe';
import type { BuiltInModeId } from '../../packages/powerscore/src/types';

interface LabelledMoment {
	ts: string | number;
	flipTo: string;
	acceptable?: string[];
	// 0–3, how strongly a fan would want to be on this game.
	level?: number;
	note?: string;
}

interface LabelFile {
	slate: string;
	labeller: string;
	moments: LabelledMoment[];
}

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? args[index + 1] : undefined;
};
const flag = (name: string): boolean => args.includes(`--${name}`);
const toTime = (value: string | number | undefined): number | undefined => {
	if (value === undefined) return undefined;
	const time = typeof value === 'number' ? value : Date.parse(value);
	if (!Number.isFinite(time)) throw new Error(`Not a time: ${value}`);
	return time;
};

const recordingPath = option('recording') ?? join(__dirname, 'recordings');
const from = toTime(option('from'));
const to = toTime(option('to'));
const modes = (option('modes') ?? 'classic').split(',') as BuiltInModeId[];
const labelsDir = join(__dirname, 'fixtures', 'labels');

const readLabels = (): LabelFile[] => {
	const explicit = option('labels');
	const files = explicit ? [explicit] : existsSync(labelsDir) ? readdirSync(labelsDir).filter(name => name.endsWith('.json')).map(name => join(labelsDir, name)) : [];
	return files.map(file => JSON.parse(readFileSync(file, 'utf8')) as LabelFile);
};

const scorers: Scorer[] = [v2Scorer, ...modes.map(mode => createV3Scorer(mode, readReplayExtras))];

const formatTime = (ts: number): string => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const main = async () => {
	const files = listRecordingFiles(recordingPath);
	const session = createReplaySession(scorers, replayPrefs);
	const frames: Frame[] = [];
	const switchesInWindow = new Map(scorers.map(scorer => [scorer.name, 0]));

	for await (const event of readRecording(files, to)) {
		const frame = session.handle(event);
		if (!frame || (from !== undefined && frame.ts < from)) continue;
		frames.push(frame);
		for (const scorer of scorers) if (frame.switched.get(scorer.name)) switchesInWindow.set(scorer.name, switchesInWindow.get(scorer.name)! + 1);
	}
	if (frames.length === 0) {
		console.log('No live polls in that recording window.');
		return;
	}

	const hours = Math.max(1 / 60, (frames[frames.length - 1]!.ts - frames[0]!.ts) / 3_600_000);
	const labels = readLabels().flatMap(file => file.moments.map(moment => ({ ...moment, ts: toTime(moment.ts)! })))
		.filter(moment => moment.ts >= frames[0]!.ts && moment.ts <= frames[frames.length - 1]!.ts);

	const frameAt = (ts: number): Frame | undefined => {
		let found: Frame | undefined;
		for (const frame of frames) {
			if (frame.ts > ts) break;
			found = frame;
		}
		return found && ts - found.ts <= 90_000 ? found : undefined;
	};

	const scorecard = scorers.map(scorer => {
		let hits = 0;
		let caught = 0;
		let rankSum = 0;
		let weight = 0;
		const misses: string[] = [];
		for (const moment of labels) {
			const allowed = new Set([moment.flipTo, ...(moment.acceptable ?? [])]);
			const frame = frameAt(moment.ts);
			if (!frame) continue;
			const ranking = frame.rankings.get(scorer.name)!;
			const momentWeight = moment.level ?? 1;
			weight += momentWeight;
			const rank = ranking.findIndex(score => score.gameId === moment.flipTo) + 1 || ranking.length;
			rankSum += rank * momentWeight;
			if (allowed.has(ranking[0]?.gameId ?? '')) hits += momentWeight;
			else misses.push(`${formatTime(moment.ts)} wanted ${describeGame(frame.games.get(moment.flipTo))}, top was ${describeGame(frame.games.get(ranking[0]?.gameId ?? ''))} (${ranking[0]?.total})`);
			const wasWatched = frames.some(f => f.ts >= moment.ts - 30_000 && f.ts <= moment.ts + 90_000 && allowed.has(f.watching.get(scorer.name) ?? ''));
			if (wasWatched) caught += momentWeight;
		}
		const viewer = session.viewers.get(scorer.name)!;
		return {
			scorer: scorer.name,
			frames: frames.length,
			switchesPerHour: Number((switchesInWindow.get(scorer.name)! / hours).toFixed(1)),
			voluntarySwitchesTotal: viewer.voluntarySwitches,
			labelledMoments: labels.length,
			hitAt1: weight > 0 ? Number((hits / weight).toFixed(3)) : null,
			caught: weight > 0 ? Number((caught / weight).toFixed(3)) : null,
			meanRank: weight > 0 ? Number((rankSum / weight).toFixed(2)) : null,
			misses,
		};
	});

	console.log(`\nReplayed ${frames.length} polls, ${formatTime(frames[0]!.ts)} → ${formatTime(frames[frames.length - 1]!.ts)} (${hours.toFixed(1)} h), ${labels.length} labelled moments\n`);
	console.table(scorecard.map(({ misses: _misses, ...row }) => row));
	for (const row of scorecard) {
		if (row.misses.length === 0) continue;
		console.log(`\n${row.scorer} missed:`);
		for (const miss of row.misses.slice(0, 25)) console.log(`  ${miss}`);
	}

	if (flag('diff') && scorers.length >= 2) {
		const [a, b] = [scorers[0]!.name, scorers[1]!.name];
		console.log(`\nWhere ${a} and ${b} disagree on the top game:`);
		let open: { start: number; end: number; aTop: string; bTop: string; frame: Frame } | null = null;
		const flush = () => {
			if (!open) return;
			const lasted = Math.round((open.end - open.start) / 1000);
			console.log(`  ${formatTime(open.start)} (${lasted}s)  ${a}: ${describeGame(open.frame.games.get(open.aTop))}  |  ${b}: ${describeGame(open.frame.games.get(open.bTop))}`);
			open = null;
		};
		for (const frame of frames) {
			const aTop = frame.rankings.get(a)![0]?.gameId ?? '';
			const bTop = frame.rankings.get(b)![0]?.gameId ?? '';
			if (aTop === bTop) {
				flush();
				continue;
			}
			if (open && open.aTop === aTop && open.bTop === bTop) open.end = frame.ts;
			else {
				flush();
				open = { start: frame.ts, end: frame.ts, aTop, bTop, frame };
			}
		}
		flush();
	}

	const timelinePath = option('timeline');
	if (timelinePath) {
		const lines: string[] = [];
		let lastMinute = -1;
		for (const [index, frame] of frames.entries()) {
			const minute = Math.floor(frame.ts / 60_000);
			const next = frames[index + 1];
			if (minute === lastMinute || (next && Math.floor(next.ts / 60_000) === minute)) continue;
			lastMinute = minute;
			lines.push(`\n== ${new Date(frame.ts).toISOString()} (${formatTime(frame.ts)})`);
			const order = frame.rankings.get(scorers[scorers.length - 1]!.name)!;
			for (const score of order) {
				const totals = scorers.map(scorer => `${scorer.name}=${frame.rankings.get(scorer.name)!.find(s => s.gameId === score.gameId)?.total ?? '-'}`).join(' ');
				const boosts = Object.entries(score.boosts ?? {}).map(([id, points]) => `${id}+${points}`).join(' ');
				lines.push(`  ${score.gameId.padEnd(10)} ${describeGame(frame.games.get(score.gameId)).padEnd(58)} ${totals}${boosts ? `  [${boosts}]` : ''}`);
			}
		}
		mkdirSync(dirname(timelinePath), { recursive: true });
		writeFileSync(timelinePath, lines.join('\n'));
		console.log(`\nTimeline written to ${timelinePath}`);
	}

	const jsonPath = option('json');
	if (jsonPath) {
		mkdirSync(dirname(jsonPath), { recursive: true });
		writeFileSync(jsonPath, JSON.stringify(scorecard, null, '\t'));
	}
};

void main();
