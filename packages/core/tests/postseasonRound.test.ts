import {
	gradePostseason,
	postseasonBoostShare,
	reduceEventName,
	resolveRoundFromHeadline,
	resolveRoundFromSlug,
} from '../src/postseasonRound';
import type { LeagueId } from '../src/types';
import corpus from './fixtures/espnPostseasonHeadlines.json';

interface CorpusRow {
	league: string;
	seasonType: number | null;
	seasonSlug: string | null;
	noteType: string | null;
	headline: string | null;
}

const rows = corpus as CorpusRow[];
const notes = (row: CorpusRow) => (row.headline ? [{ type: row.noteType ?? undefined, headline: row.headline }] : undefined);
const grade = (row: CorpusRow) => gradePostseason({
	league: row.league as LeagueId,
	seasonType: row.seasonType ?? undefined,
	seasonSlug: row.seasonSlug ?? undefined,
	notes: notes(row),
});

// The soccer family's notes are aggregate and penalty results rather than round names, so a
// corpus row whose headline is one of those is not a round string and is excluded from the
// label assertions below.
const resultNotePattern = /\b(advances?|win|wins|leads series|series tied|on aggregate|on penalties|on away goals|1st leg|2nd leg)\b/i;
const roundHeadlines = rows.filter(r => r.headline && !resultNotePattern.test(r.headline));

describe('reduceEventName', () => {
	test('never truncates: every word it prints is a whole word ESPN sent', () => {
		const offenders: string[] = [];
		for (const row of roundHeadlines) {
			const label = reduceEventName(row.headline!);
			if (!label) continue;
			if (/[.]{3}|…/.test(label)) {
				offenders.push(`ellipsis in ${JSON.stringify(label)}`);
				continue;
			}
			const sourceWords = new Set(row.headline!.toLowerCase().split(/[\s–-]+/).filter(Boolean));
			for (const word of label.toLowerCase().split(/[\s–-]+/)) {
				if (word && word !== '·' && !sourceWords.has(word)) {
					offenders.push(`${JSON.stringify(word)} not a whole word of ${JSON.stringify(row.headline)}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	test('never produces a label longer than the headline it came from', () => {
		for (const row of roundHeadlines) {
			const label = reduceEventName(row.headline!);
			if (label) expect(label.length).toBeLessThanOrEqual(row.headline!.length);
		}
	});

	// Two different games must never present as the same thing. This is the assertion that caught
	// WBIT and the Women's NIT collapsing onto a shared label while scoring +2 and 0.
	test('two distinct headlines in one league never reduce to the same label', () => {
		const byLeague = new Map<string, Map<string, string[]>>();
		for (const row of roundHeadlines) {
			const label = reduceEventName(row.headline!);
			if (!label) continue;
			const forLeague = byLeague.get(row.league) ?? new Map<string, string[]>();
			forLeague.set(label, [...(forLeague.get(label) ?? []), row.headline!]);
			byLeague.set(row.league, forLeague);
		}

		const collisions: string[] = [];
		for (const [league, labels] of byLeague) {
			for (const [label, sources] of labels) {
				// ESPN ships one game description twice with a stray double space. Two spellings of
				// one game reducing to one label is the correct answer, not a collision.
				const distinct = new Set(sources.map(s => s.replace(/\s+/g, ' ')));
				if (distinct.size > 1) collisions.push(`${league} ${JSON.stringify(label)} <- ${JSON.stringify([...distinct])}`);
			}
		}
		expect(collisions).toEqual([]);
	});

	test.each([
		["Bush's Boca Raton Bowl", "Bush's Boca Raton Bowl"],
		['Cheez-It Citrus Bowl', 'Cheez-It Citrus Bowl'],
		['Snoop Dogg Arizona Bowl', 'Snoop Dogg Arizona Bowl'],
		['Radiance Technologies Independence Bowl', 'Radiance Technologies Independence Bowl'],
		['College Football Playoff National Championship Presented by AT&T', 'National Championship Presented by AT&T'],
		['College Football Playoff Quarterfinal at the Rose Bowl Presented by Prudential', 'Quarterfinal · Rose Bowl Presented by Prudential'],
		['College Football Playoff Quarterfinal at the Goodyear Cotton Bowl Classic', 'Quarterfinal · Goodyear Cotton Bowl Classic'],
	])('keeps the sponsor in %s', (headline, expected) => {
		expect(reduceEventName(headline)).toBe(expected);
	});

	test.each([
		["NCAA Men's Basketball Championship - East Region - Sweet 16", 'East Region · Sweet 16'],
		["NCAA Women's Basketball Championship - Regional 4 in Sacramento - 2nd Round", 'Regional 4 in Sacramento · 2nd Round'],
		['West 1st Round - Game 7', 'West 1st Round · Game 7'],
		['World Series - Game 7', 'World Series · Game 7'],
		["2024 Olympic Men's Basketball - Semifinal", 'Semifinal'],
		["Milano Cortina 2026 Men's Hockey - Gold Medal Game", 'Gold Medal Game'],
		['UFL Semifinals', 'Semifinals'],
		['WNBA Finals - Game 3', 'Finals · Game 3'],
		['2023 World Baseball Classic Championship', 'Championship'],
	])('strips only the prefix that repeats the league: %s', (headline, expected) => {
		expect(reduceEventName(headline)).toBe(expected);
	});

	// The four tournaments deliberately kept, because the prefix is the distinguishing fact.
	test.each([
		['NIT - Championship', 'NIT · Championship'],
		['NIT - Semifinal', 'NIT · Semifinal'],
		['WBIT - Quarterfinal', 'WBIT · Quarterfinal'],
		['WBIT Championship Game', 'WBIT Championship Game'],
		["Women's NIT - Championship", "Women's NIT · Championship"],
		['College Basketball Crown - Semifinals', 'College Basketball Crown · Semifinals'],
	])('keeps the tournament name on a secondary tournament: %s', (headline, expected) => {
		expect(reduceEventName(headline)).toBe(expected);
	});

	// The dash used to be mandatory, which left this one string unstripped while its own regional
	// games reduced normally — one tournament printing labels two different ways.
	test.each([
		["NCAA Men's Hockey National Championship", 'National Championship'],
		["NCAA Men's Hockey Championship - Frozen Four", 'Frozen Four'],
		["NCAA Men's Hockey Championship - Albany Regional Final", 'Albany Regional Final'],
	])('reduces hockey consistently with and without the dash: %s', (headline, expected) => {
		expect(reduceEventName(headline)).toBe(expected);
	});

	test('drops a scheduling note rather than printing it as a round', () => {
		expect(reduceEventName('NCAA Baseball Championship - Atlanta Regional Rescheduled from 5/29')).toBeUndefined();
	});

	test('drops a headline that is nothing but the tournament name', () => {
		expect(reduceEventName("NCAA Women's Ice Hockey Championship")).toBeUndefined();
	});

	test.each([undefined, '', '   '])('returns undefined for %p', value => {
		expect(reduceEventName(value)).toBeUndefined();
	});
});

describe('resolveRoundFromHeadline', () => {
	test.each<[string, number]>([
		['Super Bowl LX', 0],
		['NBA Finals - Game 7', 0],
		['WNBA FINALS - Game 3', 0],
		['Stanley Cup Final - Game 6', 0],
		['World Series - Game 7', 0],
		['United Bowl', 0],
		['Gold Medal Game', 0],
		['National Championship', 0],
		['AFC Championship', 1],
		['East Final - Game 5', 1],
		['West Semifinals - Game 1', 1],
		['ALCS - Game 3', 1],
		['Final Four', 1],
		['Frozen Four', 1],
		['Bronze Medal Game', 1],
		['Semifinal', 1],
		['AFC Divisional Playoffs', 2],
		['NLDS - Game 4', 2],
		['Elite 8', 2],
		['Quarterfinal', 2],
		['East 2nd Round - Game 3', 2],
		['Albany Regional Final', 2],
		['AFC Wild Card Playoffs', 3],
		['ALWC - Game 2', 3],
		['Sweet 16', 3],
		['First Four', 3],
		['East 1st Round - Game 1', 3],
		['Albany Regional Semifinal', 3],
		['Athens Regional', 3],
	])('grades %s as distance %i', (headline, expected) => {
		expect(resolveRoundFromHeadline(headline)).toBe(expected);
	});

	// A conference name containing "East" or "West" must not read as a conference round. This is
	// the trap that graded "Big East Tournament - Final" as a conference final.
	test.each([
		'Big East Tournament - Final',
		'West Coast Conference Tournament - Final',
		'MVC Tournament - Final',
	])('grades %s as a final rather than a conference final', headline => {
		expect(resolveRoundFromHeadline(headline)).toBe(0);
	});

	test('does not mistake a series game number for a round', () => {
		expect(resolveRoundFromHeadline('East Final - Game 3')).toBe(resolveRoundFromHeadline('East Final'));
	});

	test('returns undefined for a headline with no round in it', () => {
		expect(resolveRoundFromHeadline("Bush's Boca Raton Bowl")).toBeUndefined();
		expect(resolveRoundFromHeadline('Pro Bowl Games')).toBeUndefined();
	});
});

describe('resolveRoundFromSlug', () => {
	test.each<[string, number]>([
		['final', 0],
		['mls-cup', 0],
		['gold-medal-match', 0],
		['clausura---finals', 0],
		['playoffs---championship', 0],
		['semifinals', 1],
		['semi-finals', 1],
		['3rd-place-match', 1],
		['bronze-medal-match', 1],
		['quarterfinals', 2],
		['round-of-16', 2],
		['round-of-32', 3],
		['knockout-round-playoffs', 3],
		['western-conference-playoffs---round-one', 3],
		['eastern-conference-playoffs---wild-card', 3],
		// MLS brackets per conference, so its conference final is one win from MLS Cup rather
		// than being it. A bare finals rule graded this as the title match.
		['western-conference-playoffs---final', 1],
		['eastern-conference-playoffs---semifinals', 2],
	])('grades slug %s as distance %i', (slug, expected) => {
		expect(resolveRoundFromSlug(slug)).toBe(expected);
	});

	test('MLS Cup outranks the conference final that feeds it', () => {
		expect(resolveRoundFromSlug('mls-cup')).toBeLessThan(resolveRoundFromSlug('western-conference-playoffs---final')!);
	});

	test('the 2026 World Cup round of 32 is graded rather than missed', () => {
		expect(resolveRoundFromSlug('round-of-32')).toBe(3);
	});

	test.each(['regular-season', 'group-stage', '2025-26-english-premier-league', undefined, ''])(
		'returns undefined for %p', slug => {
			expect(resolveRoundFromSlug(slug)).toBeUndefined();
		});
});

const g = (league: string, headline?: string, seasonType?: number, seasonSlug?: string) =>
	gradePostseason({
		league: league as LeagueId,
		seasonType,
		seasonSlug,
		notes: headline ? [{ type: 'event', headline }] : undefined,
	});

describe('gradePostseason', () => {
	test('the Pro Bowl keeps its name and scores nothing', () => {
		expect(g('nfl', 'Pro Bowl Games', 3)).toEqual({ label: 'Pro Bowl Games' });
	});

	test('a non-playoff bowl keeps its sponsor and scores nothing', () => {
		expect(g('ncaaf', "Bush's Boca Raton Bowl", 3)).toEqual({ label: "Bush's Boca Raton Bowl" });
		expect(g('ncaaf', 'Cheez-It Citrus Bowl', 3).round).toBeUndefined();
	});

	test.each<[string, number]>([
		['College Football Playoff First Round Game', 3],
		['College Football Playoff Quarterfinal at the Allstate Sugar Bowl', 2],
		['College Football Playoff Semifinal at the Chick-fil-A Peach Bowl', 1],
		['College Football Playoff National Championship Presented by AT&T', 0],
	])('a CFP game is graded: %s', (headline, expected) => {
		expect(g('ncaaf', headline, 3).round).toBe(expected);
	});

	test('a side trophy final takes the bottom rung and its earlier rounds nothing', () => {
		expect(g('ncaab', 'NIT - Championship', 3).round).toBe(3);
		expect(g('ncaab', 'College Basketball Crown Championship Game', 3).round).toBe(3);
		expect(g('ncaaw', 'WBIT Championship Game', 3).round).toBe(3);
		expect(g('ncaab', 'NIT - Semifinal', 3).round).toBeUndefined();
		expect(g('ncaab', 'NIT - 1st Round', 3).round).toBeUndefined();
		expect(g('ncaaw', 'WBIT - Quarterfinal', 3).round).toBeUndefined();
	});

	test('the Women\'s NIT scores nothing, including its final', () => {
		expect(g('ncaaw', "Women's NIT - Championship", 3).round).toBeUndefined();
		expect(g('ncaaw', "Women's NIT - Semifinal", 3).round).toBeUndefined();
	});

	test('the NCAA tournament outscores the secondary tournament beside it', () => {
		const ncaa = g('ncaab', "NCAA Men's Basketball Championship - National Championship", 3).round;
		const nit = g('ncaab', 'NIT - Championship', 3).round;
		expect(postseasonBoostShare(ncaa)).toBeGreaterThan(postseasonBoostShare(nit));
	});

	test.each<[number, number]>([[3, 3], [4, 2], [5, 1], [6, 0]])(
		'college baseball season type %i grades as distance %i', (seasonType, expected) => {
			expect(g('cbase', "Men's College World Series - Double Elimination Round", seasonType).round).toBe(expected);
			expect(g('csoft', "Women's College World Series - Double Elimination Round", seasonType).round).toBe(expected);
		});

	test('the College World Series championship series outranks its opening games', () => {
		const opener = g('cbase', "Men's College World Series - Double Elimination Round", 5).round;
		const final = g('cbase', "Men's College World Series Championship Final - Game 1", 6).round;
		expect(postseasonBoostShare(final)).toBeGreaterThan(postseasonBoostShare(opener));
	});

	test('a soccer round comes from the slug, not from an aggregate result note', () => {
		expect(g('ucl', '2nd Leg - Arsenal advance 2-1 on aggregate', undefined, 'semifinals').round).toBe(1);
		expect(g('fifawc', 'Egypt advance 4-2 on penalties', undefined, 'round-of-32').round).toBe(3);
	});

	// The fallback that matters in a year's time: ESPN renames a round and we neither lose the
	// feature nor silently promote the game to a final.
	test('an unrecognized postseason round falls back to the bottom rung', () => {
		const graded = g('nba', 'Some Round Nobody Has Seen', 3);
		expect(graded.round).toBe(3);
		expect(graded.label).toBe('Some Round Nobody Has Seen');
	});

	test('a postseason game with no note at all still scores the bottom rung', () => {
		const graded = g('nba', undefined, 3);
		expect(graded.round).toBe(3);
		expect(graded.label).toBeUndefined();
	});

	test('grading never throws on a malformed payload', () => {
		const bad: unknown[] = [
			{ league: 'nba', notes: undefined },
			{ league: 'nba', notes: [] },
			{ league: 'nba', notes: [{}] },
			{ league: 'nba', notes: [{ headline: '' }] },
			{ league: 'nba', notes: [{ type: 'event' }] },
			{ league: 'ncaaf', seasonType: Number.NaN },
			{ league: 'cbase', seasonType: 99 },
			{ league: 'nba', notes: [{ headline: '🏆'.repeat(400) }] },
		];
		for (const input of bad) {
			expect(() => gradePostseason(input as Parameters<typeof gradePostseason>[0])).not.toThrow();
		}
	});

	test('prefers a typed event note over an untyped one', () => {
		const graded = gradePostseason({
			league: 'nba' as LeagueId,
			seasonType: 3,
			notes: [{ headline: 'MIN leads series 1-0' }, { type: 'event', headline: 'NBA Finals - Game 7' }],
		});
		expect(graded.round).toBe(0);
		expect(graded.label).toBe('NBA Finals · Game 7');
	});
});

describe('postseasonBoostShare', () => {
	test('is an even ladder of quarters', () => {
		expect(postseasonBoostShare(0)).toBe(1);
		expect(postseasonBoostShare(1)).toBe(0.75);
		expect(postseasonBoostShare(2)).toBe(0.5);
		expect(postseasonBoostShare(3)).toBe(0.25);
	});

	test('pays nothing for a game with no round', () => {
		expect(postseasonBoostShare(undefined)).toBe(0);
	});

	// Strictly increasing, not merely non-decreasing. A flat ladder satisfies "sorted" and is
	// exactly the regression this test exists to catch — every rung has to be worth more than the
	// one below it or the whole feature is the flat boost it replaced.
	test('is strictly increasing: each rung outscores the one below it', () => {
		const shares = [3, 2, 1, 0].map(r => postseasonBoostShare(r as 0 | 1 | 2 | 3));
		for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1]!);
	});
});

describe('the real ESPN corpus', () => {
	test('covers every tracked league that has a postseason', () => {
		expect(new Set(rows.map(r => r.league)).size).toBeGreaterThanOrEqual(26);
		expect(rows.length).toBeGreaterThan(700);
	});

	test('every postseason game in the corpus either grades or deliberately scores nothing', () => {
		for (const row of roundHeadlines) {
			const graded = grade(row);
			if (graded.round !== undefined) expect([0, 1, 2, 3]).toContain(graded.round);
		}
	});

	// A championship-path final is the top of the ladder wherever it appears. If a rename ever
	// pushes one of these down a rung, this is the test that says so.
	test.each([
		['nfl', 'Super Bowl LX'],
		['mlb', 'World Series - Game 7'],
		['nhl', 'Stanley Cup Final - Game 6'],
		['nba', 'NBA Finals - Game 5'],
		['wnba', 'WNBA Finals - Game 4'],
		['ufl', 'United Bowl'],
		['ncaab', "NCAA Men's Basketball Championship - National Championship"],
		['ncaaw', "NCAA Women's Basketball Championship - National Championship"],
		['ncaamh', "NCAA Men's Hockey National Championship"],
		['olymih', "Milano Cortina 2026 Men's Hockey - Gold Medal Game"],
		['wbbc', '2023 World Baseball Classic Championship'],
	])('%s: %s is graded as the final', (league, headline) => {
		const found = rows.find(r => r.league === league && r.headline === headline);
		expect(found).toBeDefined();
		expect(grade(found!).round).toBe(0);
	});
});
