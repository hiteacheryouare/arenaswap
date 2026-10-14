import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LeagueId } from '@arenaswap/core';

/*
	What really happened, from a game's post-game play-by-play: every stretch of 90 seconds or more
	between two pieces of action is a dead interval, labelled by what was logged inside it. Reviews
	and injuries land in here too, so the truth is rough, but it is the same truth every rule is
	scored against.
*/

export type DeadIntervalKind =
	| 'inningBreak' | 'pitchingChange' | 'review' | 'delay' | 'gap'
	| 'intermission' | 'periodEnd' | 'twoMinuteWarning' | 'tvTimeout' | 'teamTimeout'
	| 'afterScore' | 'afterKickoff' | 'afterPunt' | 'afterGoal';

export interface Play {
	at: number;
	id: string;
	type: string;
	typeKey: string;
	text: string;
	summaryType?: string;
}

export interface DeadInterval {
	start: number;
	end: number;
	kind: DeadIntervalKind;
	// The action play the interval follows.
	after: Play;
}

export const minimumGapMs = 90_000;

interface RawPlay {
	id?: string | number;
	wallclock?: string;
	text?: string;
	type?: { text?: string; type?: string; abbreviation?: string };
	sequenceNumber?: string | number;
	summaryType?: string;
}

interface RawSummary {
	plays?: RawPlay[];
	drives?: { previous?: { plays?: RawPlay[] }[]; current?: { plays?: RawPlay[] } };
}

export const playByPlayPath = (directory: string, league: LeagueId, gameId: string): string => join(directory, `${league}-${gameId}.json`);

export const readPlays = (file: string): Play[] => {
	if (!existsSync(file)) return [];
	const summary = JSON.parse(readFileSync(file, 'utf8')) as RawSummary;
	const raw = summary.drives
		? [...(summary.drives.previous ?? []), ...(summary.drives.current ? [summary.drives.current] : [])].flatMap(drive => drive.plays ?? [])
		: summary.plays ?? [];
	return raw
		.filter((play): play is RawPlay & { wallclock: string } => typeof play.wallclock === 'string')
		.map(play => ({
			at: Date.parse(play.wallclock),
			id: String(play.id),
			type: play.type?.text ?? '',
			typeKey: play.type?.type ?? play.type?.abbreviation ?? '',
			text: play.text ?? '',
			summaryType: play.summaryType,
			sequence: Number(play.sequenceNumber ?? 0),
		}))
		.toSorted((a, b) => a.at - b.at || a.sequence - b.sequence)
		.map(({ sequence: _sequence, ...play }) => play);
};

const baseballActionKeys = new Set(['stolen-base', 'pick-off', 'caught-stealing', 'balk', 'wild-pitch']);
const hockeyDeadTypes = new Set(['stoppage', 'period end', 'period start', 'end of game', 'shootout end']);

export const isAction = (sport: string, play: Play): boolean => {
	const type = play.type.toLowerCase();
	if (sport === 'baseball' || sport === 'softball') return play.summaryType === 'P' || baseballActionKeys.has(play.typeKey);
	if (sport === 'football') return !/timeout|end period|end of|two-minute|coin toss/.test(type);
	if (sport === 'basketball') return type === 'jumpball' || !/timeout|substitution|end period|end game|challenge|review|instant replay|jumpball/.test(type);
	if (sport === 'hockey') return !hockeyDeadTypes.has(type) && !play.text.toLowerCase().includes('timeout');
	return true;
};

const describe = (plays: Play[]): string => plays.map(play => `${play.type}: ${play.text}`.toLowerCase()).join(' | ');

const labelBaseball = (inner: Play[]): DeadIntervalKind => {
	if (inner.some(play => play.typeKey === 'end-inning' || play.typeKey === 'start-inning')) return 'inningBreak';
	const text = describe(inner);
	if (text.includes('relieved')) return 'pitchingChange';
	if (/challenge|review|overturned|confirmed/.test(text)) return 'review';
	if (/mound visit|injur|delay/.test(text)) return 'delay';
	return 'gap';
};

const labelClockSport = (sport: string, after: Play, inner: Play[], durationMs: number): DeadIntervalKind => {
	const text = describe(inner);
	if (/end of half|end quarter 2|end of 2nd quarter|halftime/.test(text) || durationMs >= 8 * 60_000) return 'intermission';
	if (sport === 'hockey' && text.includes('period end')) return 'intermission';
	if (sport === 'basketball' && text.includes('end period') && text.includes('2nd')) return 'intermission';
	if (/end period|end of the 1st|end of the 3rd|end of 1st|end of 3rd|end quarter/.test(text)) return 'periodEnd';
	if (text.includes('two-minute')) return 'twoMinuteWarning';
	if (/official timeout|tv timeout|official tv/.test(text)) return 'tvTimeout';
	if (text.includes('timeout')) return 'teamTimeout';
	if (/challenge|review/.test(text)) return 'review';
	const before = after.type.toLowerCase();
	if (sport === 'football') {
		if (/touchdown|field goal good|extra point|two point|safety/.test(before)) return 'afterScore';
		if (before.includes('kickoff')) return 'afterKickoff';
		if (before.includes('punt')) return 'afterPunt';
	}
	if (sport === 'hockey' && before === 'goal') return 'afterGoal';
	return 'gap';
};

export const deadIntervals = (sport: string, plays: Play[]): { intervals: DeadInterval[]; action: Play[] } => {
	const action = plays.filter(play => isAction(sport, play));
	const baseball = sport === 'baseball' || sport === 'softball';
	const intervals = action.slice(1).flatMap((next, index): DeadInterval[] => {
		const after = action[index]!;
		const durationMs = next.at - after.at;
		if (durationMs < minimumGapMs) return [];
		// Inning markers are logged at the third out's own timestamp, so baseball takes ties.
		const inner = baseball
			? plays.filter(play => play !== after && play !== next && play.at >= after.at && play.at <= next.at)
			: plays.filter(play => play.at >= after.at && play.at <= next.at && !isAction(sport, play));
		const kind = baseball ? labelBaseball(inner) : labelClockSport(sport, after, inner, durationMs);
		return [{ start: after.at, end: next.at, kind, after }];
	});
	return { intervals, action };
};
