import { readFantasyBoxScore } from '../src/fantasy';
import london from './fixtures/liveExtras/nflLondonBoxScore.json';

type Json = any;

const game = {
	sportType: 'football',
	homeTeam: { id: '28', name: 'Washington', abbreviation: 'WSH', score: 13 },
	awayTeam: { id: '11', name: 'Indianapolis', abbreviation: 'IND', score: 30 },
} as const;

const withFumbleRow = (teamIndex: number, stats: string[]): Json => {
	const summary = structuredClone(london.summary) as Json;
	const fumbles = summary.boxscore.players[teamIndex].statistics.find((category: Json) => category.name === 'fumbles');
	fumbles.athletes.push({ athlete: { id: '999' }, stats });
	return summary;
};

describe('readFantasyBoxScore on a real NFL box score', () => {
	test('credits each defense with its interceptions and the fumbles the other offense lost', () => {
		const { lines } = readFantasyBoxScore(london.summary, game);
		expect(lines.get('dst:28')).toEqual({ sacks: 2, takeaways: 2, pointsAllowed: 30 });
		expect(lines.get('dst:11')).toEqual({ sacks: 2, takeaways: 1, pointsAllowed: 13 });
	});

	// Our sources count an offense falling on its own fumble under `fumblesRecovered` too.
	test('gives the defense nothing for a fumble the offense recovered itself', () => {
		const { lines } = readFantasyBoxScore(withFumbleRow(1, ['1', '0', '1']), game);
		expect(lines.get('dst:11')?.takeaways).toBe(1);
		expect(lines.get('dst:28')?.takeaways).toBe(2);
	});

	test('scores a kicker\'s longest make at its tier and the rest at the shortest', () => {
		const { lines } = readFantasyBoxScore(london.summary, game);
		expect(lines.get('4571557')).toEqual({ fieldGoals50Plus: 1, fieldGoals0To39: 2, extraPointsMade: 3 });
		expect(lines.get('5081335')).toEqual({ fieldGoals0To39: 2, extraPointsMade: 1 });
	});
});
