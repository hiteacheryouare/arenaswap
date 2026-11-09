import type { Game } from '@arenaswap/core/types';
import { describeDelayLeft, findDelayedGameLeft } from '../utils/delayNotice';

const strings: Record<string, string> = {
	'notification.leftDelay.rain': 'Rain delay in {city}.',
	'notification.leftDelay.other': 'Play stopped in {city}.',
	'notification.leftDelayNoCity.rain': 'Rain delay.',
};
const t = (key: string, subs?: Record<string, string>) => (strings[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => subs?.[name] ?? '');

const game = (id: string, extra: Partial<Game> = {}): Game => ({
	id,
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	homeTeam: { id: 'h', name: 'Boston Red Sox', abbreviation: 'BOS', score: 2 },
	awayTeam: { id: 'a', name: 'St. Louis Cardinals', abbreviation: 'STL', score: 2 },
	...extra,
});

describe('the note for leaving a game that stopped', () => {
	test('names the kind of delay and the city', () => {
		expect(describeDelayLeft({ delayKind: 'rain', venueLocation: 'Boston, MA' }, t)).toBe('Rain delay in Boston.');
		expect(describeDelayLeft({ venueLocation: 'Madrid, Spain' }, t)).toBe('Play stopped in Madrid.');
	});

	test('drops the city when there is none', () => {
		expect(describeDelayLeft({ delayKind: 'rain' }, t)).toBe('Rain delay.');
	});

	test('is only for a live game in a delay that is not the one being switched to', () => {
		const rainedOn = game('fenway', { delayed: true, delayKind: 'rain' });
		const games = [rainedOn, game('busch'), game('wrigley', { status: 'post', delayed: true })];
		expect(findDelayedGameLeft(games, 'fenway', 'busch')).toBe(rainedOn);
		expect(findDelayedGameLeft(games, 'busch', 'fenway')).toBeUndefined();
		expect(findDelayedGameLeft(games, 'wrigley', 'busch')).toBeUndefined();
		expect(findDelayedGameLeft(games, 'fenway', 'fenway')).toBeUndefined();
		expect(findDelayedGameLeft(games, undefined, 'busch')).toBeUndefined();
	});
});
