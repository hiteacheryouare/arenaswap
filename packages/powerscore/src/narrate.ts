import { getClockSecondsRemaining } from './progress';
import { formatClock } from './reasons';
import { teamName, teamNameFor } from './teams';
import type { ReasonFragment, ScoredBoost, SignalInput } from './types';

export interface SpokenSignal {
	id: string;
	points: number;
	reason?: ReasonFragment;
}

interface Candidate {
	points: number;
	fragment: ReasonFragment;
}

const sentenceLimit = 3;

// Below this an upset is a row in the breakdown, not a line of its own.
const upsetMentionPoints = 3;

const momentBoosts = new Set(['twoMinuteDrill', 'scoringOpportunity', 'goAheadRun', 'noHitter', 'redCard']);

// Boost detail keys that read as a moment, renamed where several say the same thing to a viewer.
const momentKeys: Record<string, string> = {
	redZone: 'redZone',
	redZoneThirdAndShort: 'redZoneThirdAndShort',
	redZoneFourthDown: 'redZoneFourthDown',
	driveTrailing: 'driveTrailing',
	driveTied: 'driveTied',
	emptyNet: 'emptyNet',
	powerPlayTied: 'powerPlay',
	powerPlayClose: 'powerPlay',
	powerPlayTeamTied: 'powerPlayTeam',
	powerPlayTeamTrailing: 'powerPlayTeam',
	powerPlayTeamLeading: 'powerPlayTeam',
	goAheadRun: 'goAheadRun',
	tyingRun: 'tyingRun',
	winningRun: 'winningRun',
	runnerSecond: 'runnerSecond',
	runnerThird: 'runnerThird',
	runnersFirstSecond: 'runnersFirstSecond',
	runnersFirstThird: 'runnersFirstThird',
	runnersSecondThird: 'runnersSecondThird',
	basesLoaded: 'basesLoaded',
	noHitter: 'noHitter',
	doubleNoHitter: 'doubleNoHitter',
	redCard: 'redCard',
};

// These give the score and the clock themselves.
const scoreKeys = new Set(['driveTrailing', 'driveTied', 'emptyNet']);

// These leave the game level, so the score sentence would only say "Tied" again: they take its time.
const levelKeys = new Set(['tiedIt', 'cameBack']);

const stakesKeys = new Set(['seriesClinch', 'seriesDecider', 'raceClinch', 'raceElimination']);
const upsetKeys = new Set(['underdogLeading', 'underdogLevel', 'underdogClose']);

const fantasyMomentKeys = new Set([
	'fantasyHasBall', 'fantasyRedZone', 'fantasyFieldGoalRange', 'fantasyDefense',
	'fantasyAtBat', 'fantasyOnDeck', 'fantasyPitching', 'fantasyInGame',
]);
const fantasyContextKeys = new Set(['fantasyRostered']);

const runKeys = new Set(['run', 'scoredStraight']);
const comebackKeys = new Set(['tiedIt', 'cameBack', 'cameBackToLead', 'cutDeficit']);

const withTeamName = (input: SignalInput, { key, params }: ReasonFragment, renamed = key): ReasonFragment => {
	if (params?.team === undefined) return params ? { key: renamed, params } : { key: renamed };
	return { key: renamed, params: { ...params, team: teamNameFor(input.game, params.team) } };
};

const strongest = (candidates: readonly (Candidate | undefined)[]): Candidate | undefined => (
	candidates.reduce<Candidate | undefined>((best, candidate) => (candidate && (!best || candidate.points > best.points) ? candidate : best), undefined)
);

const momentOf = (input: SignalInput, signals: readonly SpokenSignal[], boosts: readonly ScoredBoost[]): Candidate | undefined => strongest([
	...signals.filter(signal => signal.reason && fantasyMomentKeys.has(signal.reason.key)).map(signal => ({ points: signal.points, fragment: signal.reason! })),
	...boosts.filter(boost => boost.points > 0 && momentBoosts.has(boost.id)).map(boost => {
		const detail = boost.details?.find(candidate => momentKeys[candidate.key] !== undefined);
		return detail && { points: boost.points, fragment: withTeamName(input, detail, momentKeys[detail.key]) };
	}),
]);

const teamOf = (candidate: Candidate | undefined) => candidate?.fragment.params?.team;

// A run that put its team ahead is one sentence, not two, and so is a comeback built on one.
const storyOf = (signals: readonly SpokenSignal[]): Candidate | undefined => {
	const stories = signals
		.filter(signal => signal.reason && !fantasyMomentKeys.has(signal.reason.key) && !fantasyContextKeys.has(signal.reason.key))
		.map(signal => ({ points: signal.points, fragment: signal.reason! }));
	const run = stories.find(story => runKeys.has(story.fragment.key) || story.fragment.key === 'outscoring');
	const lead = stories.find(story => story.fragment.key === 'tookLead');
	const comeback = stories.find(story => comebackKeys.has(story.fragment.key));
	if (run && comeback && teamOf(run) === teamOf(comeback)) {
		return strongest([{ points: run.points + comeback.points, fragment: comeback.fragment }, ...stories.filter(story => story !== run && story !== comeback)]);
	}
	if (run && lead && teamOf(run) === teamOf(lead) && runKeys.has(run.fragment.key)) {
		const merged = { points: run.points + lead.points, fragment: { key: `${run.fragment.key}ToLead`, params: run.fragment.params! } };
		return strongest([merged, ...stories.filter(story => story !== run && story !== lead)]);
	}
	return strongest(stories);
};

const contextOf = (input: SignalInput, signals: readonly SpokenSignal[], boosts: readonly ScoredBoost[]): Candidate | undefined => strongest([
	...signals.filter(signal => signal.reason && fantasyContextKeys.has(signal.reason.key)).map(signal => ({ points: signal.points, fragment: signal.reason! })),
	...boosts.filter(boost => boost.points > 0).map(boost => {
		const stakes = boost.id === 'stakes' ? boost.details?.find(detail => stakesKeys.has(detail.key)) : undefined;
		if (stakes) return { points: boost.points, fragment: withTeamName(input, stakes) };
		const upset = boost.points >= upsetMentionPoints ? boost.details?.find(detail => upsetKeys.has(detail.key)) : undefined;
		if (!upset) return undefined;
		const team = teamNameFor(input.game, upset.params?.team);
		return { points: boost.points, fragment: { key: 'upset', params: { team, chance: upset.params?.chance ?? 0 } } };
	}),
]);

type When = Record<string, string | number>;

// Where the game is, in the terms a broadcast uses for that sport.
const whenOf = ({ game, sport, league }: SignalInput): When | 'shootout' | 'penaltyShootout' | undefined => {
	const period = game.period;
	if (period == null) return undefined;
	const regular = Math.max(1, league.regularPeriods);
	if (!sport.clockBased) {
		if (game.topOfInning === undefined) return { when: 'inning', period };
		return { when: game.topOfInning ? 'top' : 'bottom', period };
	}
	if (sport.clockCountsUp) {
		if (period > regular + 2) return 'penaltyShootout';
		if (period > regular) return { when: 'extraTime' };
		const elapsed = sport.clockIsFullGameElapsed
			? game.clockSeconds
			: game.clockSeconds === undefined ? undefined : (period - 1) * league.periodDurationSecs + game.clockSeconds;
		return elapsed === undefined ? undefined : { when: 'minute', period: Math.max(1, Math.floor(elapsed / 60)) };
	}
	const remaining = getClockSecondsRemaining(game, sport, Math.max(1, league.periodDurationSecs));
	const clock = remaining !== null && remaining > 0 ? formatClock(remaining) : undefined;
	if (period > regular) {
		const overtime = period - regular;
		if (game.sportType === 'hockey' && game.seasonType !== 'postseason' && overtime > 1) return 'shootout';
		if (overtime > 1) return { when: 'overtimeNumbered', period: overtime };
		return clock ? { when: 'overtimeClock', clock } : { when: 'overtime' };
	}
	if (period === regular && clock) return { when: 'clock', clock };
	return { when: regular === 2 ? 'half' : regular === 3 ? 'period' : 'quarter', period };
};

// English needs no unit on "up 3", but a language that counts goals with their own word does.
const marginUnit = ({ game }: SignalInput): string => {
	if (game.sportType === 'hockey' || game.sportType === 'soccer') return 'goal';
	return game.sportType === 'baseball' || game.sportType === 'softball' ? 'run' : 'point';
};

const stateOf = (input: SignalInput, when: ReturnType<typeof whenOf>, previousTeam: unknown): ReasonFragment => {
	if (when === 'shootout' || when === 'penaltyShootout') return { key: when };
	const { homeTeam, awayTeam } = input.game;
	const leader = homeTeam.score === awayTeam.score ? undefined : teamName(homeTeam.score > awayTeam.score ? homeTeam : awayTeam);
	const score: When = leader === undefined
		? { score: 'tied' }
		: { score: leader === previousTeam ? 'up' : 'lead', team: leader, margin: input.margin, unit: marginUnit(input) };
	return { key: 'state', params: { ...score, ...when } };
};

// What is happening right now, what just happened, the score and the time, then what is at stake,
// dropping the stakes first when all four have something to say.
export const narrate = (input: SignalInput, signals: readonly SpokenSignal[], boosts: readonly ScoredBoost[]): ReasonFragment[] => {
	const moment = momentOf(input, signals, boosts)?.fragment;
	let story = storyOf(signals)?.fragment;
	const when = whenOf(input);
	const momentGivesScore = moment !== undefined && scoreKeys.has(moment.key);
	const level = !momentGivesScore && story !== undefined && levelKeys.has(story.key) && typeof when === 'object';
	if (level) story = { key: story!.key, params: { ...story!.params, ...(when as When) } };
	const lines = [moment, story].filter((line): line is ReasonFragment => line !== undefined);
	if (!level && !momentGivesScore) lines.push(stateOf(input, when, lines.at(-1)?.params?.team));
	const context = contextOf(input, signals, boosts)?.fragment;
	if (context && lines.length < sentenceLimit) lines.push(context);
	return lines;
};
