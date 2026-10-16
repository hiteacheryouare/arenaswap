import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreGame } from 'powerscore';
import type { Game, ScoringContext } from 'powerscore';
import { normalizeScores, scoreLiveGame, toLiveScore } from '@arenaswap/core';
import { createLiveExtras } from '@arenaswap/sideline';
import type { Game as LiveGame } from '@arenaswap/core/types';
import { boostDetailKeys, boostReason } from '../utils/boostReason';

const localesDir = join(__dirname, '../locales');
const readLocale = (file: string) => JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as Record<string, Record<string, string>>;
const en = readLocale('en.json');

const english = (key: string, subs: Record<string, string | number> = {}): string => {
	const [section, name] = key.split('.');
	const message = en[section!]?.[name!];
	if (message === undefined) throw new Error(`missing ${key}`);
	return message.replace(/\{(\w+)\}/g, (_, sub: string) => String(subs[sub]));
};

const chwSeries: Game<string> = {
	id: 'cle-chw',
	league: 'mlb',
	sportType: 'baseball',
	homeTeam: { abbreviation: 'CHW', score: 1 },
	awayTeam: { abbreviation: 'CLE', score: 4 },
	period: 4,
	topOfInning: true,
	outs: 0,
	baseRunners: { first: false, second: false, third: false },
	status: 'in',
	seasonType: 'postseason',
	postseasonRound: 2,
	series: { homeWins: 2, awayWins: 0, bestOf: 5 },
};

const reasonFor = (id: string, favoriteTeams: string[] = []) => {
	const score = scoreGame(chwSeries, {}, { mode: 'classic', postseasonBoostPoints: 10, favoriteTeamCount: favoriteTeams.length, favoriteBoostPoints: 10, gameBoost: 4 });
	const boost = score.boosts.find(entry => entry.id === id)!;
	return boostReason({ ...boost, favoriteTeams }, english);
};

describe('a boost reason in a live playoff game', () => {
	test('stakes names the team one win from the series', () => {
		expect(reasonFor('stakes')).toBe('A win and CHW takes the series.');
	});

	test('the postseason, favorite and manual boosts say why they pay', () => {
		expect(reasonFor('postseasonBoost')).toBe('A quarterfinal, worth half the full boost.');
		expect(reasonFor('gameBoost')).toBe('You added these yourself with the control below.');
		expect(reasonFor('favoriteBoost', ['CLE'])).toBe('CLE is one of your favorites.');
		expect(reasonFor('favoriteBoost', ['CLE', 'CHW'])).toBe('You\'ve favorited both CLE and CHW. No wrong answers tonight.');
	});
});

describe('boostReason', () => {
	test('has nothing to say when it doesn\'t know the favorite, has nothing specific, or meets a key it doesn\'t know', () => {
		expect(boostReason({ id: 'favoriteBoost', favoriteTeams: [] }, english)).toBeUndefined();
		expect(boostReason({ id: 'stakes', favoriteTeams: [] }, english)).toBeUndefined();
		expect(boostReason({ id: 'stakes', details: [{ key: 'raceHunt', params: { team: 'X' } }, { key: 'somethingNew' }], favoriteTeams: [] }, english)).toBeUndefined();
	});

	test('joins several sentences into one line', () => {
		const details = [{ key: 'tyingRun', params: { team: 'CLE' } }, { key: 'lastChance' }];
		expect(boostReason({ id: 'goAheadRun', details, favoriteTeams: [] }, english))
			.toBe('CLE has the tying run on base. It could be their last chance.');
	});
});

const substitutions = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).toSorted();

describe('boost detail strings', () => {
	const needed = [...boostDetailKeys, 'joiner', 'favoriteOne', 'favoriteBoth', 'gameBoostSet',
		'postseasonFinal', 'postseasonSemifinal', 'postseasonQuarterfinal', 'postseasonEarlyRound'];

	test.each(readdirSync(localesDir).filter(file => file.endsWith('.json')))('%s has every one, with the same substitutions as English', file => {
		const locale = readLocale(file);
		for (const key of needed) {
			const message = locale.boostDetail?.[key];
			expect(typeof message).toBe('string');
			expect([key, substitutions(message!)]).toEqual([key, substitutions(en.boostDetail![key]!)]);
		}
	});
});

// What @wxt-dev/i18n does with a named substitution it wasn't handed: it leaves `{name}` in the text.
const wxtTranslator = (messages: Record<string, Record<string, string>>) => (key: string, subs?: Record<string, string | number>): string => {
	const [section, name] = key.split('.');
	const message = messages[section!]?.[name!];
	if (message === undefined) throw new Error(`missing ${key}`);
	return subs ? message.replace(/\{(\w+)\}/g, (match, sub: string) => (Object.hasOwn(subs, sub) ? String(subs[sub]) : match)) : message;
};

const live = (sportType: Game<string>['sportType'], league: string, home: string, away: string, extra: Partial<Game<string>>): Game<string> => ({
	id: `${away}-${home}`.toLowerCase(),
	league,
	sportType,
	homeTeam: { abbreviation: home, score: 0 },
	awayTeam: { abbreviation: away, score: 0 },
	status: 'in',
	...extra,
});

const diamond = (extra: Partial<Game<string>>) => live('baseball', 'mlb', 'CHW', 'CLE', { period: 4, topOfInning: true, outs: 1, ...extra });
const bases = (first: boolean, second: boolean, third: boolean) => diamond({ baseRunners: { first, second, third } });
const gridiron = (extra: Partial<Game<string>>) => live('football', 'nfl', 'KC', 'BUF', { period: 3, clockSeconds: 400, possession: 'home', ...extra });
const lateGridiron = (home: number, away: number) => gridiron({ period: 4, clockSeconds: 400, homeTeam: { abbreviation: 'KC', score: home }, awayTeam: { abbreviation: 'BUF', score: away } });
const drive = (away: number) => gridiron({
	period: 4, clockSeconds: 95, homeTeam: { abbreviation: 'KC', score: 20 }, awayTeam: { abbreviation: 'BUF', score: away }, yardsToEndZone: 35, down: 2, distance: 6,
});
const rink = (home: number, extra: Partial<Game<string>> = {}) => live('hockey', 'nhl', 'BOS', 'TOR', {
	period: 3, clockSeconds: 600, homeTeam: { abbreviation: 'BOS', score: home }, awayTeam: { abbreviation: 'TOR', score: 1 }, ...extra,
});
const pitch = (extra: Partial<Game<string>>) => live('soccer', 'epl', 'EVE', 'LIV', { period: 2, clockSeconds: 70 * 60, ...extra });
const court = (extra: Partial<Game<string>>) => live('basketball', 'nba', 'OKC', 'DEN', { period: 2, clockSeconds: 300, ...extra });
const underdogLine = { pregameLine: { favorite: 'home' as const, spread: 10 } };

// One game for every sentence a boost can say, so a key the engine gains or the allowlist loses
// shows up here rather than as a row that quietly loses its reason.
const everySituation: [Game<string>, ScoringContext][] = [
	[bases(true, false, false), {}], [bases(false, true, false), {}], [bases(false, false, true), {}], [bases(true, true, false), {}],
	[bases(true, false, true), {}], [bases(false, true, true), {}], [bases(true, true, true), {}], [bases(false, false, false), {}],
	[diamond({ outs: 3, baseRunners: { first: true, second: false, third: false } }), {}],
	[diamond({ period: 9, topOfInning: false, baseRunners: { first: false, second: true, third: false } }), {}],
	[diamond({ period: 9, homeTeam: { abbreviation: 'CHW', score: 4 }, awayTeam: { abbreviation: 'CLE', score: 2 }, baseRunners: { first: true, second: true, third: false } }), {}],
	[diamond({ period: 5, baseRunners: { first: true, second: false, third: false } }), {}],
	[diamond({ period: 7, homeTeam: { abbreviation: 'CHW', score: 1, hits: 5 }, awayTeam: { abbreviation: 'CLE', score: 0, hits: 0 } }), {}],
	[diamond({ period: 7, homeTeam: { abbreviation: 'CHW', score: 0, hits: 0 }, awayTeam: { abbreviation: 'CLE', score: 0, hits: 0 } }), {}],
	[gridiron({ isRedZone: false }), {}],
	[gridiron({ isRedZone: true, down: 1, distance: 10 }), {}],
	[gridiron({ isRedZone: true, down: 3, distance: 2 }), {}],
	[gridiron({ isRedZone: true, down: 4, distance: 2 }), {}],
	[gridiron({ isRedZone: true, down: 1, distance: 10, homeTeam: { abbreviation: 'KC', score: 40 } }), {}],
	[drive(24), {}], [drive(20), {}],
	[lateGridiron(10, 17), underdogLine], [lateGridiron(17, 17), underdogLine], [lateGridiron(20, 17), underdogLine],
	[rink(2, { clockSeconds: 80 }), { emptyNet: true, powerPlay: true }],
	[rink(1, { period: 2 }), { powerPlay: true }],
	[rink(2), { powerPlay: 'home' }], [rink(2), { powerPlay: 'away' }], [rink(1), { powerPlay: 'home' }],
	[pitch({ redCards: [{ side: 'away', minute: 60 }], clockSeconds: 62 * 60 }), {}],
	[pitch({}), { stakes: { home: { nearLine: 'title' }, away: { nearLine: 'relegation' } } }],
	[pitch({}), { stakes: { home: { nearLine: 'topQualification' }, away: { nearLine: 'other' } } }],
	[pitch({}), { stakes: { home: { canClinch: true }, away: { canBeEliminated: true } } }],
	[pitch({}), { stakes: { home: { inRace: true } } }],
	[live('football', 'ncaaf', 'UGA', 'BAMA', { period: 2, clockSeconds: 300, homeTeam: { abbreviation: 'UGA', score: 0, rank: 3 }, awayTeam: { abbreviation: 'BAMA', score: 0, rank: 8 } }), {}],
	[court({ seasonType: 'postseason', postseasonRound: 0, series: { homeWins: 3, awayWins: 3, bestOf: 7 } }), {}],
	[court({ seasonType: 'postseason', postseasonRound: 1, series: { homeWins: 3, awayWins: 2, bestOf: 7 } }), {}],
	[court({ seasonType: 'postseason', postseasonRound: 2 }), {}],
	[court({ seasonType: 'postseason', postseasonRound: 3 }), {}],
	[court({}), {}],
];

const scoredWithDetails = everySituation.flatMap(([game, context]) => [8, 0].flatMap(postseasonBoostPoints => {
	const score = scoreGame(game, context, { mode: 'classic', postseasonBoostPoints });
	return score.boosts.filter(boost => boost.details);
}));

describe('every sentence a boost can say', () => {
	test('is one the reason knows, and the reason knows nothing the engine never says', () => {
		const said = new Set(scoredWithDetails.flatMap(boost => boost.details!.map(detail => detail.key)));
		expect([...said].toSorted()).toEqual([...boostDetailKeys, 'postseasonRound'].toSorted());
	});

	test.each(readdirSync(localesDir).filter(file => file.endsWith('.json')))('reads whole in %s, with every blank filled', file => {
		const t = wxtTranslator(readLocale(file));
		for (const boost of scoredWithDetails) {
			const reason = boostReason({ ...boost, favoriteTeams: [] }, t);
			expect([boost.details, reason]).toEqual([boost.details, expect.stringMatching(/^(?!.*(undefined|NaN))[^{}]+$/)]);
		}
	});
});

const hockeySituations = JSON.parse(readFileSync(join(__dirname, '../../../packages/sideline/tests/fixtures/liveExtras/hockeySituations.json'), 'utf8'));

describe('a hockey power play, from the feed to the reason', () => {
	const recorded = hockeySituations.nhlPowerPlay;
	const bruinsLeafs: LiveGame = {
		id: recorded.gameId,
		league: 'nhl',
		sportType: 'hockey',
		status: 'in',
		period: 3,
		clockSeconds: 600,
		homeTeam: { id: '1', name: 'Boston Bruins', abbreviation: 'BOS', score: 2 },
		awayTeam: { id: '10', name: 'Toronto Maple Leafs', abbreviation: 'TOR', score: 1 },
	};
	const prefs = { favoriteTeamIds: [], favoriteTeamBonusPoints: 10, postseasonBoostPoints: 8, disabledSignals: [] };

	const liveScore = (game: LiveGame, situations: unknown[]) => {
		const extras = createLiveExtras();
		situations.forEach(situation => extras.ingestSituation(game.id, situation));
		return toLiveScore(scoreLiveGame({ game, history: [], onBreak: false, winProbability: [], now: recorded.ts, extras: extras.contextFor(game, recorded.ts) }, prefs, 0));
	};

	// The popup reads scores back out of storage, so they go through the same JSON and guard it does.
	const scoringOpportunityReason = (score: unknown) => {
		const breakdown = normalizeScores(JSON.parse(JSON.stringify([score])))[0]!.breakdown!;
		const boost = breakdown.boosts.find(entry => entry.id === 'scoringOpportunity')!;
		return { points: boost.points, reason: boostReason({ ...boost, favoriteTeams: [] }, english) };
	};

	test('says a power play is on in a one-goal game', () => {
		expect(scoringOpportunityReason(liveScore(bruinsLeafs, [recorded.raw]))).toEqual({ points: 7, reason: 'A power play, and only 1 in it.' });
	});

	test('names the team that pulled its goalie once two polls agree, and the power play beside it', () => {
		const pulled = { ...recorded.raw, emptyNet: true };
		expect(scoringOpportunityReason(liveScore({ ...bruinsLeafs, clockSeconds: 80 }, [pulled, pulled])).reason)
			.toBe('TOR pulled the goalie, down 1 with 1:20 left. A power play, and only 1 in it.');
	});

	test('has nothing to add for a score stored before boosts carried details', () => {
		const score = liveScore(bruinsLeafs, [recorded.raw]);
		const older = { ...score, breakdown: { ...score.breakdown!, boosts: score.breakdown!.boosts.map(({ id, points }) => ({ id, points })) } };
		expect(scoringOpportunityReason(older)).toEqual({ points: 7, reason: undefined });
	});

	test('drops a stored breakdown whose details are not a list, rather than crash the reason', () => {
		const score = liveScore(bruinsLeafs, [recorded.raw]);
		const corrupt = { ...score, breakdown: { ...score.breakdown!, boosts: score.breakdown!.boosts.map(boost => ({ ...boost, details: 'power play' })) } };
		expect(normalizeScores(JSON.parse(JSON.stringify([corrupt])))[0]!.breakdown).toBeUndefined();
	});
});
