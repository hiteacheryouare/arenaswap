import { computeFantasyPoints, defaultFantasyScoring, fantasySportOf, resolveFantasyScoring } from '../src/fantasyScoring';

describe('a defense scored by the points it has allowed', () => {
	// Each tier's lower and upper edge, as a box score reports the opponent's score.
	test.each([
		[0, 10], [2, 7], [6, 7], [7, 4], [13, 4], [14, 1], [20, 1], [21, 0], [27, 0], [28, -1], [34, -1], [35, -4], [56, -4],
	])('%i allowed is worth %i', (allowed, points) => {
		expect(computeFantasyPoints('football', { pointsAllowed: allowed })).toBe(points);
	});

	test('adds its sacks and takeaways on top of the tier', () => {
		// Washington's defense in London: two sacks, two takeaways, thirty points allowed.
		expect(computeFantasyPoints('football', { sacks: 2, takeaways: 2, pointsAllowed: 30 })).toBe(5);
	});
});

describe('the rules a user typed into Settings', () => {
	test('are held to each rule\'s bounds, so a typo cannot make one touchdown worth a hundred', () => {
		const rules = resolveFantasyScoring('football', { passingTouchdowns: 100, interceptionsThrown: 3, receptions: -1 });
		expect(rules.passingTouchdowns).toBe(defaultFantasyScoring.football.passingTouchdowns!.max);
		expect(rules.interceptionsThrown).toBe(0);
		expect(rules.receptions).toBe(0);
	});

	test('fall back to the default when the stored value is not a usable number', () => {
		const rules = resolveFantasyScoring('basketball', { points: Number.NaN, rebounds: Number.POSITIVE_INFINITY, assists: '2' as unknown as number });
		expect(rules.points).toBe(1);
		expect(rules.rebounds).toBe(1.2);
		expect(rules.assists).toBe(1.5);
	});

	test('ignore a rule the sport does not have', () => {
		expect(resolveFantasyScoring('hockey', { touchdowns: 6 })).not.toHaveProperty('touchdowns');
		expect(computeFantasyPoints('hockey', { goals: 1, touchdowns: 3 }, { touchdowns: 6 })).toBe(3);
	});

	test('reprice a stat line the moment they change', () => {
		const line = { points: 30, rebounds: 10, assists: 8, steals: 2, blocks: 1, turnovers: 4 };
		expect(computeFantasyPoints('basketball', line)).toBe(59);
		expect(computeFantasyPoints('basketball', line, { points: 2, turnovers: -4 })).toBe(77);
	});
});

describe('a stat line straight off the box score', () => {
	test('lands on cents, not on float noise, for a big passing day', () => {
		expect(computeFantasyPoints('football', { passingYards: 337, passingTouchdowns: 3, interceptionsThrown: 1 })).toBe(23.48);
	});

	test('skips a stat that did not parse instead of poisoning the total', () => {
		expect(computeFantasyPoints('football', { rushingYards: Number.NaN, rushingTouchdowns: 1 })).toBe(6);
	});

	test('scores softball by the baseball rules and soccer not at all', () => {
		expect(fantasySportOf('softball')).toBe('baseball');
		expect(fantasySportOf('baseball')).toBe('baseball');
		expect(fantasySportOf('soccer')).toBeUndefined();
	});
});
