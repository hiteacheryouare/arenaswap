import { scorerTunables } from 'powerscore';
import { boostReasonParts, capitalizeReason, translateReason } from '../utils/powerScoreReason';

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
