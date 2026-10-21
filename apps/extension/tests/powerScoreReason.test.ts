import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderReasonEnglish, scoreGame } from 'powerscore';
import type { Game, ReasonFragment, ScoringContext } from 'powerscore';
import { capitalizeReason, speakReason, translateReasonFragments } from '../utils/powerScoreReason';

// Echoes the key and whatever it was handed, so a test can see which string each sentence became
// without depending on any one locale's wording.
const echo = (key: string, subsOrCount?: unknown) => {
	if (key === 'powerScore.reasonSentenceJoiner') return ' / ';
	if (subsOrCount === undefined) return key;
	if (typeof subsOrCount !== 'object') return `${key}(${subsOrCount})`;
	return `${key}(${Object.entries(subsOrCount as object).filter(([, value]) => value !== undefined).map(([name, value]) => `${name}=${value}`).join(',')})`;
};

const en = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8')) as Record<string, Record<string, unknown>>;

// The English locale read the way the extension's i18n reads it: plurals pick "1" or "n" and take
// the count as $1, named substitutions fill {braces}.
const english = (key: string, subsOrCount?: unknown, subs?: unknown) => {
	const [section, name] = key.split('.');
	const entry = en[section!]?.[name!];
	if (entry === undefined) throw new Error(`en.json has no ${key}`);
	const count = typeof subsOrCount === 'number' ? subsOrCount : undefined;
	const named = (typeof subsOrCount === 'object' ? subsOrCount : subs) as Record<string, unknown> | undefined;
	const message = typeof entry === 'string' ? entry : (entry as Record<string, string>)[count === 1 ? '1' : 'n']!.replace('$1', String(count));
	return message.replace(/\{(\w+)\}/g, (match, sub: string) => (named?.[sub] === undefined ? match : String(named[sub])));
};

// One of every sentence the built-in modes can write, with parameters a real score would carry.
const everySentence: ReasonFragment[] = [
	{ key: 'state', params: { score: 'tied', when: 'clock', clock: '1:04' } },
	{ key: 'state', params: { score: 'lead', team: 'Celtics', margin: 3, when: 'quarter', period: 2 } },
	{ key: 'state', params: { score: 'up', team: 'Celtics', margin: 3, when: 'half', period: 1 } },
	{ key: 'state', params: { score: 'lead', team: 'Bruins', margin: 1, when: 'period', period: 3 } },
	{ key: 'state', params: { score: 'tied', when: 'overtime' } },
	{ key: 'state', params: { score: 'tied', when: 'overtimeClock', clock: '2:10' } },
	{ key: 'state', params: { score: 'tied', when: 'overtimeNumbered', period: 2 } },
	{ key: 'state', params: { score: 'lead', team: 'Portland', margin: 1, unit: 'goal', when: 'minute', period: 88 } },
	{ key: 'state', params: { score: 'up', team: 'Bruins', margin: 2, unit: 'goal', when: 'period', period: 2 } },
	{ key: 'state', params: { score: 'tied', when: 'extraTime' } },
	{ key: 'state', params: { score: 'lead', team: 'Padres', margin: 1, when: 'top', period: 9 } },
	{ key: 'state', params: { score: 'lead', team: 'Padres', margin: 1, when: 'bottom', period: 11 } },
	{ key: 'state', params: { score: 'tied', when: 'inning', period: 7 } },
	{ key: 'state', params: { score: 'tied' } },
	{ key: 'shootout' },
	{ key: 'penaltyShootout' },
	{ key: 'redZone', params: { team: 'Chiefs' } },
	{ key: 'redZoneThirdAndShort', params: { team: 'Chiefs' } },
	{ key: 'redZoneFourthDown', params: { team: 'Chiefs' } },
	{ key: 'driveTrailing', params: { team: 'Bills', trailBy: 3, yards: 41, clock: '1:35' } },
	{ key: 'driveTied', params: { team: 'Bills', trailBy: 0, yards: 41, clock: '1:35' } },
	{ key: 'emptyNet', params: { team: 'Maple Leafs', margin: 1, clock: '1:20' } },
	{ key: 'powerPlay' },
	{ key: 'powerPlayTeam', params: { team: 'Bruins', margin: 1 } },
	{ key: 'goAheadRun', params: { team: 'Rays' } },
	{ key: 'tyingRun', params: { team: 'Brewers' } },
	{ key: 'winningRun', params: { team: 'Brewers' } },
	...['runnerSecond', 'runnerThird', 'runnersFirstSecond', 'runnersFirstThird', 'runnersSecondThird', 'basesLoaded'].map(key => ({ key })),
	{ key: 'noHitter', params: { team: 'Yankees', innings: 6 } },
	{ key: 'doubleNoHitter', params: { innings: 5 } },
	{ key: 'redCard', params: { team: 'Portland', players: 10, minute: 21 } },
	...['fantasyHasBall', 'fantasyRedZone', 'fantasyFieldGoalRange', 'fantasyDefense', 'fantasyAtBat', 'fantasyOnDeck', 'fantasyPitching', 'fantasyInGame'].map(key => ({ key, params: { name: 'Mahomes' } })),
	{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } },
	{ key: 'runToLead', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } },
	{ key: 'scoredStraight', params: { team: 'Sabres', count: 2 } },
	{ key: 'scoredStraightToLead', params: { team: 'Sabres', count: 2 } },
	{ key: 'outscoring', params: { team: 'Lakers', other: 'Celtics', scoredFor: 10, scoredAgainst: 6, minutes: 5 } },
	{ key: 'outscoring', params: { team: 'Lakers', other: 'Celtics', scoredFor: 10, scoredAgainst: 6, minutes: 1 } },
	{ key: 'leadChanges', params: { count: 4, minutes: 5 } },
	{ key: 'tookLead', params: { team: 'Bobcats' } },
	{ key: 'tiedIt', params: { team: 'Sharks', when: 'clock', clock: '6:11' } },
	{ key: 'tiedIt', params: { team: 'Sharks' } },
	{ key: 'cameBack', params: { team: 'Hornets', from: 6, when: 'quarter', period: 1 } },
	{ key: 'cameBackToLead', params: { team: 'Warriors', from: 4 } },
	{ key: 'cutDeficit', params: { team: 'Rockets', from: 7, to: 5 } },
	{ key: 'fantasyPoints', params: { name: 'Kelce', points: 8.5, minutes: 16 } },
	{ key: 'seriesClinch', params: { team: 'White Sox' } },
	{ key: 'seriesDecider', params: { game: 5 } },
	{ key: 'raceClinch', params: { team: 'Chiefs' } },
	{ key: 'raceElimination', params: { team: 'Chiefs' } },
	{ key: 'upset', params: { team: 'Aztecs', chance: 25 } },
	{ key: 'fantasyRostered', params: { count: 1 } },
	{ key: 'fantasyRostered', params: { count: 2 } },
];

const team = (nickname: string, score: number) => ({ abbreviation: nickname.slice(0, 3).toUpperCase(), nickname, score });
const at = (minutesAgo: number, awayScore: number, homeScore: number) => ({ gameId: 'g', timestamp: 1_790_000_000_000 - minutesAgo * 60_000, awayScore, homeScore });
const placeholders = (value: unknown): string[] => JSON.stringify(value).match(/\{\w+\}/g)?.toSorted() ?? [];

describe('translateReasonFragments', () => {
	test('builds the score sentence from the score and the time, joined by the locale\'s own pattern', () => {
		expect(translateReasonFragments([{ key: 'state', params: { score: 'lead', team: 'Celtics', margin: 3, when: 'quarter', period: 2 } }], echo, 'de'))
			.toBe('powerScore.reasonJoinWhen(sentence=powerScore.reasonScoreLead(score=lead,team=Celtics,margin=3,when=quarter,period=2),when=powerScore.reasonWhenQuarter(clock=,ordinal=2))');
	});

	test('a score with no time to give is just the score', () => {
		expect(translateReasonFragments([{ key: 'state', params: { score: 'tied' } }], echo, 'ja')).toBe('powerScore.reasonScoreTied(score=tied)');
	});

	test('quotes a window in minutes through the locale\'s own plural', () => {
		expect(translateReasonFragments([{ key: 'leadChanges', params: { count: 4, minutes: 5 } }], echo, 'fr'))
			.toBe('powerScore.reasonLeadChangesRecent(count=4,window=powerScore.reasonLastMinutes(5))');
	});

	test('joins sentences with the locale\'s sentence joiner', () => {
		expect(translateReasonFragments([{ key: 'powerPlay' }, { key: 'state', params: { score: 'tied' } }], echo, 'ko'))
			.toBe('powerScore.reasonPowerPlay() / powerScore.reasonScoreTied(score=tied)');
	});

	test('drops the whole line when one key is unknown, or when there is nothing to say', () => {
		expect(translateReasonFragments([{ key: 'powerPlay' }, { key: 'customModeThing' }], echo, 'de')).toBeUndefined();
		expect(translateReasonFragments([{ key: 'state', params: { score: 'tied', when: 'quarterOfAnHour' } }], echo, 'de')).toBeUndefined();
		expect(translateReasonFragments([], echo, 'de')).toBeUndefined();
	});

	// The extension speaks English straight from the engine, so en.json is only ever the source the
	// other locales translate from. It has to say exactly what the engine says, or they translate
	// something the English user never sees.
	test('the English locale says exactly what the engine says, sentence by sentence', () => {
		for (const fragment of everySentence) {
			expect(translateReasonFragments([fragment], english, 'en')).toBe(renderReasonEnglish(fragment));
		}
	});

	test('translates every sentence a real score writes', () => {
		const games: [Game, ScoringContext][] = [
			[{ id: 'a', league: 'nba', sportType: 'basketball', status: 'in', awayTeam: team('Lakers', 102), homeTeam: team('Celtics', 95), period: 4, clockSeconds: 130 }, { history: [at(2, 90, 93), at(1, 96, 95), at(0, 102, 95)] }],
			[{ id: 'b', league: 'nhl', sportType: 'hockey', status: 'in', awayTeam: team('Maple Leafs', 1), homeTeam: team('Bruins', 2), period: 3, clockSeconds: 80 }, { emptyNet: 'away' }],
			[{ id: 'c', league: 'mlb', sportType: 'baseball', status: 'in', awayTeam: team('Padres', 3), homeTeam: team('Brewers', 2), period: 9, topOfInning: false, outs: 1, baseRunners: { first: false, second: true, third: false } }, {}],
			[{ id: 'd', league: 'mls', sportType: 'soccer', status: 'in', awayTeam: team('Portland', 1), homeTeam: team('Seattle', 1), period: 2, clockSeconds: 5_300 }, { history: [at(2, 0, 1), at(1, 0, 1), at(0, 1, 1)] }],
		];
		for (const [game, context] of games) {
			const score = scoreGame(game, context);
			expect(score.reasons.length).toBeGreaterThan(0);
			expect(translateReasonFragments(score.reasons, echo, 'de')).toBeDefined();
		}
	});
});

// A locale missing a reason string prints the key itself, and a placeholder English doesn't fill
// prints as braces.
describe('every locale', () => {
	const reasonKeys = Object.keys(en.powerScore!).filter(key => key.startsWith('reason'));
	const localeFiles = ['de', 'es', 'fil', 'fr', 'it', 'ja', 'ko', 'pt_BR', 'pt_PT', 'zh_CN', 'zh_TW'];

	test.each(localeFiles)('%s carries every reason string, with only the placeholders English fills', locale => {
		const strings = JSON.parse(readFileSync(join(__dirname, `../locales/${locale}.json`), 'utf8')) as Record<string, Record<string, unknown>>;
		for (const key of reasonKeys) {
			const value = strings.powerScore?.[key];
			expect([key, value === undefined]).toEqual([key, false]);
			for (const placeholder of placeholders(value)) expect([key, placeholders(en.powerScore![key])]).toEqual([key, expect.arrayContaining([placeholder])]);
		}
		expect(Object.keys(strings.powerScore!).filter(key => key.startsWith('reason') && !reasonKeys.includes(key))).toEqual([]);
		expect(strings.fantasy?.statJoiner).toBeDefined();
	});
});

describe('speakReason', () => {
	const fragments: ReasonFragment[] = [{ key: 'goAheadRun', params: { team: 'Rays' } }, { key: 'state', params: { score: 'tied' } }];

	test('reads English as the engine wrote it', () => {
		expect(speakReason({ reason: 'Rays have the go-ahead run on base. Tied', breakdown: { reasons: fragments } }, echo, 'en-US'))
			.toBe('Rays have the go-ahead run on base. Tied');
	});

	test('translates a live score by its keys, and a history snapshot by its own', () => {
		const expected = 'powerScore.reasonGoAheadRunOnBase(team=Rays) / powerScore.reasonScoreTied(score=tied)';
		expect(speakReason({ reason: 'whatever', breakdown: { reasons: fragments } }, echo, 'de')).toBe(expected);
		expect(speakReason({ reason: 'whatever', reasons: fragments }, echo, 'de')).toBe(expected);
	});

	test('says nothing in another language when a score carries no keys', () => {
		expect(speakReason({ reason: 'Tied in the 9th' }, echo, 'ja')).toBeUndefined();
	});
});

describe('capitalizeReason', () => {
	test('capitalizes by the locale\'s own rules', () => {
		expect(capitalizeReason('istanbul', 'tr')).toBe('İstanbul');
	});
});
