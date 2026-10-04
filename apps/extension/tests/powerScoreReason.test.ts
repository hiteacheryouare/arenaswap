import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scorerTunables, scoreGame } from 'powerscore';
import type { ReasonFragment } from 'powerscore';
import { boostIds } from '@arenaswap/ui/src/components/scoringModeMeta';
import { boostReasonParts, capitalizeReason, speakReason, translateReason, translateReasonFragments } from '../utils/powerScoreReason';

// Echoes the key and whatever it was handed, so a test can see which string each fragment became
// without depending on any one locale's wording.
const echo = (key: string, subsOrCount?: unknown) => {
	if (key === 'powerScore.reasonJoiner') return ' / ';
	if (subsOrCount === undefined) return key;
	return `${key}(${typeof subsOrCount === 'object' ? Object.values(subsOrCount as object).join(',') : subsOrCount})`;
};

describe('translateReason', () => {
	test('leaves English as the scorer wrote it', () => {
		expect(translateReason('3-point game, PHI on a roll', echo, 'en-GB')).toBe('3-point game, PHI on a roll');
	});

	test('rebuilds every fragment from its own string, in order', () => {
		expect(translateReason('PHI outscoring BOS 10-2, under 2 min left', echo, 'de'))
			.toBe('powerScore.reasonOutscoring(PHI,BOS,10–2) / powerScore.reasonUnderMinutes(2)');
		expect(translateReason('8th inning, 1-run game', echo, 'ja'))
			.toBe('powerScore.reasonInning(8) / powerScore.reasonMarginRuns(1)');
		expect(translateReason("0:45 left, it's tied", echo, 'fr'))
			.toBe('powerScore.reasonClockLeft(0:45) / powerScore.reasonTied');
	});

	// Half a line in German and half in English reads worse than no line.
	test('drops the whole line when one fragment is unknown', () => {
		expect(translateReason('3-point game, something new', echo, 'de')).toBeUndefined();
	});

	test('reads back every boost fragment background.ts writes', () => {
		const parts = boostReasonParts({ favoriteBonus: 10, gameBoost: 15, scoringOpportunityBoost: 3, postseasonBoost: 5 });
		expect(parts).toHaveLength(4);
		expect(translateReason(parts.join(', '), echo, 'es')).toBe([
			'powerScore.reasonFavoriteBoost(10)',
			'powerScore.reasonGameBoost(15)',
			'powerScore.reasonScoringOpportunity(3)',
			'powerScore.reasonPostseasonBoost(5)',
		].join(' / '));
	});

	test('leaves a boost out when it pays nothing', () => {
		expect(boostReasonParts({ favoriteBonus: 0, gameBoost: 4, scoringOpportunityBoost: 0, postseasonBoost: 0 })).toEqual(['game boost (+4)']);
	});

	// If the scorer ever rewords one of its fixed phrases, this is where the translation stops
	// matching, rather than quietly vanishing from every non-English screen.
	test('recognises every fixed phrase the scorer can write', () => {
		const { reasons } = scorerTunables;
		const fixed = [
			reasons.tied,
			reasons.overtime,
			reasons.extraTime,
			reasons.shootout,
			reasons.extraInnings,
			reasons.overtimeAnticipation,
			reasons.drawAnticipation,
			reasons.leadChangeMultiple,
			reasons.leadChangeSingle,
			reasons.fallback,
			`4-${reasons.defaultClosenessUnit} ${reasons.closenessGameSuffix}`,
			...Object.values(reasons.closenessUnitBySportType).map(unit => `2-${unit} ${reasons.closenessGameSuffix}`),
			`7th ${reasons.inningSuffix}`,
			`0:45 ${reasons.clockLeftSuffix}`,
			`${reasons.underPrefix} 3 ${reasons.minutesLeftSuffix}`,
			`88 ${reasons.minutesElapsedSuffix}`,
			`PHI ${reasons.momentumOutscoring} BOS 9-2`,
			`PHI ${reasons.momentumRolling}`,
		];
		for (const phrase of fixed) {
			expect(translateReason(phrase, echo, 'de')).toBeDefined();
		}
	});
});

describe('capitalizeReason', () => {
	test('capitalises the first letter in the reader\'s language', () => {
		expect(capitalizeReason('gleichstand', 'de')).toBe('Gleichstand');
		expect(capitalizeReason('同点', 'ja')).toBe('同点');
	});
});

describe('translateReasonFragments', () => {
	test('rebuilds each keyed reason from its own string, with the parameters it needs', () => {
		const fragments: ReasonFragment[] = [
			{ key: 'outscoring', params: { team: 'PHI', other: 'BOS', scoredFor: 10, scoredAgainst: 2 } },
			{ key: 'underMinutes', params: { minutes: 2 } },
			{ key: 'margin', params: { margin: 1, unit: 'run' } },
			{ key: 'inning', params: { inning: 8 } },
			{ key: 'clockLeft', params: { clock: '0:45' } },
			{ key: 'tied' },
		];
		expect(translateReasonFragments(fragments, echo)).toBe([
			'powerScore.reasonOutscoring(PHI,BOS,10–2)',
			'powerScore.reasonUnderMinutes(2)',
			'powerScore.reasonMarginRuns(1)',
			'powerScore.reasonInning(8)',
			'powerScore.reasonClockLeft(0:45)',
			'powerScore.reasonTied',
		].join(' / '));
	});

	test('reads the Blowouts and Fantasy reasons', () => {
		expect(translateReasonFragments([
			{ key: 'blowoutMargin', params: { margin: 24, unit: 'point' } },
			{ key: 'pilingOn', params: { team: 'OKC' } },
			{ key: 'fantasyPoints', params: { name: 'Mahomes', points: 6.4 } },
			{ key: 'fantasyRostered', params: { count: 2 } },
		], echo)).toBe([
			'powerScore.reasonBlowoutPoints(24)',
			'powerScore.reasonPilingOn(OKC)',
			'powerScore.reasonFantasyPoints(Mahomes,6.4)',
			'powerScore.reasonFantasyRostered(2)',
		].join(' / '));
	});

	test('gives every boost the engine can pay its own string, carrying the points', () => {
		for (const id of boostIds) {
			expect(translateReasonFragments([{ key: id, params: { points: 7 } }], echo)).toMatch(/^powerScore\.reason[A-Z]\w+\(7\)$/);
		}
	});

	test('drops the whole line when one key is unknown, or when there is nothing to say', () => {
		expect(translateReasonFragments([{ key: 'tied' }, { key: 'customModeThing' }], echo)).toBeUndefined();
		expect(translateReasonFragments([], echo)).toBeUndefined();
	});

	// Every key the translator can hand to i18n.t has to exist, or the popup prints the key itself.
	test('asks only for strings the English locale has', () => {
		const en = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8')) as Record<string, Record<string, unknown>>;
		const asked: string[] = [];
		const record = (key: string) => {
			asked.push(key);
			return key;
		};
		const everyKey: ReasonFragment[] = [
			...['tied', 'overtime', 'extraTime', 'shootout', 'extraInnings', 'overtimeLooming', 'levelLate', 'tradingLeads', 'justTookLead', 'fallback', 'earlyRout'].map(key => ({ key })),
			...['onARoll', 'cuttingIn', 'closingGap', 'leadHeld', 'pilingOn'].map(key => ({ key, params: { team: 'X' } })),
			...['fantasyHasBall', 'fantasyRedZone', 'fantasyFieldGoalRange', 'fantasyDefense', 'fantasyAtBat', 'fantasyOnDeck', 'fantasyPitching', 'fantasyInGame'].map(key => ({ key, params: { name: 'X' } })),
			...boostIds.map(key => ({ key, params: { points: 1 } })),
			...['point', 'goal', 'run'].flatMap(unit => [{ key: 'margin', params: { margin: 2, unit } }, { key: 'blowoutMargin', params: { margin: 9, unit } }]),
			{ key: 'inning', params: { inning: 7 } },
			{ key: 'clockLeft', params: { clock: '1:00' } },
			{ key: 'minutesIn', params: { minutes: 88 } },
			{ key: 'underMinutes', params: { minutes: 3 } },
			{ key: 'outscoring', params: { team: 'A', other: 'B', scoredFor: 9, scoredAgainst: 2 } },
			{ key: 'fantasyPoints', params: { name: 'X', points: 3 } },
			{ key: 'fantasyRostered', params: { count: 1 } },
		];
		expect(translateReasonFragments(everyKey, record)).toBeDefined();
		for (const key of asked) {
			const [section, name] = key.split('.');
			expect(en[section!]?.[name!]).toBeDefined();
		}
	});

	// The engine's own English is the source of truth for which keys exist, so every key a real
	// score writes has to come back translated.
	test('translates every reason a real score writes', () => {
		const score = scoreGame(
			{ id: 'g', league: 'nba', sportType: 'basketball', homeTeam: { score: 98, abbreviation: 'BOS' }, awayTeam: { score: 97, abbreviation: 'NYK' }, period: 4, clockSeconds: 40, status: 'in' },
			{},
			{ favoriteTeamCount: 1, favoriteBoostPoints: 10, gameBoost: 5, postseasonBoostPoints: 6 },
		);
		expect(score.reasons.length).toBeGreaterThan(1);
		expect(translateReasonFragments(score.reasons, echo)).toBeDefined();
	});
});

describe('speakReason', () => {
	const fragments: ReasonFragment[] = [{ key: 'tied' }, { key: 'goAheadRun', params: { points: 8 } }];

	test('reads English as the scorer wrote it', () => {
		expect(speakReason({ reason: "it's tied, go-ahead run on base (+8)", breakdown: { reasons: fragments } }, echo, 'en-US'))
			.toBe("it's tied, go-ahead run on base (+8)");
	});

	test('translates a live score by its keys, and a history snapshot by its own', () => {
		const expected = 'powerScore.reasonTied / powerScore.reasonGoAheadRun(8)';
		expect(speakReason({ reason: 'whatever', breakdown: { reasons: fragments } }, echo, 'de')).toBe(expected);
		expect(speakReason({ reason: 'whatever', reasons: fragments }, echo, 'de')).toBe(expected);
	});

	test('falls back to reading the English back when a score has no keys', () => {
		expect(speakReason({ reason: '8th inning, 1-run game' }, echo, 'ja')).toBe('powerScore.reasonInning(8) / powerScore.reasonMarginRuns(1)');
	});
});
