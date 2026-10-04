import * as z from 'zod/mini';
import { computeFantasyPoints, fantasySportOf } from 'powerscore';
import type { FantasyPlayerState, FantasySport, PregameLine, ScoringContext, Side, TeamStakes } from 'powerscore';
import { readFantasyBoxScore, rosterInGame, type FantasyRosterEntry } from './fantasy';
import { getHistoryWindowMsForGame } from './scoring';
import type { Game, LeagueId } from './types';

// What our sources say about a live game beyond the scoreboard (the summary's closing line and box
// score, the hockey situation, the league standings), read into the engine's neutral context. The
// background and the replay harness both drive this, so a replay scores with exactly the extras the
// extension would have had.

const espnNumber = z.union([z.number(), z.string()]);

const OddsSideSchema = z.object({
	favorite: z.optional(z.boolean()),
	moneyLine: z.optional(z.number()),
});

const SummaryExtrasSchema = z.object({
	pickcenter: z.catch(z.optional(z.array(z.object({
		spread: z.optional(z.number()),
		homeTeamOdds: z.optional(OddsSideSchema),
		awayTeamOdds: z.optional(OddsSideSchema),
		drawOdds: z.optional(z.object({ moneyLine: z.optional(z.number()) })),
	}))), undefined),
	boxscore: z.catch(z.optional(z.object({
		teams: z.optional(z.array(z.object({
			statistics: z.optional(z.array(z.object({ name: z.optional(z.string()), displayValue: z.optional(z.string()) }))),
		}))),
	})), undefined),
});

// The line before the game. `pickcenter` carries the closing numbers, and the first one seen is
// kept for the whole game so a mid-game update can't move it.
export const readPregameLine = (summary: unknown): PregameLine | undefined => {
	const parsed = SummaryExtrasSchema.safeParse(summary);
	const line = parsed.success ? parsed.data.pickcenter?.[0] : undefined;
	if (!line) return undefined;
	const homeFavored = line.homeTeamOdds?.favorite === true;
	const awayFavored = line.awayTeamOdds?.favorite === true;
	if (homeFavored === awayFavored) return undefined;
	const favorite: Side = homeFavored ? 'home' : 'away';
	const favoriteOdds = homeFavored ? line.homeTeamOdds : line.awayTeamOdds;
	const underdogOdds = homeFavored ? line.awayTeamOdds : line.homeTeamOdds;
	return {
		favorite,
		...(line.spread !== undefined && line.spread !== 0 ? { spread: Math.abs(line.spread) } : {}),
		...(favoriteOdds?.moneyLine !== undefined && underdogOdds?.moneyLine !== undefined
			? { favoriteMoneyline: favoriteOdds.moneyLine, underdogMoneyline: underdogOdds.moneyLine }
			: {}),
		...(line.drawOdds?.moneyLine !== undefined ? { drawMoneyline: line.drawOdds.moneyLine } : {}),
	};
};

// The box score's running full-game count of lead changes (basketball).
export const readBoxLeadChanges = (summary: unknown): number | undefined => {
	const parsed = SummaryExtrasSchema.safeParse(summary);
	if (!parsed.success) return undefined;
	for (const team of parsed.data.boxscore?.teams ?? []) {
		const stat = team.statistics?.find(entry => entry.name === 'leadChanges');
		const value = Number(stat?.displayValue);
		if (stat && Number.isFinite(value)) return value;
	}
	return undefined;
};

const HockeySituationSchema = z.object({
	powerPlay: z.optional(z.boolean()),
	emptyNet: z.optional(z.boolean()),
});

export const readHockeySituation = (situation: unknown): { powerPlay?: boolean; emptyNet?: boolean } => {
	const parsed = HockeySituationSchema.safeParse(situation);
	return parsed.success ? parsed.data : {};
};

const StandingsEntrySchema = z.object({
	team: z.object({ id: espnNumber }),
	note: z.optional(z.object({ description: z.optional(z.string()) })),
	stats: z.optional(z.array(z.object({
		name: z.optional(z.string()),
		value: z.optional(z.number()),
		displayValue: z.optional(z.string()),
	}))),
});

interface StandingsNode {
	standings?: { entries?: unknown[] };
	children?: StandingsNode[];
}

type StandingsEntry = z.infer<typeof StandingsEntrySchema>;

const statOf = (entry: StandingsEntry, name: string): number | undefined => {
	const stat = entry.stats?.find(s => s.name === name);
	if (typeof stat?.value === 'number' && Number.isFinite(stat.value)) return stat.value;
	const parsed = Number(stat?.displayValue);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const clincherOf = (entry: StandingsEntry): string | undefined => entry.stats?.find(s => s.name === 'clincher')?.displayValue;

// The table each team appears in, at the deepest level our sources send.
const tablesOf = (node: StandingsNode): StandingsEntry[][] => {
	const own = (node.standings?.entries ?? [])
		.map(entry => StandingsEntrySchema.safeParse(entry))
		.filter(result => result.success)
		.map(result => result.data!);
	const children = (node.children ?? []).flatMap(tablesOf);
	return own.length > 0 && children.length === 0 ? [own] : children;
};

// Regular-season length, for the race window: the last 15% of the season, or the last four games.
const seasonLength: Partial<Record<LeagueId, number>> = {
	mlb: 162, nba: 82, nhl: 82, wnba: 44, nfl: 17, epl: 38, laliga: 38, seriea: 38, bundesliga: 34, mls: 34, nwsl: 26, ligamx: 17,
};

// Leagues whose standings carry late-season races worth fetching for.
export const hasStandingsRaces = (league: LeagueId): boolean => seasonLength[league] !== undefined;

const inRaceWindow = (league: LeagueId, entry: StandingsEntry): boolean => {
	const length = seasonLength[league];
	const played = statOf(entry, 'gamesPlayed') ?? ((statOf(entry, 'wins') ?? 0) + (statOf(entry, 'losses') ?? 0) + (statOf(entry, 'ties') ?? 0));
	if (!length || !played) return false;
	return length - played <= Math.max(4, Math.ceil(0.15 * length));
};

const lineKind = (above: string | undefined, below: string | undefined): TeamStakes['nearLine'] => {
	const text = `${above ?? ''} ${below ?? ''}`;
	if (/relegat/i.test(text)) return 'relegation';
	if (/champions league/i.test(text)) return 'topQualification';
	return 'other';
};

// Soccer: a line sits wherever two neighbours' notes differ, plus the title line between 1st and
// 2nd. A team within three points of the team across a line is in that race.
const soccerStakes = (table: StandingsEntry[], stakes: Map<string, TeamStakes>, league: LeagueId) => {
	const ordered = table.toSorted((a, b) => (statOf(a, 'rank') ?? 99) - (statOf(b, 'rank') ?? 99));
	const mark = (entry: StandingsEntry, kind: TeamStakes['nearLine']) => {
		if (!inRaceWindow(league, entry)) return;
		const id = String(entry.team.id);
		const current = stakes.get(id)?.nearLine;
		const rank = { title: 3, relegation: 3, topQualification: 2, other: 1 } as const;
		if (!current || rank[kind!] > rank[current]) stakes.set(id, { ...stakes.get(id), nearLine: kind });
	};
	for (let i = 0; i < ordered.length - 1; i++) {
		const upper = ordered[i]!;
		const lower = ordered[i + 1]!;
		const isTitleLine = i === 0;
		const crossesZone = upper.note?.description !== lower.note?.description;
		if (!isTitleLine && !crossesZone) continue;
		const kind = isTitleLine ? 'title' : lineKind(upper.note?.description, lower.note?.description);
		const pointsOf = (entry: StandingsEntry) => statOf(entry, 'points') ?? 0;
		for (const entry of ordered.slice(0, i + 1)) if (pointsOf(entry) - pointsOf(lower) <= 3) mark(entry, kind);
		for (const entry of ordered.slice(i + 1)) if (pointsOf(upper) - pointsOf(entry) <= 3) mark(entry, kind);
	}
};

// NFL has no playoff odds: in the hunt means seeded 5th to 10th within a game of the last spot.
const nflStakes = (tables: StandingsEntry[][], stakes: Map<string, TeamStakes>) => {
	const conference = tables.flat();
	const seventh = conference.find(entry => statOf(entry, 'playoffSeed') === 7);
	const winsOf = (entry: StandingsEntry) => (statOf(entry, 'wins') ?? 0) + 0.5 * (statOf(entry, 'ties') ?? 0);
	for (const entry of conference) {
		const seed = statOf(entry, 'playoffSeed');
		if (!seventh || seed === undefined || seed < 5 || seed > 10 || !inRaceWindow('nfl', entry)) continue;
		if (Math.abs(winsOf(entry) - winsOf(seventh)) <= 1) stakes.set(String(entry.team.id), { inRace: true });
	}
};

// Race flags per team id, from the full-league standings tree.
export const readStandingsStakes = (standings: unknown, league: LeagueId, sportType: Game['sportType']): Map<string, TeamStakes> => {
	const stakes = new Map<string, TeamStakes>();
	if (typeof standings !== 'object' || standings === null) return stakes;
	const root = standings as StandingsNode;
	if (sportType === 'soccer') {
		for (const table of tablesOf(root)) soccerStakes(table, stakes, league);
		return stakes;
	}
	if (league === 'nfl') {
		for (const conference of root.children ?? []) nflStakes(tablesOf(conference), stakes);
		return stakes;
	}
	for (const entry of tablesOf(root).flat()) {
		const clincher = clincherOf(entry);
		if (clincher === 'e' || clincher === 'z' || !inRaceWindow(league, entry)) continue;
		const division = statOf(entry, 'magicNumberDivision');
		const wildcard = statOf(entry, 'magicNumberWildcard');
		const odds = statOf(entry, 'playoffPercent');
		const canClinch = division === 1 || wildcard === 1;
		const inRace = odds !== undefined && odds >= 10 && odds <= 90;
		if (canClinch || inRace) stakes.set(String(entry.team.id), { ...(canClinch ? { canClinch } : {}), ...(inRace ? { inRace } : {}) });
	}
	return stakes;
};

interface GameExtras {
	pregameLine?: PregameLine;
	boxLeadChanges: { ts: number; count: number }[];
	powerPlay?: boolean;
	emptyNetPolls: number;
	// Rostered players' running fantasy totals, and every rise as an event.
	fantasyTotals: Map<string, number>;
	fantasyEvents: Map<string, { at: number; points: number }[]>;
	fantasyInactive: Set<string>;
}

export type FantasyScoringOverrides = Partial<Record<FantasySport, Partial<Record<string, number>>>>;

// Changes inside the scorer's window, measured from the oldest box sample in it: the first sample
// of a game is a baseline, never a burst of recent changes.
const recentLeadChanges = (game: Game, state: GameExtras, now: number): ScoringContext['recentLeadChanges'] => {
	const cutoff = now - getHistoryWindowMsForGame(game);
	const samples = state.boxLeadChanges;
	const baselineIndex = samples.findIndex(sample => sample.ts >= cutoff);
	const baseline = baselineIndex > 0 ? samples[baselineIndex - 1] : samples[0];
	const latest = samples[samples.length - 1];
	if (!baseline || !latest || latest.count <= baseline.count) return undefined;
	const before = samples[samples.length - 2]!;
	return { count: latest.count - baseline.count, lastAt: Math.round((before.ts + latest.ts) / 2) };
};

export const createLiveExtras = () => {
	const games = new Map<string, GameExtras>();
	const stakesByLeague = new Map<LeagueId, Map<string, TeamStakes>>();
	let roster: FantasyRosterEntry[] = [];
	let fantasyScoring: FantasyScoringOverrides = {};

	const setRoster = (entries: FantasyRosterEntry[]) => {
		roster = entries;
	};
	const setFantasyScoring = (overrides: FantasyScoringOverrides) => {
		fantasyScoring = overrides;
	};

	const stateOf = (gameId: string): GameExtras => {
		let state = games.get(gameId);
		if (!state) {
			state = { boxLeadChanges: [], emptyNetPolls: 0, fantasyTotals: new Map(), fantasyEvents: new Map(), fantasyInactive: new Set() };
			games.set(gameId, state);
		}
		return state;
	};

	// The first total seen is a baseline: a player picked up mid-game hasn't just scored them all.
	const ingestFantasy = (game: Game, state: GameExtras, summary: unknown, ts: number) => {
		const players = rosterInGame(roster, game);
		const sport = fantasySportOf(game.sportType);
		if (players.length === 0 || !sport) return;
		const box = readFantasyBoxScore(summary, game);
		state.fantasyInactive = box.inactive;
		for (const player of players) {
			const id = player.position === 'DST' ? `dst:${player.teamId}` : player.athleteId;
			const line = box.lines.get(id);
			if (!line) continue;
			const total = computeFantasyPoints(sport, line, fantasyScoring[sport]);
			const previous = state.fantasyTotals.get(id);
			state.fantasyTotals.set(id, total);
			if (previous === undefined || total === previous) continue;
			const events = [...(state.fantasyEvents.get(id) ?? []), { at: ts, points: total - previous }].slice(-20);
			state.fantasyEvents.set(id, events);
		}
	};

	const ingestSummary = (game: Pick<Game, 'id' | 'sportType'> & Partial<Game>, summary: unknown, ts: number) => {
		const state = stateOf(game.id);
		state.pregameLine ??= readPregameLine(summary);
		if (game.homeTeam && game.awayTeam && game.league) ingestFantasy(game as Game, state, summary, ts);
		if (game.sportType !== 'basketball') return;
		const count = readBoxLeadChanges(summary);
		const last = state.boxLeadChanges[state.boxLeadChanges.length - 1];
		// A stat correction that lowers the count neither counts nor moves the baseline.
		if (count !== undefined && (!last || count > last.count)) state.boxLeadChanges.push({ ts, count });
		if (state.boxLeadChanges.length > 30) state.boxLeadChanges.shift();
	};

	const ingestSituation = (gameId: string, situation: unknown) => {
		const state = stateOf(gameId);
		const { powerPlay, emptyNet } = readHockeySituation(situation);
		state.powerPlay = powerPlay;
		state.emptyNetPolls = emptyNet ? state.emptyNetPolls + 1 : 0;
	};

	const ingestStandings = (league: LeagueId, sportType: Game['sportType'], standings: unknown) => {
		stakesByLeague.set(league, readStandingsStakes(standings, league, sportType));
	};

	const fantasyFor = (game: Game, state: GameExtras | undefined): FantasyPlayerState[] => rosterInGame(roster, game).map(player => {
		const id = player.position === 'DST' ? `dst:${player.teamId}` : player.athleteId;
		const side: Side = player.teamId === game.homeTeam.id ? 'home' : 'away';
		const batter = game.atBat?.batter?.name;
		const pitcher = game.atBat?.pitcher?.name;
		const role = batter === player.name ? 'atBat' : pitcher === player.name ? 'pitching' : undefined;
		const events = state?.fantasyEvents.get(id);
		return {
			id,
			name: player.name,
			side,
			position: player.position,
			...(state?.fantasyInactive.has(id) ? { active: false } : {}),
			...(role ? { role } : {}),
			...(events ? { pointEvents: events } : {}),
		};
	});

	const contextFor = (game: Game, now: number): Partial<ScoringContext> => {
		const state = games.get(game.id);
		const fantasy = roster.length > 0 ? fantasyFor(game, state) : [];
		const leagueStakes = stakesByLeague.get(game.league);
		const homeStakes = leagueStakes?.get(game.homeTeam.id);
		const awayStakes = leagueStakes?.get(game.awayTeam.id);
		const leadChanges = state ? recentLeadChanges(game, state, now) : undefined;
		return {
			...(state?.pregameLine ? { pregameLine: state.pregameLine } : {}),
			...(homeStakes || awayStakes ? { stakes: { ...(homeStakes ? { home: homeStakes } : {}), ...(awayStakes ? { away: awayStakes } : {}) } } : {}),
			...(state?.powerPlay ? { powerPlay: true } : {}),
			// Two polls in a row: a goalie out for a delayed penalty is back within seconds.
			...(state && state.emptyNetPolls >= 2 ? { emptyNet: true } : {}),
			...(leadChanges ? { recentLeadChanges: leadChanges } : {}),
			...(fantasy.length > 0 ? { fantasy } : {}),
		};
	};

	const forget = (gameId: string) => games.delete(gameId);

	return { ingestSummary, ingestSituation, ingestStandings, contextFor, forget, setRoster, setFantasyScoring };
};

export type LiveExtras = ReturnType<typeof createLiveExtras>;
