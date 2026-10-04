import * as z from 'zod/mini';
import type { FantasyPosition } from 'powerscore';
import { isLeagueId } from './constants';
import type { Game, LeagueId } from './types';

// One rostered player, or a team defense (athleteId `dst:<teamId>`, position 'DST').
export interface FantasyRosterEntry {
	league: LeagueId;
	athleteId: string;
	name: string;
	teamId: string;
	position: FantasyPosition;
}

export const fantasyRosterLimit = 50;
export const fantasyRosterStorageKey = 'fantasyRoster';

const positions: readonly FantasyPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'P', 'H', 'player'];

export const normalizeFantasyRoster = (stored: unknown): FantasyRosterEntry[] => {
	if (!Array.isArray(stored)) return [];
	const seen = new Set<string>();
	const roster: FantasyRosterEntry[] = [];
	for (const entry of stored as Partial<FantasyRosterEntry>[]) {
		if (!entry || typeof entry !== 'object') continue;
		const { league, athleteId, name, teamId, position } = entry;
		if (!isLeagueId(league) || typeof athleteId !== 'string' || typeof name !== 'string' || typeof teamId !== 'string') continue;
		if (!positions.includes(position as FantasyPosition)) continue;
		const key = `${league}:${athleteId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		roster.push({ league, athleteId, name: name.slice(0, 60), teamId, position: position as FantasyPosition });
		if (roster.length >= fantasyRosterLimit) break;
	}
	return roster;
};

export const rosterInGame = (roster: readonly FantasyRosterEntry[], game: Pick<Game, 'league' | 'homeTeam' | 'awayTeam'>): FantasyRosterEntry[] => (
	roster.filter(entry => entry.league === game.league && (entry.teamId === game.homeTeam.id || entry.teamId === game.awayTeam.id))
);

const InjuriesSchema = z.object({
	injuries: z.catch(z.optional(z.array(z.object({
		injuries: z.optional(z.array(z.object({
			type: z.optional(z.object({ name: z.optional(z.string()) })),
			athlete: z.optional(z.object({ id: z.optional(z.union([z.string(), z.number()])) })),
		}))),
	}))), undefined),
});

const BoxScorePlayersSchema = z.object({
	boxscore: z.catch(z.optional(z.object({
		players: z.optional(z.array(z.object({
			team: z.optional(z.object({ id: z.optional(z.union([z.string(), z.number()])) })),
			statistics: z.optional(z.array(z.object({
				name: z.optional(z.string()),
				keys: z.optional(z.array(z.string())),
				athletes: z.optional(z.array(z.object({
					athlete: z.optional(z.object({ id: z.optional(z.union([z.string(), z.number()])) })),
					stats: z.optional(z.array(z.string())),
					didNotPlay: z.optional(z.boolean()),
				}))),
			}))),
		}))),
	})), undefined),
});

const toNumber = (value: string | undefined): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

// "18/27" or "1-3" as made and attempted.
const madeAttempted = (value: string | undefined): [number, number] => {
	const [made, attempted] = (value ?? '').split(/[/-]/).map(toNumber);
	return [made ?? 0, attempted ?? 0];
};

// "6.2" innings pitched as outs.
const outsFromInnings = (value: string | undefined): number => {
	const [full, part] = (value ?? '0').split('.').map(toNumber);
	return (full ?? 0) * 3 + (part ?? 0);
};

type StatLine = Record<string, number>;

const add = (line: StatLine, key: string, value: number) => {
	if (value) line[key] = (line[key] ?? 0) + value;
};

// One box-score row into the engine's neutral stat names. Football field goals arrive without
// distances, so every make scores at the base tier.
const readRow = (category: string | undefined, keys: readonly string[], stats: readonly string[], line: StatLine, defense: StatLine) => {
	const at = (key: string) => stats[keys.indexOf(key)];
	const has = (key: string) => keys.includes(key);
	if (has('completions/passingAttempts')) {
		add(line, 'passingYards', toNumber(at('passingYards')));
		add(line, 'passingTouchdowns', toNumber(at('passingTouchdowns')));
		add(line, 'interceptionsThrown', toNumber(at('interceptions')));
	} else if (has('rushingAttempts')) {
		add(line, 'rushingYards', toNumber(at('rushingYards')));
		add(line, 'rushingTouchdowns', toNumber(at('rushingTouchdowns')));
	} else if (has('receptions') && has('receivingYards')) {
		add(line, 'receptions', toNumber(at('receptions')));
		add(line, 'receivingYards', toNumber(at('receivingYards')));
		add(line, 'receivingTouchdowns', toNumber(at('receivingTouchdowns')));
	} else if (has('fumblesLost')) {
		add(line, 'fumblesLost', toNumber(at('fumblesLost')));
		add(defense, 'takeaways', toNumber(at('fumblesRecovered')));
	} else if (category === 'defensive') {
		add(defense, 'sacks', toNumber(at('sacks')));
		add(defense, 'defensiveTouchdowns', toNumber(at('defensiveTouchdowns')));
	} else if (category === 'interceptions') {
		add(defense, 'takeaways', toNumber(at('interceptions')));
		add(defense, 'defensiveTouchdowns', toNumber(at('interceptionTouchdowns')));
	} else if (has('kickReturnTouchdowns') || has('puntReturnTouchdowns')) {
		const returns = toNumber(at('kickReturnTouchdowns')) + toNumber(at('puntReturnTouchdowns'));
		add(line, 'returnTouchdowns', returns);
		add(defense, 'defensiveTouchdowns', returns);
	} else if (has('fieldGoalsMade/fieldGoalAttempts')) {
		const [fieldGoals, fieldGoalTries] = madeAttempted(at('fieldGoalsMade/fieldGoalAttempts'));
		const [extraPoints, extraPointTries] = madeAttempted(at('extraPointsMade/extraPointAttempts'));
		add(line, 'fieldGoals0To39', fieldGoals);
		add(line, 'fieldGoalsMissed', fieldGoalTries - fieldGoals);
		add(line, 'extraPointsMade', extraPoints);
		add(line, 'extraPointsMissed', extraPointTries - extraPoints);
	} else if (has('hits-atBats')) {
		const hits = toNumber(at('hits'));
		// No doubles or triples in the line, so total bases count home runs as four.
		add(line, 'totalBases', hits + 3 * toNumber(at('homeRuns')));
		add(line, 'runs', toNumber(at('runs')));
		add(line, 'runsBattedIn', toNumber(at('RBIs')));
		add(line, 'walks', toNumber(at('walks')));
		add(line, 'strikeouts', toNumber(at('strikeouts')));
	} else if (has('fullInnings.partInnings')) {
		add(line, 'outsRecorded', outsFromInnings(at('fullInnings.partInnings')));
		add(line, 'hitsAllowed', toNumber(at('hits')));
		add(line, 'earnedRuns', toNumber(at('earnedRuns')));
		add(line, 'walksAllowed', toNumber(at('walks')));
		add(line, 'pitcherStrikeouts', toNumber(at('strikeouts')));
	} else if (has('points') && has('rebounds')) {
		for (const key of ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers']) add(line, key, toNumber(at(key)));
	} else if (has('goalsAgainst') && has('saves')) {
		add(line, 'saves', toNumber(at('saves')));
		add(line, 'goalsAgainst', toNumber(at('goalsAgainst')));
	} else if (has('goals') && has('assists')) {
		add(line, 'goals', toNumber(at('goals')));
		add(line, 'assists', toNumber(at('assists')));
		add(line, 'shotsOnGoal', toNumber(at('shotsTotal')) - toNumber(at('shotsMissed')));
		add(line, 'blockedShots', toNumber(at('blockedShots')));
		add(line, 'plusMinus', toNumber(at('plusMinus')));
	}
};

// The rules a box score lets us fill. The rest (two-point tries, long field goals, steals of a base,
// pitcher wins and saves, goalie wins) need play-by-play we don't read, so a settings screen hides them.
export const fantasyRulesRead: Record<'football' | 'basketball' | 'baseball' | 'hockey', readonly string[]> = {
	football: [
		'passingYards', 'passingTouchdowns', 'interceptionsThrown', 'rushingYards', 'rushingTouchdowns', 'receptions',
		'receivingYards', 'receivingTouchdowns', 'fumblesLost', 'returnTouchdowns', 'extraPointsMade', 'extraPointsMissed',
		'fieldGoals0To39', 'fieldGoalsMissed', 'sacks', 'takeaways', 'defensiveTouchdowns', 'pointsAllowed0', 'pointsAllowed1To6',
		'pointsAllowed7To13', 'pointsAllowed14To20', 'pointsAllowed21To27', 'pointsAllowed28To34', 'pointsAllowed35Plus',
	],
	basketball: ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers'],
	baseball: ['totalBases', 'runs', 'runsBattedIn', 'walks', 'strikeouts', 'outsRecorded', 'hitsAllowed', 'earnedRuns', 'walksAllowed', 'pitcherStrikeouts'],
	hockey: ['goals', 'assists', 'shotsOnGoal', 'blockedShots', 'plusMinus', 'saves', 'goalsAgainst'],
};

export interface FantasyBoxScore {
	// Neutral stat lines by athlete id, plus `dst:<teamId>` for each team's defense.
	lines: Map<string, StatLine>;
	// Athletes the box score marks as not playing, or the injury report lists as out.
	inactive: Set<string>;
	// Teams whose box score already lists players: anyone of theirs missing from it isn't playing.
	teamsWithLineups: Set<string>;
}

export const readFantasyBoxScore = (summary: unknown, game: Pick<Game, 'homeTeam' | 'awayTeam' | 'sportType'>): FantasyBoxScore => {
	const lines = new Map<string, StatLine>();
	const inactive = new Set<string>();
	const teamsWithLineups = new Set<string>();
	const injuries = InjuriesSchema.safeParse(summary);
	for (const team of (injuries.success ? injuries.data.injuries : undefined) ?? []) {
		for (const injury of team.injuries ?? []) {
			if (injury.type?.name === 'INJURY_STATUS_OUT' && injury.athlete?.id !== undefined) inactive.add(String(injury.athlete.id));
		}
	}
	const parsed = BoxScorePlayersSchema.safeParse(summary);
	if (!parsed.success) return { lines, inactive, teamsWithLineups };
	for (const team of parsed.data.boxscore?.players ?? []) {
		const teamId = String(team.team?.id ?? '');
		if (teamId && (team.statistics ?? []).some(category => (category.athletes ?? []).length > 0)) teamsWithLineups.add(teamId);
		const defense: StatLine = {};
		for (const category of team.statistics ?? []) {
			const keys = category.keys ?? [];
			for (const row of category.athletes ?? []) {
				const id = row.athlete?.id;
				if (id === undefined) continue;
				if (row.didNotPlay) inactive.add(String(id));
				const line = lines.get(String(id)) ?? {};
				readRow(category.name, keys, row.stats ?? [], line, defense);
				lines.set(String(id), line);
			}
		}
		if (game.sportType === 'football' && teamId) {
			const opponent = teamId === game.homeTeam.id ? game.awayTeam : game.homeTeam;
			lines.set(`dst:${teamId}`, { ...defense, pointsAllowed: opponent.score });
		}
	}
	return { lines, inactive, teamsWithLineups };
};
