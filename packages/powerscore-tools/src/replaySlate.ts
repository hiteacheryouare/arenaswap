import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { listRecordingFiles, readRecording, unreadableLines } from './replay/recording';
import { createReplaySession, type Frame, type Scorer } from './replay/session';
import { createV3Scorer, replayPrefs, v2Scorer } from './replay/scorers';
import { describeGame } from './replay/describe';
import { getHistoryWindowMsForGame, normalizeFantasyRoster } from '@arenaswap/core';
import type { BuiltInModeId } from 'powerscore';

type FanInterest = 0 | 1 | 2 | 3;

interface LabelledMoment {
	ts: string | number;
	flipTo: string;
	acceptable?: string[];
	level?: FanInterest;
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
const pathFromLaunchDir = (name: string): string | undefined => {
	const value = option(name);
	return value === undefined ? undefined : resolve(process.env.INIT_CWD ?? process.cwd(), value);
};
const flag = (name: string): boolean => args.includes(`--${name}`);
const toTime = (value: string | number | undefined): number | undefined => {
	if (value === undefined) return undefined;
	const time = typeof value === 'number' ? value : Date.parse(value);
	if (!Number.isFinite(time)) throw new Error(`Not a time: ${value}`);
	return time;
};

const packageRoot = join(__dirname, '..');
const recordingPath = pathFromLaunchDir('recording') ?? join(packageRoot, 'recordings');
const from = toTime(option('from'));
const to = toTime(option('to'));
const modes = (option('modes') ?? 'classic').split(',') as BuiltInModeId[];
const labelsDir = join(packageRoot, 'fixtures', 'labels');

const maxCountedGapMs = 5 * 60_000;
const maxLabelLagMs = 90_000;

const readLabels = (): LabelFile[] => {
	const explicit = pathFromLaunchDir('labels');
	const files = explicit ? [explicit] : existsSync(labelsDir) ? readdirSync(labelsDir).filter(name => name.endsWith('.json')).map(name => join(labelsDir, name)) : [];
	return files.map(file => JSON.parse(readFileSync(file, 'utf8')) as LabelFile);
};

const scorers: Scorer[] = [v2Scorer, ...modes.map(mode => createV3Scorer(mode))];

const historyWindowOf = (gameId: string, frame: Frame) => getHistoryWindowMsForGame(frame.games.get(gameId) ?? { sportType: 'basketball' });

const formatTime = (ts: number): string => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const main = async () => {
	const files = listRecordingFiles(recordingPath);
	const rosterPath = pathFromLaunchDir('roster');
	const roster = rosterPath ? normalizeFantasyRoster(JSON.parse(readFileSync(rosterPath, 'utf8'))) : [];
	const session = createReplaySession(scorers, replayPrefs, roster);
	const frames: Frame[] = [];
	const switchesInWindow = new Map(scorers.map(scorer => [scorer.name, 0]));

	for await (const event of readRecording(files, to)) {
		const frame = session.handle(event);
		if (!frame || (from !== undefined && frame.ts < from)) continue;
		frames.push(frame);
		for (const scorer of scorers) if (frame.switchedAway.get(scorer.name)) switchesInWindow.set(scorer.name, switchesInWindow.get(scorer.name)! + 1);
	}
	if (frames.length === 0) {
		console.log('No live polls in that recording window.');
		return;
	}

	const polledMs = frames.slice(1).reduce((total, frame, i) => total + Math.min(frame.ts - frames[i]!.ts, maxCountedGapMs), 0);
	const hours = Math.max(1 / 60, polledMs / 3_600_000);
	const labels = readLabels().flatMap(file => file.moments.map(moment => ({ ...moment, ts: toTime(moment.ts)! })))
		.filter(moment => moment.ts >= frames[0]!.ts && moment.ts <= frames[frames.length - 1]!.ts);

	const frameAt = (ts: number): Frame | undefined => {
		let found: Frame | undefined;
		for (const frame of frames) {
			if (frame.ts > ts) break;
			found = frame;
		}
		return found && ts - found.ts <= maxLabelLagMs ? found : undefined;
	};

	const isCold = (moment: { ts: number; flipTo: string }, frame: Frame) => {
		const seen = frame.firstSeen.get(moment.flipTo);
		return seen === undefined || moment.ts - seen < historyWindowOf(moment.flipTo, frame);
	};
	let coldSkipped = 0;
	const scorable = labels.filter(moment => {
		const frame = frameAt(moment.ts);
		if (!frame || flag('include-cold') || !isCold(moment, frame)) return true;
		coldSkipped++;
		return false;
	});

	const scorecard = scorers.map(scorer => {
		let hits = 0;
		let caught = 0;
		let rankSum = 0;
		let weight = 0;
		let ties = 0;
		const misses: string[] = [];
		for (const moment of scorable) {
			const allowed = new Set([moment.flipTo, ...(moment.acceptable ?? [])]);
			const frame = frameAt(moment.ts);
			if (!frame) continue;
			const ranking = frame.rankings.get(scorer.name)!;
			const momentWeight = moment.level ?? 1;
			weight += momentWeight;
			const top = ranking[0]?.total;
			const tied = ranking.filter(score => score.total === top);
			if (tied.length > 1) ties++;
			const share = tied.filter(score => allowed.has(score.gameId)).length / Math.max(1, tied.length);
			hits += momentWeight * share;
			const placeOf = (gameId: string) => {
				const total = ranking.find(score => score.gameId === gameId)?.total;
				return total === undefined ? ranking.length + 1 : 1 + ranking.filter(score => score.total > total).length;
			};
			rankSum += Math.min(...[...allowed].map(placeOf)) * momentWeight;
			if (share < 1) misses.push(`${formatTime(moment.ts)} wanted ${describeGame(frame.games.get(moment.flipTo))}, top was ${describeGame(frame.games.get(ranking[0]?.gameId ?? ''))} (${ranking[0]?.total})`);
			const wasWatched = frames.some(f => f.ts >= moment.ts - 30_000 && f.ts <= moment.ts + 90_000 && allowed.has(f.watching.get(scorer.name) ?? ''));
			if (wasWatched) caught += momentWeight;
		}
		return {
			scorer: scorer.name,
			frames: frames.length,
			switchesPerHour: Number((switchesInWindow.get(scorer.name)! / hours).toFixed(1)),
			labelledMoments: scorable.length,
			coldSkipped,
			tiesAtTop: ties,
			hitAt1: weight > 0 ? Number((hits / weight).toFixed(3)) : null,
			caught: weight > 0 ? Number((caught / weight).toFixed(3)) : null,
			meanRank: weight > 0 ? Number((rankSum / weight).toFixed(2)) : null,
			misses,
		};
	});

	console.log(`\nReplayed ${frames.length} polls, ${formatTime(frames[0]!.ts)} → ${formatTime(frames[frames.length - 1]!.ts)} (${hours.toFixed(1)} h), ${labels.length} labelled moments\n`);
	console.table(scorecard.map(({ misses: _misses, ...row }) => row));
	const unreadable = [...unreadableLines.values()].reduce((total, count) => total + count, 0);
	if (unreadable > unreadableLines.size) console.log(`${unreadable} unreadable lines across ${unreadableLines.size} files (expected: at most one torn tail each).`);
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

	const timelinePath = pathFromLaunchDir('timeline');
	if (timelinePath) {
		const lines: string[] = [];
		let lastMinute = -1;
		for (const [index, frame] of frames.entries()) {
			const minute = Math.floor(frame.ts / 60_000);
			const next = frames[index + 1];
			if (minute === lastMinute || (next && Math.floor(next.ts / 60_000) === minute)) continue;
			lastMinute = minute;
			lines.push(`\n== ${new Date(frame.ts).toISOString()} (${formatTime(frame.ts)})`);
			const order = flag('blind')
				? frame.rankings.get(scorers[0]!.name)!.toSorted((a, b) => describeGame(frame.games.get(a.gameId)).localeCompare(describeGame(frame.games.get(b.gameId))))
				: frame.rankings.get(scorers[scorers.length - 1]!.name)!;
			for (const score of order) {
				if (flag('blind')) {
					lines.push(`  ${score.gameId.padEnd(10)} ${describeGame(frame.games.get(score.gameId))}`);
					continue;
				}
				const totals = scorers.map(scorer => `${scorer.name}=${frame.rankings.get(scorer.name)!.find(s => s.gameId === score.gameId)?.total ?? '-'}`).join(' ');
				const boosts = Object.entries(score.boosts ?? {}).map(([id, points]) => `${id}+${points}`).join(' ');
				lines.push(`  ${score.gameId.padEnd(10)} ${describeGame(frame.games.get(score.gameId)).padEnd(58)} ${totals}${boosts ? `  [${boosts}]` : ''}`);
			}
		}
		mkdirSync(dirname(timelinePath), { recursive: true });
		writeFileSync(timelinePath, lines.join('\n'));
		console.log(`\nTimeline written to ${timelinePath}`);
	}

	const jsonPath = pathFromLaunchDir('json');
	if (jsonPath) {
		mkdirSync(dirname(jsonPath), { recursive: true });
		writeFileSync(jsonPath, JSON.stringify(scorecard, null, '\t'));
	}
};

void main();
