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

const EspnAthleteRefSchema = zod.object({
	displayName: zod.string().optional(),
	shortName: zod.string().optional(),
	jersey: espnNumericText.optional(),
	headshot: zod.string().optional(),
});

// Baseball sends `probableStartingPitcher`, hockey `probableStartingGoalie`, and no other sport
// sends anything here. `record` is the athlete's own line, pre-formatted by ESPN as "(7-7, 5.17)"
// for a pitcher and always empty for a goalie. `status` is hockey-only.
const EspnProbableSchema = zod.object({
	name: zod.string().optional(),
	athlete: EspnAthleteRefSchema.optional(),
	record: zod.string().optional(),
	status: zod.object({ type: zod.string().optional() }).optional(),
	// Declared but unread: a pitcher's W/L/ERA already arrives assembled in `record`, and whether
	// a goalie carries GAA here cannot be checked until the NHL season starts.
	statistics: zod.array(zod.object({
		name: zod.string().optional(),
		abbreviation: zod.string().optional(),
		displayValue: espnNumericText.optional(),
	})).catch([]).optional(),
});

// `type` is open-ended: `total` in most leagues, `ytd` in the NHL, `standingsoverall` in the AFL,
// alongside `home`, `road`, `vsconf`, `homerecord` and `awayrecord`.
const EspnRecordEntrySchema = zod.object({
	name: zod.string().optional(),
	type: zod.string().optional(),
	summary: zod.string().optional(),
	displayValue: zod.string().optional(),
});

const EspnLeaderCategorySchema = zod.object({
	name: zod.string().optional(),
	shortDisplayName: zod.string().optional(),
	abbreviation: zod.string().optional(),
	leaders: zod.array(zod.object({
		displayValue: espnNumericText.optional(),
		athlete: EspnAthleteRefSchema.optional(),
	})).catch([]).optional(),
});

const EspnCompetitorSchema = zod.object({
	id: espnNumericText,
	homeAway: zod.string(),
	score: espnNumericText.optional(),
	// Soccer shootouts only, where `score` stays frozen at the 120-minute scoreline.
	shootoutScore: zod.number().optional(),
	team: EspnTeamSchema,
	probables: zod.array(EspnProbableSchema).catch([]).optional(),
	records: zod.array(EspnRecordEntrySchema).catch([]).optional(),
	// `.catch` sits on the array rather than the row because cricket returns a `$ref` string here
	// where every other sport returns an array. Not a league we ship, but adding one must not be
	// able to take the whole competitor down with it.
	leaders: zod.array(EspnLeaderCategorySchema).catch([]).optional(),
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
	balls: zod.number().optional(),
	strikes: zod.number().optional(),
	outs: zod.number().optional(),
	down: zod.number().optional(),
	distance: zod.number().optional(),
	yardLine: zod.number().optional(),
	isRedZone: zod.boolean().optional(),
	shortDownDistanceText: zod.string().optional(),
	// ESPN also ships these pre-joined into `downDistanceText`, but that string is English-only,
	// so the halves are read separately and joined through the locale files.
	possessionText: zod.string().optional(),
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

// The only place the Olympics record which round a game belongs to — see resolvePostseason.
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
	droppedEvents: number;
}

// ESPN routinely ships one malformed row inside an otherwise healthy scoreboard. Validating
// `events` as a single array would throw a whole league's games away for that one row, and since
// an empty result is indistinguishable from "no games today" the league would then be demoted to
// dormant polling with nothing to show for it.
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

// The teams envelope only, salvaged row by row for the same reason the scoreboard is: one
// non-conforming row used to empty the whole league, and fetchTeamsForLeagues cannot tell that
// apart from a league with no teams — so the onboarding picker offered nothing to pick.
const EspnTeamsShellSchema = zod.object({
	sports: zod.array(zod.object({
		leagues: zod.array(zod.object({
			teams: zod.array(zod.unknown()).optional(),
		})).optional(),
	})).optional(),
});

const EspnTeamsRowSchema = zod.object({
	team: zod.object({
		id: zod.string(),
		displayName: zod.string(),
		abbreviation: zod.string().optional(),
		logos: zod.array(zod.object({ href: zod.string() })).optional(),
	}),
});

export interface EspnTeamsResult {
	teams: EspnTeamsRow[];
	droppedTeams: number;
}

export const parseTeams = (raw: unknown): EspnTeamsResult => {
	const shell = EspnTeamsShellSchema.safeParse(raw);
	if (!shell.success) return { teams: [], droppedTeams: 0 };

	const teams: EspnTeamsRow[] = [];
	let droppedTeams = 0;
	for (const candidate of shell.data.sports?.[0]?.leagues?.[0]?.teams ?? []) {
		const parsed = EspnTeamsRowSchema.safeParse(candidate);
		if (parsed.success) teams.push(parsed.data);
		else droppedTeams++;
	}

	return { teams, droppedTeams };
};

export type EspnLeagueLogo = zod.infer<typeof EspnLeagueLogoSchema>;
export type EspnLeague = zod.infer<typeof EspnLeagueSchema>;
export type EspnTeam = zod.infer<typeof EspnTeamSchema>;
export type EspnAthleteRef = zod.infer<typeof EspnAthleteRefSchema>;
export type EspnProbable = zod.infer<typeof EspnProbableSchema>;
export type EspnRecordEntry = zod.infer<typeof EspnRecordEntrySchema>;
export type EspnLeaderCategory = zod.infer<typeof EspnLeaderCategorySchema>;
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
export type EspnTeamsRow = zod.infer<typeof EspnTeamsRowSchema>;
