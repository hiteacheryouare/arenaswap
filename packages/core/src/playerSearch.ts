import * as z from 'zod/mini';
import { takeRequestSlot } from './apiClient';
import { leagueConfigMap } from './constants';
import type { FantasyPosition } from 'powerscore';
import type { FantasyRosterEntry } from './fantasy';
import type { LeagueId } from './types';

// Fantasy's leagues, by the numeric league id our sources put in a player's uid (`s:20~l:28~a:…`).
const fantasyLeagueByUid: Record<string, LeagueId> = { 28: 'nfl', 46: 'nba', 10: 'mlb', 90: 'nhl', 59: 'wnba' };

export const fantasyLeagues: readonly LeagueId[] = Object.values(fantasyLeagueByUid);

export interface PlayerSearchResult {
	league: LeagueId;
	athleteId: string;
	name: string;
	// The team's display name, as our sources write it.
	teamName?: string;
	headshot?: string;
}

const SearchSchema = z.object({
	results: z.optional(z.array(z.object({
		type: z.optional(z.string()),
		contents: z.optional(z.array(z.object({
			uid: z.optional(z.string()),
			displayName: z.optional(z.string()),
			subtitle: z.optional(z.string()),
			image: z.optional(z.nullable(z.object({ default: z.optional(z.string()) }))),
		}))),
	}))),
});

export const foldName = (text: string): string => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

// One insertion, deletion, substitution or swap of neighbours apart, at most.
const withinOneEdit = (a: string, b: string): boolean => {
	if (Math.abs(a.length - b.length) > 1) return false;
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
	return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
};

// How well a name answers a query: every query word has to match a name word by prefix or, for
// words of five letters or more, within one typo. Higher is better; 0 is no match.
export const nameMatchScore = (query: string, name: string): number => {
	const words = foldName(name).split(/\s+/);
	const terms = foldName(query).split(/\s+/).filter(Boolean);
	if (terms.length === 0) return 0;
	let score = 0;
	for (const term of terms) {
		const exact = words.some(word => word === term);
		const prefix = words.some(word => word.startsWith(term));
		const typo = term.length >= 5 && words.some(word => withinOneEdit(word, term));
		if (!exact && !prefix && !typo) return 0;
		score += exact ? 3 : prefix ? 2 : 1;
	}
	return score;
};

const parseUid = (uid: string | undefined): { league?: LeagueId; athleteId?: string } => {
	const league = /~l:(\d+)/.exec(uid ?? '')?.[1];
	const athleteId = /~a:(\d+)/.exec(uid ?? '')?.[1];
	return { league: league ? fantasyLeagueByUid[league] : undefined, athleteId };
};

export const parsePlayerSearch = (payload: unknown, query: string): PlayerSearchResult[] => {
	const parsed = SearchSchema.safeParse(payload);
	if (!parsed.success) return [];
	const players = (parsed.data.results ?? []).filter(result => result.type === 'player').flatMap(result => result.contents ?? []);
	return players
		.map(player => {
			const { league, athleteId } = parseUid(player.uid);
			if (!league || !athleteId || !player.displayName) return null;
			return {
				result: {
					league,
					athleteId,
					name: player.displayName,
					...(player.subtitle ? { teamName: player.subtitle } : {}),
					...(player.image?.default ? { headshot: player.image.default } : {}),
				},
				// The search already ranks well; a name that matches the words typed goes first.
				score: nameMatchScore(query, player.displayName),
			};
		})
		.filter((entry): entry is { result: PlayerSearchResult; score: number } => entry !== null)
		.toSorted((a, b) => b.score - a.score)
		.map(entry => entry.result);
};

export const searchPlayers = async (query: string, init?: { signal?: AbortSignal }): Promise<PlayerSearchResult[]> => {
	if (foldName(query).length < 2) return [];
	await takeRequestSlot();
	const res = await fetch(`https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}&limit=25`, { headers: { Accept: 'application/json' }, signal: init?.signal });
	if (!res.ok) throw new Error(`Player search failed: HTTP ${res.status}`);
	return parsePlayerSearch(await res.json(), query);
};

const AthleteSchema = z.object({
	position: z.optional(z.object({ abbreviation: z.optional(z.string()) })),
	team: z.optional(z.object({ $ref: z.optional(z.string()) })),
});

const footballPositions: Record<string, FantasyPosition> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', K: 'K', PK: 'K' };

export const toFantasyPosition = (league: LeagueId, abbreviation: string | undefined): FantasyPosition => {
	const sport = leagueConfigMap[league]?.sportType;
	if (sport === 'football') return footballPositions[abbreviation ?? ''] ?? 'player';
	if (sport === 'baseball') return abbreviation === 'SP' || abbreviation === 'RP' || abbreviation === 'P' ? 'P' : 'H';
	return 'player';
};

// The position and team a roster entry needs, read once when the player is added.
export const resolveRosterEntry = async (result: PlayerSearchResult): Promise<FantasyRosterEntry> => {
	const [sport, leaguePath] = leagueConfigMap[result.league].espnPath.split('/');
	await takeRequestSlot();
	const res = await fetch(`https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${leaguePath}/athletes/${result.athleteId}`, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`Could not look up ${result.name}: HTTP ${res.status}`);
	const parsed = AthleteSchema.safeParse(await res.json());
	const teamId = parsed.success ? /\/teams\/(\d+)/.exec(parsed.data.team?.$ref ?? '')?.[1] : undefined;
	if (!teamId) throw new Error(`${result.name} has no current team`);
	return {
		league: result.league,
		athleteId: result.athleteId,
		name: result.name,
		teamId,
		position: toFantasyPosition(result.league, parsed.success ? parsed.data.position?.abbreviation : undefined),
	};
};

// A team defense, for football rosters.
export const defenseRosterEntry = (league: LeagueId, team: { id: string; name: string }): FantasyRosterEntry => ({
	league,
	athleteId: `dst:${team.id}`,
	name: team.name,
	teamId: team.id,
	position: 'DST',
});
