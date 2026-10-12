import { parseScoreboardEvents } from '../src/apiClient';
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
