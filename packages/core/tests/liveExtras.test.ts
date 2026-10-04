import { boostPoints, scoreGame, signalPoints, underdogProbability } from 'powerscore';
import type { TeamStakes } from 'powerscore';
import { parseScoreboardEvents } from '../src/apiClient';
import { createLiveExtras, readBoxLeadChanges, readHockeySituation, readPregameLine, readStandingsStakes } from '../src/liveExtras';
import { scoreLiveGame, toScoringGame } from '../src/scoring';
import type { Game } from '../src/types';
import mlbScoreboard from './fixtures/liveExtras/mlbPostseasonScoreboard.json';
import mlsScoreboard from './fixtures/liveExtras/mlsRedCardScoreboard.json';
import summaryLines from './fixtures/liveExtras/summaryLines.json';
import nbaBoxScores from './fixtures/liveExtras/nbaBoxScores.json';
import hockeySituations from './fixtures/liveExtras/hockeySituations.json';
import mlbStandings from './fixtures/liveExtras/mlbStandings.json';
import nwslStandings from './fixtures/liveExtras/nwslStandings.json';
import nflStandings from './fixtures/liveExtras/nflStandings.json';
import eplStandings from './fixtures/liveExtras/eplStandings.json';
import mlsStandings from './fixtures/liveExtras/mlsStandings.json';

type Json = any;

const clone = <T>(value: T): T => structuredClone(value);

const classic = (game: Game, context = {}) => scoreGame(toScoringGame(game), context, { mode: 'classic' });

// The Yankees at the Rays, ALDS Game 1, recorded live with New York still hitless.
const mlbEvent = (edit: (competition: Json) => void = () => {}): Game => {
	const raw = clone(mlbScoreboard) as Json;
	edit(raw.events[0].competitions[0]);
	return parseScoreboardEvents(raw, 'mlb')[0]!;
};

const inningState = (detail: string, period: number, outs: number) => (competition: Json) => {
	competition.status.period = period;
	competition.status.type.detail = detail;
	competition.status.type.shortDetail = detail;
	competition.situation.outs = outs;
};

describe('the scoreboard: hits, errors and the series', () => {
	test('reads each team\'s hits and errors, keeping a hitless lineup at 0', () => {
		const game = mlbEvent();
		expect([game.homeTeam.abbreviation, game.homeTeam.hits, game.homeTeam.errors]).toEqual(['TB', 5, 0]);
		expect([game.awayTeam.abbreviation, game.awayTeam.hits, game.awayTeam.errors]).toEqual(['NYY', 0, 0]);

		const engine = toScoringGame(game);
		expect(engine.awayTeam.hits).toBe(0);
		expect(engine.homeTeam.hits).toBe(5);
	});

	test('a missing or malformed hit count is dropped, never read as a no-hitter', () => {
		const game = mlbEvent(competition => {
			competition.competitors[1].hits = null;
			competition.competitors[0].hits = '5';
		});
		expect(game.awayTeam.hits).toBeUndefined();
		expect(game.homeTeam.hits).toBeUndefined();
		expect(toScoringGame(game).awayTeam).not.toHaveProperty('hits');
	});

	test('reads a playoff series and hands it to the engine as a postseason game', () => {
		const game = mlbEvent();
		expect(game.series).toEqual({ kind: 'playoff', homeWins: 0, awayWins: 0, bestOf: 5 });
		const engine = toScoringGame(game);
		expect(engine.series).toEqual({ homeWins: 0, awayWins: 0, bestOf: 5 });
		expect(engine.seasonType).toBe('postseason');
	});

	test('a deciding Game 5 between these two scores the full deciding-game stakes', () => {
		const gameFive = mlbEvent(competition => {
			competition.series.competitors[0].wins = 2;
			competition.series.competitors[1].wins = 2;
		});
		expect(boostPoints(classic(gameFive), 'stakes')).toBe(9);
	});

	test('a regular-season series is kept off the engine', () => {
		const game = mlbEvent(competition => {
			competition.series.type = 'season';
		});
		expect(game.series?.kind).toBe('season');
		expect(toScoringGame(game)).not.toHaveProperty('series');
	});
});

describe('a live no-hit bid, from the recorded scoreboard', () => {
	test('pays the Rays\' bid while they bat in the middle of the 5th, and more once they take the field', () => {
		const midFifth = mlbEvent();
		expect(midFifth.period).toBe(5);
		expect(boostPoints(classic(midFifth), 'noHitter')).toBe(7);

		const topSixthOneOut = mlbEvent(inningState('Top 6th', 6, 1));
		expect(boostPoints(classic(topSixthOneOut), 'noHitter')).toBe(14);
	});

	test('keeps the bid through the break at the end of an inning', () => {
		const bottomSixth = mlbEvent(inningState('Bot 6th', 6, 2));
		const endSixth = mlbEvent(inningState('End 6th', 6, 0));
		const topSeventh = mlbEvent(inningState('Top 7th', 7, 0));
		expect(boostPoints(classic(bottomSixth), 'noHitter')).toBe(15);
		expect(boostPoints(classic(topSeventh), 'noHitter')).toBe(22);
		expect(boostPoints(classic(endSixth), 'noHitter')).toBeGreaterThanOrEqual(15);
	});

	test('ends on the first hit', () => {
		const brokenUp = mlbEvent(competition => {
			inningState('Top 6th', 6, 1)(competition);
			competition.competitors[1].hits = 1;
		});
		expect(boostPoints(classic(brokenUp), 'noHitter')).toBe(0);
	});
});

// Inter Miami at Columbus, 2026-09-27: Miami's Santiago Morales was sent off at 90'+6' with the
// score 1-1, and Columbus won it at 90'+8'.
const mlsEvent = (edit: (competition: Json) => void = () => {}): Game => {
	const raw = clone(mlsScoreboard) as Json;
	edit(raw.events[0].competitions[0]);
	return parseScoreboardEvents(raw, 'mls')[0]!;
};

const liveAt = (displayClock: string, home: number, away: number, detailsThrough: string) => (competition: Json) => {
	competition.status = {
		clock: 5400,
		displayClock,
		period: 2,
		type: { id: '26', name: 'STATUS_SECOND_HALF', state: 'in', completed: false, description: 'Second Half', detail: displayClock, shortDetail: displayClock },
	};
	competition.competitors[0].score = String(home);
	competition.competitors[1].score = String(away);
	const last = competition.details.findIndex((detail: Json) => detail.type.text === detailsThrough && detail.clock.displayValue === displayClock);
	competition.details = competition.details.slice(0, last + 1);
};

describe('soccer red cards from the scoreboard', () => {
	test('reads only the red card, with its team and player, not the dozen yellows around it', () => {
		const game = mlsEvent();
		expect(game.redCardEvents).toEqual([{ teamId: '20232', minute: 90, player: 'Santiago Morales' }]);
		expect(toScoringGame(game).redCards).toEqual([{ side: 'away', minute: 90 }]);
	});

	test('a match with no red card has no card list at all', () => {
		const game = mlsEvent(liveAt('90\'+3\'', 1, 1, 'Yellow Card'));
		expect(game.redCardEvents).toBeUndefined();
		expect(toScoringGame(game)).not.toHaveProperty('redCards');
	});

	test('a card for a team that is not in the match is dropped on the way to the engine', () => {
		const game = mlsEvent(competition => {
			competition.details.find((detail: Json) => detail.redCard).team.id = '999';
		});
		expect(toScoringGame(game).redCards).toEqual([]);
	});

	test('red cards are read for soccer only', () => {
		const raw = clone(mlbScoreboard) as Json;
		raw.events[0].competitions[0].details = clone((mlsScoreboard as Json).events[0].competitions[0].details);
		expect(parseScoreboardEvents(raw, 'mlb')[0]!.redCardEvents).toBeUndefined();
	});

	test('a red card shown in stoppage time pays in full when it is shown', () => {
		const sentOff = mlsEvent(liveAt('90\'+6\'', 1, 1, 'Red Card'));
		expect(sentOff.clockSeconds).toBe(96 * 60);
		expect(boostPoints(classic(sentOff), 'redCard')).toBe(10);
	});
});

const lines = summaryLines as Json;

describe('the pregame line from the summary', () => {
	test('reads a moneyline favorite at home, with the puck line\'s size', () => {
		expect(readPregameLine(lines.nhlHomeFavorite.raw)).toEqual({ favorite: 'home', spread: 1.5, favoriteMoneyline: -230, underdogMoneyline: 190 });
	});

	test('reads a road favorite, whose spread arrives positive from the home side', () => {
		expect(readPregameLine(lines.nhlAwayFavorite.raw)).toEqual({ favorite: 'away', spread: 1.5, favoriteMoneyline: -135, underdogMoneyline: 114 });
	});

	test('reads soccer\'s draw price', () => {
		const line = readPregameLine(lines.nwslThreeWay.raw)!;
		expect(line).toEqual({ favorite: 'home', spread: 1.5, favoriteMoneyline: -225, underdogMoneyline: 450, drawMoneyline: 390 });
		expect(underdogProbability(line, 'soccer', 'nwsl')).toBeCloseTo(0.263, 3);
	});

	test('keeps a spread with no moneyline, which is enough for football', () => {
		const line = readPregameLine(lines.ncaafSpreadOnly.raw)!;
		expect(line).toEqual({ favorite: 'home', spread: 47.5 });
		expect(underdogProbability(line, 'football', 'ncaaf')).toBeLessThan(0.01);
	});

	test('a hockey or baseball line is sized by its moneyline, never by the 1.5', () => {
		const hockey = underdogProbability(readPregameLine(lines.nhlHomeFavorite.raw)!, 'hockey', 'nhl')!;
		const baseball = underdogProbability(readPregameLine(lines.mlbHomeFavorite.raw)!, 'baseball', 'mlb')!;
		expect(hockey).toBeCloseTo((100 / 290) / (100 / 290 + 230 / 330), 6);
		expect(baseball).toBeCloseTo((100 / 219) / (100 / 219 + 143 / 243), 6);
	});

	test('no line at all: an empty pickcenter, or none sent', () => {
		expect(readPregameLine(lines.nbaPreseasonNoLine.raw)).toBeUndefined();
		expect(readPregameLine(lines.ncaamhNoPickcenter.raw)).toBeUndefined();
		expect(readPregameLine({ pickcenter: 'not a list' })).toBeUndefined();
	});

	test('a pick\'em, with nobody marked favorite, is no line', () => {
		const pickem = clone(lines.ncaafEarly.raw);
		pickem.pickcenter[0].homeTeamOdds.favorite = false;
		expect(readPregameLine(pickem)).toBeUndefined();
	});

	test('the tracker keeps the first line it saw when the book moves it', () => {
		expect(lines.ncaafMoved.raw.pickcenter[0].homeTeamOdds.moneyLine).not.toBe(lines.ncaafEarly.raw.pickcenter[0].homeTeamOdds.moneyLine);
		const extras = createLiveExtras();
		const game = { id: lines.ncaafEarly.gameId, sportType: 'football' } as const;
		extras.ingestSummary(game, lines.ncaafEarly.raw, lines.ncaafEarly.ts);
		extras.ingestSummary(game, lines.ncaafMoved.raw, lines.ncaafMoved.ts);
		const coreGame = { id: game.id, league: 'ncaaf', sportType: 'football', homeTeam: { id: '30' }, awayTeam: { id: '264' } } as Game;
		expect(extras.contextFor(coreGame, lines.ncaafMoved.ts).pregameLine).toEqual({ favorite: 'home', spread: 7.5, favoriteMoneyline: -340, underdogMoneyline: 270 });
	});

	test('a summary without a line does not stop a later one from being kept', () => {
		const extras = createLiveExtras();
		const game = { id: lines.ncaafEarly.gameId, sportType: 'football' } as const;
		extras.ingestSummary(game, {}, lines.ncaafEarly.ts - 60_000);
		extras.ingestSummary(game, lines.ncaafEarly.raw, lines.ncaafEarly.ts);
		const coreGame = { id: game.id, league: 'ncaaf', sportType: 'football', homeTeam: { id: '30' }, awayTeam: { id: '264' } } as Game;
		expect(extras.contextFor(coreGame, lines.ncaafEarly.ts).pregameLine?.favoriteMoneyline).toBe(-340);
	});
});

const box = nbaBoxScores as Json;

// Miami at Toronto, NBA preseason. The box score's count went 2 → 3 between the first two polls.
const nbaGame = {
	id: '401902644',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { id: '28', name: 'Toronto Raptors', abbreviation: 'TOR', score: 12 },
	awayTeam: { id: '14', name: 'Miami Heat', abbreviation: 'MIA', score: 16 },
	period: 1,
	clockSeconds: 396,
	status: 'in',
} as Game;

const boxWithLeadChanges = (count: number) => {
	const raw = clone(box.polls[2].raw);
	for (const team of raw.boxscore.teams) team.statistics.find((stat: Json) => stat.name === 'leadChanges').displayValue = String(count);
	return raw;
};

describe('box-score lead changes', () => {
	test('reads the running count', () => {
		expect(box.polls.map((poll: Json) => readBoxLeadChanges(poll.raw))).toEqual([2, 3, 3]);
		expect(readBoxLeadChanges({ boxscore: { teams: [{ statistics: [{ name: 'leadChanges', displayValue: '--' }] }] } })).toBeUndefined();
	});

	test('the first sample is a baseline, never a burst of recent changes', () => {
		const extras = createLiveExtras();
		extras.ingestSummary(nbaGame, box.polls[0].raw, box.polls[0].ts);
		expect(extras.contextFor(nbaGame, box.polls[0].ts).recentLeadChanges).toBeUndefined();
	});

	test('counts the change between two polls and dates it halfway between them', () => {
		const extras = createLiveExtras();
		for (const poll of box.polls) extras.ingestSummary(nbaGame, poll.raw, poll.ts);
		expect(extras.contextFor(nbaGame, box.polls[2].ts).recentLeadChanges).toEqual({
			count: 1,
			lastAt: Math.round((box.polls[0].ts + box.polls[1].ts) / 2),
		});
	});

	test('a stat correction that lowers the count neither counts nor moves the baseline', () => {
		const extras = createLiveExtras();
		const start = box.polls[0].ts;
		[2, 3, 2, 3].forEach((count, index) => extras.ingestSummary(nbaGame, boxWithLeadChanges(count), start + index * 60_000));
		expect(extras.contextFor(nbaGame, start + 180_000).recentLeadChanges?.count).toBe(1);
	});

	test('is read for basketball only', () => {
		const extras = createLiveExtras();
		const hockeyGame = { ...nbaGame, sportType: 'hockey', league: 'nhl' } as Game;
		extras.ingestSummary(hockeyGame, boxWithLeadChanges(2), 0);
		extras.ingestSummary(hockeyGame, boxWithLeadChanges(5), 60_000);
		expect(extras.contextFor(hockeyGame, 60_000).recentLeadChanges).toBeUndefined();
	});

	test('a change after a quiet stretch is dated within a poll of when it happened', () => {
		const extras = createLiveExtras();
		const start = box.polls[0].ts;
		const counts = [2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4];
		counts.forEach((count, index) => extras.ingestSummary(nbaGame, boxWithLeadChanges(count), start + index * 60_000));
		const lastPoll = start + (counts.length - 1) * 60_000;
		const recent = extras.contextFor(nbaGame, lastPoll).recentLeadChanges;
		expect(recent?.count).toBe(1);
		expect(lastPoll - recent!.lastAt!).toBeLessThanOrEqual(60_000);
	});

	test('changes from before the scorer\'s window are not reported as recent', () => {
		const extras = createLiveExtras();
		const start = box.polls[0].ts;
		[2, 3, 3, 3, 3, 3, 3, 3].forEach((count, index) => extras.ingestSummary(nbaGame, boxWithLeadChanges(count), start + index * 60_000));
		expect(extras.contextFor(nbaGame, start + 7 * 60_000).recentLeadChanges).toBeUndefined();
	});

	test('a lead change the scoreboard just saw scores as fresh, even after a quiet stretch in the box score', () => {
		const extras = createLiveExtras();
		const start = box.polls[0].ts;
		[2, 3, 4, 4, 4, 4, 4, 4, 4, 4].forEach((count, index) => extras.ingestSummary(nbaGame, boxWithLeadChanges(count), start + index * 60_000));
		const now = start + 9 * 60_000 + 20_000;
		const flip = ([[40, 42], [42, 42], [44, 42]] as const).map(([homeScore, awayScore], index) => ({ gameId: nbaGame.id, timestamp: now - 40_000 + index * 20_000, homeScore, awayScore }));
		const game = { ...nbaGame, homeTeam: { ...nbaGame.homeTeam, score: 44 }, awayTeam: { ...nbaGame.awayTeam, score: 42 } };
		const score = scoreLiveGame(
			{ game, history: flip, stallCount: 0, winProbability: [], now, extras: extras.contextFor(game, now) },
			{ favoriteTeamIds: [], favoriteTeamBonusPoints: 0, postseasonBoostPoints: 0, disabledSignals: [] },
			0,
		);
		expect(signalPoints(score, 'leadChanges')).toBe(12);
	});
});

const situations = hockeySituations as Json;

describe('the hockey situation', () => {
	test('reads the power play and empty net flags, and nothing from a bare reference', () => {
		expect(readHockeySituation(situations.nhlPowerPlay.raw)).toEqual({ powerPlay: true, emptyNet: false });
		expect(readHockeySituation(situations.nhlEvenStrength.raw)).toEqual({ powerPlay: false, emptyNet: false });
		expect(readHockeySituation(situations.nhlBare.raw)).toEqual({});
		expect(readHockeySituation(situations.ncaamhBare.raw)).toEqual({});
		expect(readHockeySituation(null)).toEqual({});
	});

	const hockeyGame = { id: situations.nhlEvenStrength.gameId, league: 'nhl', sportType: 'hockey', homeTeam: { id: '1' }, awayTeam: { id: '2' } } as Game;
	const pulled = { ...situations.nhlEvenStrength.raw, emptyNet: true };

	test('an empty net counts only on the second poll in a row', () => {
		const extras = createLiveExtras();
		extras.ingestSituation(hockeyGame.id, pulled);
		expect(extras.contextFor(hockeyGame, 0).emptyNet).toBeUndefined();
		extras.ingestSituation(hockeyGame.id, pulled);
		expect(extras.contextFor(hockeyGame, 0).emptyNet).toBe(true);
		extras.ingestSituation(hockeyGame.id, situations.nhlEvenStrength.raw);
		expect(extras.contextFor(hockeyGame, 0).emptyNet).toBeUndefined();
	});

	test('a goalie back in between two pulls starts the count over', () => {
		const extras = createLiveExtras();
		extras.ingestSituation(hockeyGame.id, pulled);
		extras.ingestSituation(hockeyGame.id, situations.nhlEvenStrength.raw);
		extras.ingestSituation(hockeyGame.id, pulled);
		expect(extras.contextFor(hockeyGame, 0).emptyNet).toBeUndefined();
	});

	test('a power play counts at once and ends with the next even-strength poll', () => {
		const extras = createLiveExtras();
		extras.ingestSituation(hockeyGame.id, situations.nhlPowerPlay.raw);
		expect(extras.contextFor(hockeyGame, 0).powerPlay).toBe(true);
		extras.ingestSituation(hockeyGame.id, situations.nhlEvenStrength.raw);
		expect(extras.contextFor(hockeyGame, 0).powerPlay).toBeUndefined();
	});

	test('forgetting a game drops what was tracked for it', () => {
		const extras = createLiveExtras();
		extras.ingestSituation(hockeyGame.id, situations.nhlPowerPlay.raw);
		extras.forget(hockeyGame.id);
		expect(extras.contextFor(hockeyGame, 0)).toEqual({});
	});
});

interface StandingsNode {
	standings?: { entries: Json[] };
	children?: StandingsNode[];
}

const entriesOf = (node: StandingsNode): Json[] => [...(node.standings?.entries ?? []), ...(node.children ?? []).flatMap(entriesOf)];

const editTeam = (tree: StandingsNode, abbreviation: string, stats: Record<string, number | string>) => {
	const entry = entriesOf(tree).find(candidate => candidate.team.abbreviation === abbreviation);
	for (const [name, value] of Object.entries(stats)) {
		const existing = entry.stats.find((stat: Json) => stat.name === name);
		const next = typeof value === 'number' ? { name, value, displayValue: String(value) } : { name, displayValue: value };
		if (existing) Object.assign(existing, next);
		else entry.stats.push(next);
	}
};

const flagsByAbbreviation = (tree: StandingsNode, stakes: Map<string, TeamStakes>): Record<string, TeamStakes> => Object.fromEntries(
	entriesOf(tree).filter(entry => stakes.has(String(entry.team.id))).map(entry => [entry.team.abbreviation, stakes.get(String(entry.team.id))!]),
);

describe('standings races: baseball\'s magic numbers and playoff odds', () => {
	test('a finished season marks nobody, whatever its stale magic numbers say', () => {
		expect(readStandingsStakes(mlbStandings, 'mlb', 'baseball').size).toBe(0);
	});

	test('a September race: one win from clinching, a coin-flip chase, and the eliminated and settled left out', () => {
		const september = clone(mlbStandings) as StandingsNode;
		for (const entry of entriesOf(september)) editTeam(september, entry.team.abbreviation, { gamesPlayed: 152, clincher: '' });
		editTeam(september, 'NYY', { magicNumberDivision: 1 });
		editTeam(september, 'CLE', { magicNumberWildcard: 1 });
		editTeam(september, 'TEX', { playoffPercent: 45.3 });
		editTeam(september, 'DET', { playoffPercent: 10 });
		editTeam(september, 'SEA', { playoffPercent: 45, clincher: 'e' });
		editTeam(september, 'BOS', { magicNumberDivision: 1, clincher: 'z' });
		editTeam(september, 'HOU', { playoffPercent: 95 });
		editTeam(september, 'KC', { playoffPercent: 50, gamesPlayed: 130 });

		expect(flagsByAbbreviation(september, readStandingsStakes(september, 'mlb', 'baseball'))).toEqual({
			NYY: { canClinch: true },
			CLE: { canClinch: true },
			TEX: { inRace: true },
			DET: { inRace: true },
		});
	});

	test('the tracker hands a regular-season game its teams\' race flags, and the stakes boost pays them', () => {
		const september = clone(mlbStandings) as StandingsNode;
		for (const entry of entriesOf(september)) editTeam(september, entry.team.abbreviation, { gamesPlayed: 152, clincher: '' });
		editTeam(september, 'NYY', { magicNumberDivision: 1 });
		editTeam(september, 'TB', { playoffPercent: 60 });

		const extras = createLiveExtras();
		extras.ingestStandings('mlb', 'baseball', september);
		const regularSeason: Game = { ...mlbEvent(), isPostseason: false, series: undefined, postseasonRound: undefined };
		const context = extras.contextFor(regularSeason, 0);
		expect(context.stakes).toEqual({ home: { inRace: true }, away: { canClinch: true } });
		expect(boostPoints(classic(regularSeason, context), 'stakes')).toBe(6);
	});
});

describe('standings races: NFL seeds', () => {
	test('a week-4 table is too early for anyone to be racing', () => {
		expect(readStandingsStakes(nflStandings, 'nfl', 'football').size).toBe(0);
	});

	test('late in the season, seeds 5 to 10 within a game of the 7th seed are in the hunt, ties counting half', () => {
		const december = clone(nflStandings) as StandingsNode;
		const records: Record<string, [number, number, number]> = {
			JAX: [8, 6, 0], LV: [9, 5, 0], BAL: [8, 6, 0], DEN: [8, 6, 0], CIN: [7, 7, 0], PIT: [6, 7, 1], NYJ: [7, 6, 1], NE: [8, 6, 0],
		};
		for (const [team, [wins, losses, ties]] of Object.entries(records)) editTeam(december, team, { wins, losses, ties });

		expect(Object.keys(flagsByAbbreviation(december, readStandingsStakes(december, 'nfl', 'football'))).toSorted()).toEqual(['BAL', 'CIN', 'DEN', 'LV', 'NYJ']);
	});
});

describe('standings races: soccer\'s table lines', () => {
	test('NWSL with three weeks left: the Shield race and the playoff line, read from the zone notes', () => {
		expect(flagsByAbbreviation(nwslStandings, readStandingsStakes(nwslStandings, 'nwsl', 'soccer'))).toEqual({
			GFC: { nearLine: 'title' },
			SD: { nearLine: 'title' },
			POR: { nearLine: 'other' },
			LA: { nearLine: 'other' },
			NC: { nearLine: 'other' },
			KC: { nearLine: 'other' },
			SEA: { nearLine: 'other' },
		});
	});

	test('MLS sends its tables out of rank order; only teams inside the last 15% of the season are marked', () => {
		const ranks = (mlsStandings as Json).children[0].standings.entries.map((entry: Json) => entry.stats.find((stat: Json) => stat.name === 'rank').value);
		expect(ranks).not.toEqual(ranks.toSorted((a: number, b: number) => a - b));
		expect(flagsByAbbreviation(mlsStandings, readStandingsStakes(mlsStandings, 'mls', 'soccer'))).toEqual({ LA: { nearLine: 'other' } });
	});

	test('a Premier League run-in: the title, the Champions League places and relegation, the bigger line winning', () => {
		expect(readStandingsStakes(eplStandings, 'epl', 'soccer').size).toBe(0);

		const runIn = clone(eplStandings) as StandingsNode;
		for (const entry of entriesOf(runIn)) editTeam(runIn, entry.team.abbreviation, { gamesPlayed: 33 });
		const flags = flagsByAbbreviation(runIn, readStandingsStakes(runIn, 'epl', 'soccer'));
		expect(flags.MNC).toEqual({ nearLine: 'title' });
		expect(flags.ARS).toEqual({ nearLine: 'title' });
		expect(flags.BHA).toEqual({ nearLine: 'topQualification' });
		expect(flags.CHE).toEqual({ nearLine: 'topQualification' });
		expect(flags.IPS).toEqual({ nearLine: 'relegation' });
		expect(flags.TOT).toEqual({ nearLine: 'relegation' });
	});

	test('a non-object standings payload marks nobody', () => {
		expect(readStandingsStakes(undefined, 'epl', 'soccer').size).toBe(0);
		expect(readStandingsStakes('nope', 'mlb', 'baseball').size).toBe(0);
	});
});
