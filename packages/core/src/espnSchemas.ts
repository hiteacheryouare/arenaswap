import { z as zod } from 'zod';

// ESPN is inconsistent about whether a numeric-looking field arrives as a JSON number or a
// quoted string, and it varies by sport and by endpoint. Anything we ultimately read as text
// accepts both shapes and normalizes to a string so one sport's encoding can't reject an event.
const espnNumericText = zod.union([zod.string(), zod.number()]).transform(String);

const EspnLeagueLogoSchema = zod.object({
	href: zod.string().optional(),
	rel: zod.array(zod.string()).optional(),
});

const EspnLeagueSchema = zod.object({
	id: zod.string().optional(),
	logos: zod.array(EspnLeagueLogoSchema).optional(),
});

const EspnTeamSchema = zod.object({
	displayName: zod.string(),
	abbreviation: zod.string().optional(),
	logo: zod.string().optional(),
	color: zod.string().optional(),
	alternateColor: zod.string().optional(),
});

const EspnCompetitorSchema = zod.object({
	id: espnNumericText,
	homeAway: zod.string(),
	score: espnNumericText.optional(),
	// Penalty-shootout tally. Present only on soccer matches that reached a shootout, where
	// `score` stays frozen at the 120-minute scoreline and this carries the actual decider.
	shootoutScore: zod.number().optional(),
	team: EspnTeamSchema,
});

const EspnCompetitionStatusSchema = zod.object({
	period: zod.number().optional(),
	displayClock: zod.string().optional(),
	type: zod.object({
		state: zod.string().optional(),
		name: zod.string().optional(),
		description: zod.string().optional(),
		shortDetail: zod.string().optional(),
	}).optional(),
});

const EspnSituationSchema = zod.object({
	onFirst: zod.boolean().optional(),
	onSecond: zod.boolean().optional(),
	onThird: zod.boolean().optional(),
	// Baseball live count
	balls: zod.number().optional(),
	strikes: zod.number().optional(),
	outs: zod.number().optional(),
	// Gridiron football
	down: zod.number().optional(),
	distance: zod.number().optional(),
	yardLine: zod.number().optional(),
	isRedZone: zod.boolean().optional(),
	shortDownDistanceText: zod.string().optional(),
});

const EspnCompetitionVenueSchema = zod.object({
	fullName: zod.string().optional(),
	name: zod.string().optional(),
	indoor: zod.boolean().optional(),
});

const EspnWeatherSchema = zod.object({
	displayValue: zod.string().optional(),
	temperature: zod.number().optional(),
	highTemperature: zod.number().optional(),
	conditionId: zod.string().optional(),
});

const EspnCompetitionBroadcastSchema = zod.object({
	names: zod.array(zod.string()).optional(),
});

const EspnCompetitionGeoBroadcastSchema = zod.object({
	media: zod.object({
		shortName: zod.string().optional(),
	}).optional(),
});

const EspnOddsProviderLogoSchema = zod.object({
	href: zod.string().optional(),
	rel: zod.array(zod.string()).optional(),
});

const EspnOddsProviderSchema = zod.object({
	name: zod.string().optional(),
	displayName: zod.string().optional(),
	logos: zod.array(EspnOddsProviderLogoSchema).optional(),
});

const EspnCompetitionOddsSchema = zod.object({
	details: zod.string().optional(),
	overUnder: zod.union([zod.number(), zod.string()]).optional(),
	provider: EspnOddsProviderSchema.optional(),
});

// Editorial display copy, e.g. "2024 Olympic Men's Basketball - Gold Medal Game". The only place
// the Olympics record which round a game belongs to — see resolvePostseason in apiClient.
const EspnCompetitionNoteSchema = zod.object({
	headline: zod.string().optional(),
});

const EspnCompetitionSchema = zod.object({
	competitors: zod.array(EspnCompetitorSchema),
	status: EspnCompetitionStatusSchema,
	situation: EspnSituationSchema.optional(),
	venue: EspnCompetitionVenueSchema.optional(),
	broadcasts: zod.array(EspnCompetitionBroadcastSchema).optional(),
	geoBroadcasts: zod.array(EspnCompetitionGeoBroadcastSchema).optional(),
	odds: zod.array(EspnCompetitionOddsSchema.nullable()).optional(),
	notes: zod.array(EspnCompetitionNoteSchema).optional(),
});

const EspnSeasonSchema = zod.object({
	year: zod.number().optional(),
	type: zod.number().optional(),
	slug: zod.string().optional(),
});

export const EspnEventSchema = zod.object({
	id: espnNumericText,
	date: zod.string().optional(),
	status: zod.object({
		type: zod.object({
			state: zod.string().optional(),
		}).optional(),
	}).optional(),
	season: EspnSeasonSchema.optional(),
	competitions: zod.array(EspnCompetitionSchema),
	weather: EspnWeatherSchema.optional(),
});

// The scoreboard envelope only. `events` is deliberately left unvalidated here so a single bad
// row can't take the whole payload down — see parseScoreboard.
const EspnScoreboardShellSchema = zod.object({
	events: zod.array(zod.unknown()).optional(),
	leagues: zod.array(EspnLeagueSchema).catch([]).optional(),
});

export interface EspnScoreboardResponse {
	events: EspnEvent[];
	leagues: EspnLeague[];
	/** Events ESPN returned that failed validation and were skipped. */
	droppedEvents: number;
}

/**
 * Parses a scoreboard payload one event at a time.
 *
 * ESPN routinely ships a single malformed row inside an otherwise healthy scoreboard — a TBD
 * bracket slot with no team name, a score encoded as a number instead of a string. Validating
 * `events` as one array would throw all of a league's games away for that one row, and because
 * an empty result is indistinguishable from "no games today" the league would then be demoted
 * to dormant polling with nothing to show for it. Each event is parsed on its own instead, and
 * only the bad ones are dropped.
 */
export const parseScoreboard = (raw: unknown): EspnScoreboardResponse => {
	const shell = EspnScoreboardShellSchema.safeParse(raw);
	if (!shell.success) return { events: [], leagues: [], droppedEvents: 0 };

	const events: EspnEvent[] = [];
	let droppedEvents = 0;
	for (const candidate of shell.data.events ?? []) {
		const parsed = EspnEventSchema.safeParse(candidate);
		if (parsed.success) events.push(parsed.data);
		else droppedEvents++;
	}

	return { events, leagues: shell.data.leagues ?? [], droppedEvents };
};


// The only part of the (very large) summary payload the scorer needs. A row that doesn't match
// degrades to an empty object rather than rejecting the whole win-probability line.
export const EspnSummarySchema = zod.object({
	winprobability: zod.array(
		zod.object({ homeWinPercentage: zod.number().optional() }).catch({}),
	).optional(),
});

export const EspnTeamsResponseSchema = zod.object({
	sports: zod.array(zod.object({
		leagues: zod.array(zod.object({
			teams: zod.array(zod.object({
				team: zod.object({
					id: zod.string(),
					displayName: zod.string(),
					abbreviation: zod.string().optional(),
					logos: zod.array(zod.object({ href: zod.string() })).optional(),
				}),
			})).optional(),
		})).optional(),
	})).optional(),
});

export type EspnLeagueLogo = zod.infer<typeof EspnLeagueLogoSchema>;
export type EspnLeague = zod.infer<typeof EspnLeagueSchema>;
export type EspnTeam = zod.infer<typeof EspnTeamSchema>;
export type EspnCompetitor = zod.infer<typeof EspnCompetitorSchema>;
export type EspnCompetitionStatus = zod.infer<typeof EspnCompetitionStatusSchema>;
export type EspnSituation = zod.infer<typeof EspnSituationSchema>;
export type EspnCompetitionVenue = zod.infer<typeof EspnCompetitionVenueSchema>;
export type EspnCompetitionBroadcast = zod.infer<typeof EspnCompetitionBroadcastSchema>;
export type EspnCompetitionGeoBroadcast = zod.infer<typeof EspnCompetitionGeoBroadcastSchema>;
export type EspnOddsProviderLogo = zod.infer<typeof EspnOddsProviderLogoSchema>;
export type EspnOddsProvider = zod.infer<typeof EspnOddsProviderSchema>;
export type EspnCompetitionOdds = zod.infer<typeof EspnCompetitionOddsSchema>;
export type EspnCompetitionNote = zod.infer<typeof EspnCompetitionNoteSchema>;
export type EspnWeather = zod.infer<typeof EspnWeatherSchema>;
export type EspnSeason = zod.infer<typeof EspnSeasonSchema>;
export type EspnCompetition = zod.infer<typeof EspnCompetitionSchema>;
export type EspnEvent = zod.infer<typeof EspnEventSchema>;
export type EspnTeamsResponse = zod.infer<typeof EspnTeamsResponseSchema>;
