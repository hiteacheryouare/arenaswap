import { computeFantasyPoints } from 'powerscore';
import { readFantasyBoxScore } from '../src/fantasyBoxScore';
import recorded from './fixtures/liveExtras/nhlMlbBoxScores.qa.json';

type Json = any;

const teamsOf = (competitors: { id: string; homeAway: string; score: string }[]) => {
	const side = (homeAway: string) => {
		const competitor = competitors.find(entry => entry.homeAway === homeAway)!;
		return { id: competitor.id, name: competitor.id, abbreviation: competitor.id, score: Number(competitor.score) };
	};
	return { homeTeam: side('home'), awayTeam: side('away') };
};

const rawRow = (summary: Json, athleteId: string): { keys: string[]; stats: string[] } => {
	for (const team of summary.boxscore.players) {
		for (const category of team.statistics) {
			const row = category.athletes.find((entry: Json) => entry.athlete.id === athleteId);
			if (row) return { keys: category.keys, stats: row.stats };
		}
	}
	throw new Error(`no row for ${athleteId}`);
};

const rawStat = (summary: Json, athleteId: string, key: string): number => {
	const { keys, stats } = rawRow(summary, athleteId);
	return Number(stats[keys.indexOf(key)]);
};

describe('a real NHL box score, Blackhawks at Sabres', () => {
	const nhl = { sportType: 'hockey' as const, ...teamsOf(recorded.nhl.competitors) };
	const { lines } = readFantasyBoxScore(recorded.nhl.summary, nhl);

	test('reads a goalie\'s saves and goals against', () => {
		// Spencer Knight: 24 saves on 28, 4 allowed.
		expect(lines.get('4565234')).toEqual({ saves: 24, goalsAgainst: 4 });
		expect(computeFantasyPoints('hockey', lines.get('4565234')!)).toBe(-3.2);
	});

	test('reads a forward\'s goals, assists and blocks', () => {
		const thompson = lines.get('4024988')!;
		expect([thompson.goals, thompson.assists, thompson.blockedShots]).toEqual([1, 1, 1]);
	});

	// The wire's own arithmetic says what `shotsTotal` is: one team's `shotsTotal` sums to exactly the
	// shots the other goalie faced, so it already is shots on goal, with misses counted separately.
	test('the recorded shotsTotal column is shots on goal', () => {
		const skaterIds = (abbreviation: string) => recorded.nhl.summary.boxscore.players
			.find((team: Json) => team.team.abbreviation === abbreviation)!.statistics
			.filter((category: Json) => category.name === 'forwards' || category.name === 'defenses')
			.flatMap((category: Json) => category.athletes.map((row: Json) => row.athlete.id as string));
		const chicagoShots = skaterIds('CHI').reduce((total: number, id: string) => total + rawStat(recorded.nhl.summary, id, 'shotsTotal'), 0);
		expect(chicagoShots).toBe(rawStat(recorded.nhl.summary, '4233889', 'shotsAgainst'));
	});

	test('reads shots on goal straight off shotsTotal, so missed shots never push it negative', () => {
		// Ryan Greene: no shots on goal, two missed.
		expect(rawStat(recorded.nhl.summary, '5080227', 'shotsTotal')).toBe(0);
		expect(rawStat(recorded.nhl.summary, '5080227', 'shotsMissed')).toBe(2);

		expect(lines.get('5080227')?.shotsOnGoal ?? 0).toBe(0);
		expect(computeFantasyPoints('hockey', lines.get('5080227')!)).toBe(0);
		expect(rawStat(recorded.nhl.summary, '4697389', 'shotsTotal')).toBe(5);
		expect(lines.get('4697389')?.shotsOnGoal).toBe(5);
	});
});

describe('a real MLB box score, Padres at Brewers', () => {
	const mlb = { sportType: 'baseball' as const, ...teamsOf(recorded.mlb.competitors) };
	const { lines } = readFantasyBoxScore(recorded.mlb.summary, mlb);

	test('counts a home run as four total bases on top of the runs and RBIs it brought', () => {
		// Jackson Chourio: 1 for 4, the hit a home run, 1 run, 2 RBIs.
		expect(lines.get('4917869')).toEqual({ totalBases: 4, runs: 1, runsBattedIn: 2 });
		expect(computeFantasyPoints('baseball', lines.get('4917869')!)).toBe(7);
	});

	test('reads a starter\'s two and two-thirds innings as eight outs', () => {
		// Robbie Ray: 2.2 IP, 4 H, 2 ER, 2 BB, 1 K.
		expect(lines.get('32175')).toEqual({ outsRecorded: 8, hitsAllowed: 4, earnedRuns: 2, walksAllowed: 2, pitcherStrikeouts: 1 });
		expect(computeFantasyPoints('baseball', lines.get('32175')!)).toBe(-1);
	});

	test('scores a batter who walked and struck out against himself, not to zero', () => {
		// Jake Cronenworth: 0 for 3, 1 walk, 2 strikeouts.
		expect(computeFantasyPoints('baseball', lines.get('36364')!)).toBe(-1);
	});

	test('treats every team with a listed lineup as having its lineup out', () => {
		const { teamsWithLineups } = readFantasyBoxScore(recorded.mlb.summary, mlb);
		expect([...teamsWithLineups].toSorted()).toEqual(['25', '8']);
	});
});
