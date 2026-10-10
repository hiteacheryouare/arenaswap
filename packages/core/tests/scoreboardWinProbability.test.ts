import { computeWinProbVarianceScore } from 'powerscore';
import { parseScoreboardEvents } from '../src/apiClient';
import { createWinProbabilityTracker, scoreboardWinProbabilityLeagues, summaryStillNeeded } from '../src/scoreboardWinProbability';
import type { Game, LeagueId } from '../src/types';
import recorded from './fixtures/liveExtras/nflLiveWinProbability.json';

type Json = any;

const scoreboard = (edit: (event: Json) => void = () => {}) => {
	const event = structuredClone(recorded.event) as Json;
	edit(event);
	return { events: [event] };
};

const situationOf = (event: Json) => event.competitions[0].situation;

describe('reading the win probability off the scoreboard', () => {
	test('a live football game carries the home side\'s chance and the play it follows', () => {
		const [game] = parseScoreboardEvents(scoreboard(), 'nfl');
		expect(game!.homeWinProbability).toBe(0.4271);
		expect(game!.lastPlayId).toBe('40187296562');
	});

	test('a game whose last play has no probability reads as none', () => {
		const [game] = parseScoreboardEvents(scoreboard(event => delete situationOf(event).lastPlay.probability), 'nfl');
		expect(game!.homeWinProbability).toBeUndefined();
		expect(game!.homeTeam.score).toBeGreaterThanOrEqual(0);
	});

	test('a probability in a shape we do not expect costs the reading, not the scoreboard', () => {
		const [game] = parseScoreboardEvents(scoreboard(event => {
			situationOf(event).lastPlay.probability = { homeWinPercentage: '0.43' };
		}), 'nfl');
		expect(game!.homeWinProbability).toBeUndefined();
		expect(game!.lastPlay).toBeDefined();
	});

	test('a value past either end is held to 0 to 1', () => {
		const high = parseScoreboardEvents(scoreboard(event => { situationOf(event).lastPlay.probability.homeWinPercentage = 1.2; }), 'nfl');
		const low = parseScoreboardEvents(scoreboard(event => { situationOf(event).lastPlay.probability.homeWinPercentage = -0.1; }), 'nfl');
		expect(high[0]!.homeWinProbability).toBe(1);
		expect(low[0]!.homeWinProbability).toBe(0);
	});

	test('a finished game keeps none', () => {
		const [game] = parseScoreboardEvents(scoreboard(event => { event.competitions[0].status.type.state = 'post'; }), 'nfl');
		expect(game!.homeWinProbability).toBeUndefined();
	});
});

const liveGame = (over: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nfl' as LeagueId,
	sportType: 'football',
	status: 'in',
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 7 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 3 },
	period: 2,
	clockSeconds: 400,
	homeWinProbability: 0.6,
	lastPlayId: 'play-1',
	...over,
});

const roundTrip = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

describe('building the line from our own polls', () => {
	test('keeps one reading per play, however many polls land on it', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([liveGame()]);
		tracker.record([liveGame()]);
		tracker.record([liveGame({ homeWinProbability: 0.65, lastPlayId: 'play-2' })]);
		tracker.record([liveGame({ homeWinProbability: 0.65, lastPlayId: 'play-2' })]);
		tracker.record([liveGame({ homeWinProbability: 0.65, lastPlayId: 'play-3' })]);

		expect(tracker.historyOf('g1')).toEqual([0.6, 0.65, 0.65]);
	});

	test('a flat stretch at the same value still counts every play in it', () => {
		const tracker = createWinProbabilityTracker();
		['p1', 'p2', 'p3', 'p4', 'p5'].forEach(lastPlayId => tracker.record([liveGame({ homeWinProbability: 0.999, lastPlayId })]));
		expect(tracker.historyOf('g1')).toHaveLength(5);
	});

	test('without a play id, a repeated value is taken as the same play', () => {
		const tracker = createWinProbabilityTracker();
		[0.5, 0.5, 0.55, 0.55, 0.5].forEach(homeWinProbability => tracker.record([liveGame({ homeWinProbability, lastPlayId: undefined })]));
		expect(tracker.historyOf('g1')).toEqual([0.5, 0.55, 0.5]);
	});

	test('keeps each game on its own line', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([liveGame(), liveGame({ id: 'g2', homeWinProbability: 0.2, lastPlayId: 'x-1' })]);
		expect(tracker.historyOf('g1')).toEqual([0.6]);
		expect(tracker.historyOf('g2')).toEqual([0.2]);
	});

	test('only live games in a league whose scoreboard we trust are read', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([
			liveGame({ id: 'mlb', league: 'mlb' as LeagueId, sportType: 'baseball' }),
			liveGame({ id: 'nba', league: 'nba' as LeagueId, sportType: 'basketball' }),
			liveGame({ id: 'final', status: 'post' }),
			liveGame({ id: 'bare', homeWinProbability: undefined }),
		]);
		['mlb', 'nba', 'final', 'bare'].forEach(id => expect(tracker.historyOf(id)).toBeUndefined());
	});

	test('the boost has what it needs after five plays', () => {
		const tracker = createWinProbabilityTracker();
		[0.5, 0.52, 0.55, 0.51, 0.49].forEach((homeWinProbability, i) => tracker.record([liveGame({ homeWinProbability, lastPlayId: `p${i}` })]));
		expect(computeWinProbVarianceScore(tracker.historyOf('g1')!)).toBeGreaterThan(0);
	});

	test('forgets a game that is no longer live', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([liveGame(), liveGame({ id: 'g2' })]);
		tracker.retainOnly(new Set(['g2']));
		expect(tracker.historyOf('g1')).toBeUndefined();
		expect(tracker.historyOf('g2')).toEqual([0.6]);
	});

	test('a game that runs long keeps its most recent plays', () => {
		const tracker = createWinProbabilityTracker();
		for (let i = 0; i < 700; i++) tracker.record([liveGame({ homeWinProbability: i / 1000, lastPlayId: `p${i}` })]);
		const line = tracker.historyOf('g1')!;
		expect(line).toHaveLength(600);
		expect(line[line.length - 1]).toBe(0.699);
	});
});

describe('picking up a game after its first play', () => {
	const fullLine = Array.from({ length: 20 }, (_, i) => 0.5 + (i % 3) / 100);

	test('the summary\'s longer line replaces what the tracker has seen, and polls carry on from it', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([liveGame({ homeWinProbability: 0.7, lastPlayId: 'p20' })]);
		tracker.adopt('g1', fullLine);
		expect(tracker.historyOf('g1')).toEqual(fullLine);

		tracker.record([liveGame({ homeWinProbability: 0.7, lastPlayId: 'p20' })]);
		tracker.record([liveGame({ homeWinProbability: 0.72, lastPlayId: 'p21' })]);
		expect(tracker.historyOf('g1')).toEqual([...fullLine, 0.72]);
	});

	test('a game the scoreboard has given nothing for is not started from the summary', () => {
		const tracker = createWinProbabilityTracker();
		tracker.adopt('g1', fullLine);
		expect(tracker.historyOf('g1')).toBeUndefined();
	});

	test('a summary line no longer than the tracker\'s own is ignored', () => {
		const tracker = createWinProbabilityTracker();
		fullLine.forEach((homeWinProbability, i) => tracker.record([liveGame({ homeWinProbability, lastPlayId: `p${i}` })]));
		tracker.adopt('g1', [0.1, 0.2]);
		expect(tracker.historyOf('g1')).toEqual(fullLine);
	});

	test('an adopted line still respects the cap', () => {
		const tracker = createWinProbabilityTracker();
		tracker.record([liveGame()]);
		tracker.adopt('g1', Array.from({ length: 800 }, (_, i) => i / 1000));
		expect(tracker.historyOf('g1')).toHaveLength(600);
		expect(tracker.historyOf('g1')![599]).toBe(0.799);
	});
});

// MV3 ends the worker whenever it idles, so the line has to come back from session storage and
// carry on from where it left off.
describe('a worker restart in the middle of a game', () => {
	test('the line comes back and carries on without counting the last play twice', () => {
		const before = createWinProbabilityTracker();
		['p1', 'p2', 'p3'].forEach((lastPlayId, i) => before.record([liveGame({ homeWinProbability: 0.5 + i / 10, lastPlayId })]));

		const after = createWinProbabilityTracker();
		after.hydrate(roundTrip(before.serialize()));
		expect(after.historyOf('g1')).toEqual([0.5, 0.6, 0.7]);

		after.record([liveGame({ homeWinProbability: 0.7, lastPlayId: 'p3' })]);
		after.record([liveGame({ homeWinProbability: 0.8, lastPlayId: 'p4' })]);
		after.record([liveGame({ homeWinProbability: 0.8, lastPlayId: 'p4' })]);
		expect(after.historyOf('g1')).toEqual([0.5, 0.6, 0.7, 0.8]);
	});

	test('whatever is not a list of numbers is dropped on the way back in', () => {
		const tracker = createWinProbabilityTracker();
		tracker.hydrate({ g1: [0.4, null, 'x', Number.NaN, 0.6], g2: 'nope', g3: [] });
		expect(tracker.historyOf('g1')).toEqual([0.4, 0.6]);
		expect(tracker.historyOf('g2')).toBeUndefined();
		expect(tracker.historyOf('g3')).toBeUndefined();

		tracker.hydrate(undefined);
		expect(tracker.historyOf('g1')).toBeUndefined();
	});
});

describe('when the summary is still worth fetching', () => {
	const settled = { hasScoreboardReadings: true, hasSummaryLine: true, hasRosteredPlayer: false };
	const football = { league: 'nfl' as LeagueId, sportType: 'football' as const };

	test('not once the scoreboard has the line and the summary has been read', () => {
		expect(summaryStillNeeded(football, settled)).toBe(false);
	});

	test('while the scoreboard has given no reading yet', () => {
		expect(summaryStillNeeded(football, { ...settled, hasScoreboardReadings: false })).toBe(true);
	});

	test('until the summary\'s line and closing line are in hand', () => {
		expect(summaryStillNeeded(football, { ...settled, hasSummaryLine: false })).toBe(true);
	});

	test('while a rostered fantasy player is in the game, for the box score', () => {
		expect(summaryStillNeeded(football, { ...settled, hasRosteredPlayer: true })).toBe(true);
	});

	test('always for a league whose scoreboard was not checked', () => {
		expect(summaryStillNeeded({ league: 'nhl' as LeagueId, sportType: 'hockey' }, settled)).toBe(true);
		expect(scoreboardWinProbabilityLeagues.has('nhl' as LeagueId)).toBe(false);
	});

	test('always for basketball, whose summary carries the lead-change count', () => {
		expect(summaryStillNeeded({ league: 'nba' as LeagueId, sportType: 'basketball' }, settled)).toBe(true);
	});
});
