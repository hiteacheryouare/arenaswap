import { seriesSlots } from '../entrypoints/popup/components/seriesSlots';
import type { SeriesEvent } from '../entrypoints/popup/components/useSummaryData';

const won = (teamId: string): SeriesEvent => ({
	statusType: { completed: true },
	competitors: [{ homeAway: 'home', winner: true, team: { id: teamId } }, { homeAway: 'away', winner: false, team: { id: 'other' } }],
});
const pending = (): SeriesEvent => ({ statusType: { completed: false } });

const kinds = (...args: Parameters<typeof seriesSlots>) => seriesSlots(...args).map(slot => slot.kind);

describe('seriesSlots', () => {
	// CIN @ LAD, 2025 NL Wild Card. ESPN's playoff entry keeps the best-of-three and lists only the
	// two games played.
	test('marks the games a sweep made unnecessary', () => {
		expect(kinds({ type: 'playoff', totalCompetitions: 3, events: [won('19'), won('19')] }))
			.toEqual(['won', 'won', 'notNeeded']);
	});

	// MTL @ WSH, 2025 first round: over in five, with games six and seven never scheduled.
	test('marks every leftover game once a best-of-seven is decided', () => {
		expect(kinds({ type: 'playoff', totalCompetitions: 7, events: [won('23'), won('23'), won('10'), won('23'), won('23')] }))
			.toEqual(['won', 'won', 'won', 'won', 'won', 'notNeeded', 'notNeeded']);
	});

	// HOU @ GS, 2025 first round, after game four. The NBA lists all seven with the future first.
	test('keeps the next game certain and waits on the rest when a side leads 3-1', () => {
		expect(kinds({
			type: 'playoff',
			totalCompetitions: 7,
			events: [pending(), pending(), pending(), won('9'), won('10'), won('9'), won('9')],
		})).toEqual(['won', 'won', 'won', 'won', 'upcoming', 'ifNecessary', 'ifNecessary']);
	});

	test('treats the first four games of an unplayed best-of-seven as certain', () => {
		expect(kinds({ type: 'playoff', totalCompetitions: 7, events: [] }))
			.toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming', 'ifNecessary', 'ifNecessary', 'ifNecessary']);
	});

	test('leaves nothing waiting on a series that goes the distance', () => {
		expect(kinds({ type: 'playoff', totalCompetitions: 7, events: [won('1'), won('3'), won('1'), won('1'), won('3'), won('3'), pending()] }))
			.toEqual(['won', 'won', 'won', 'won', 'won', 'won', 'upcoming']);
	});

	// LAD win a three-game set 2-0 in July, and game three is still played.
	test('plays out every game of a regular-season set, whoever has won it', () => {
		expect(kinds({ type: 'current', totalCompetitions: 3, events: [won('19'), won('19'), pending()] }))
			.toEqual(['won', 'won', 'upcoming']);
	});

	test('keeps the winner of each game in the order played', () => {
		expect(seriesSlots({ type: 'playoff', totalCompetitions: 3, events: [pending(), won('5'), won('17')] }))
			.toEqual([{ kind: 'won', teamId: '5' }, { kind: 'won', teamId: '17' }, { kind: 'upcoming' }]);
	});

	// seriesInfo never passes a schema, so a finished game can arrive without a winner on it.
	test('draws a game with no recorded winner without counting it toward a clinch', () => {
		expect(seriesSlots({ type: 'playoff', totalCompetitions: 3, events: [won('19'), { statusType: { completed: true } }] }))
			.toEqual([{ kind: 'won', teamId: '19' }, { kind: 'won', teamId: undefined }, { kind: 'upcoming' }]);
	});
});
