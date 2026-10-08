import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';
import { boostDetailKeys, boostTooltip } from '../utils/boostTooltip';

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

const tooltipFor = (id: string, favoriteTeams: string[] = []) => {
	const score = scoreGame(chwSeries, {}, { mode: 'classic', postseasonBoostPoints: 10, favoriteTeamCount: favoriteTeams.length, favoriteBoostPoints: 10, gameBoost: 0 });
	const boost = score.boosts.find(entry => entry.id === id)!;
	return boostTooltip({ ...boost, favoriteTeams, frozen: score.frozen }, english);
};

describe('a boost tooltip in a live playoff game', () => {
	test('stakes names the team one win from the series', () => {
		expect(tooltipFor('stakes')).toBe('A win and CHW takes the series.');
	});

	test('the always-shown rows say why they are where they are', () => {
		expect(tooltipFor('scoringOpportunity')).toBe('Bases empty');
		expect(tooltipFor('postseasonBoost')).toBe('A quarterfinal, worth half the full boost.');
		expect(tooltipFor('gameBoost')).toBe('You haven\'t boosted this game. The control below adds points.');
		expect(tooltipFor('favoriteBoost')).toBe('Neither team is one of your favorites.');
		expect(tooltipFor('favoriteBoost', ['CLE'])).toBe('CLE is one of your favorites.');
	});
});

describe('boostTooltip', () => {
	test('stopped play overrides every row', () => {
		expect(boostTooltip({ id: 'stakes', points: 0, favoriteTeams: [], frozen: true }, english)).toBe(english('boostDetail.playStopped'));
	});

	test('falls back to the general rule when there is nothing specific, or a key it doesn\'t know', () => {
		expect(boostTooltip({ id: 'stakes', points: 4, favoriteTeams: [], frozen: false }, english)).toBeUndefined();
		expect(boostTooltip({ id: 'stakes', points: 4, details: [{ key: 'raceHunt', params: { team: 'X' } }, { key: 'somethingNew' }], favoriteTeams: [], frozen: false }, english)).toBeUndefined();
	});

	test('joins several sentences into one tooltip', () => {
		const details = [{ key: 'tyingRun', params: { team: 'CLE' } }, { key: 'lastChance' }];
		expect(boostTooltip({ id: 'goAheadRun', points: 6, details, favoriteTeams: [], frozen: false }, english))
			.toBe('CLE has the tying run on base. It could be their last chance.');
	});
});

const substitutions = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).toSorted();

describe('boost detail strings', () => {
	const needed = [...boostDetailKeys, 'joiner', 'playStopped', 'favoriteNone', 'favoriteOne', 'favoriteBoth', 'favoriteOff', 'gameBoostNone', 'gameBoostSet',
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
