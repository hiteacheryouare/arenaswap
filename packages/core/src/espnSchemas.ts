import * as z from 'zod/mini';

// ESPN is inconsistent about whether a numeric-looking field arrives as a JSON number or a
// quoted string, and it varies by sport and by endpoint. Anything we ultimately read as text
// accepts both shapes and normalizes to a string so one sport's encoding can't reject an event.
const espnNumericText = z.pipe(z.union([z.string(), z.number()]), z.transform(String));

const EspnLeagueLogoSchema = z.object({
	href: z.optional(z.string()),
	rel: z.optional(z.array(z.string())),
});

const EspnLeagueSchema = z.object({
	id: z.optional(z.string()),
	logos: z.optional(z.array(EspnLeagueLogoSchema)),
});

const EspnTeamSchema = z.object({
	displayName: z.string(),
	// The nickname on its own: "Titans", "Nittany Lions". `shortDisplayName` is the school in
	// college and the nickname in the pros, so it is the wrong field to reach for.
	name: z.optional(z.string()),
	abbreviation: z.optional(z.string()),
	logo: z.optional(z.string()),
	color: z.optional(z.string()),
	alternateColor: z.optional(z.string()),
});

const EspnAthleteRefSchema = z.object({
	displayName: z.optional(z.string()),
	shortName: z.optional(z.string()),
	jersey: z.optional(espnNumericText),
	headshot: z.optional(z.string()),
});

// Baseball sends `probableStartingPitcher`, hockey `probableStartingGoalie`, and no other sport
// sends anything here. `record` is the athlete's own line, pre-formatted by ESPN as "(7-7, 5.17)"
// for a pitcher and always empty for a goalie. `status` is hockey-only.
const EspnProbableSchema = z.object({
	name: z.optional(z.string()),
	athlete: z.optional(EspnAthleteRefSchema),
	record: z.optional(z.string()),
	status: z.optional(z.object({ type: z.optional(z.string()) })),
	// Declared but unread: a pitcher's W/L/ERA already arrives assembled in `record`, and whether
	// a goalie carries GAA here cannot be checked until the NHL season starts.
	statistics: z.optional(z.catch(z.array(z.object({
		name: z.optional(z.string()),
		abbreviation: z.optional(z.string()),
		displayValue: z.optional(espnNumericText),
	})), [])),
});

// `type` is open-ended: `total` in most leagues, `ytd` in the NHL, `standingsoverall` in the AFL,
// alongside `home`, `road`, `vsconf`, `homerecord` and `awayrecord`.
const EspnRecordEntrySchema = z.object({
	name: z.optional(z.string()),
	type: z.optional(z.string()),
	summary: z.optional(z.string()),
	displayValue: z.optional(z.string()),
});

const EspnLeaderCategorySchema = z.object({
	name: z.optional(z.string()),
	shortDisplayName: z.optional(z.string()),
	abbreviation: z.optional(z.string()),
	leaders: z.optional(z.catch(z.array(z.object({
		displayValue: z.optional(espnNumericText),
		athlete: z.optional(EspnAthleteRefSchema),
	})), [])),
});

const EspnCompetitorSchema = z.object({
	id: espnNumericText,
	homeAway: z.string(),
	score: z.optional(espnNumericText),
	// Soccer shootouts only, where `score` stays frozen at the 120-minute scoreline.
	shootoutScore: z.optional(z.number()),
	team: EspnTeamSchema,
	probables: z.optional(z.catch(z.array(EspnProbableSchema), [])),
	records: z.optional(z.catch(z.array(EspnRecordEntrySchema), [])),
	// `.catch` sits on the array rather than the row because cricket returns a `$ref` string here
	// where every other sport returns an array. Not a league we ship, but adding one must not be
	// able to take the whole competitor down with it.
	leaders: z.optional(z.catch(z.array(EspnLeaderCategorySchema), [])),
});

const EspnCompetitionStatusSchema = z.object({
	period: z.optional(z.number()),
	displayClock: z.optional(z.string()),
	type: z.optional(z.object({
		state: z.optional(z.string()),
		name: z.optional(z.string()),
		description: z.optional(z.string()),
		shortDetail: z.optional(z.string()),
	})),
});

// `yardLine` here and on the drive is an absolute field coordinate: 0 is the home team's own goal
// line and 100 is the away team's, whichever team is holding the ball. So the home offense drives
// toward 100 and the away offense toward 0 — verified against ESPN's own drive yardage, which
// equals `yardLine - drive.start.yardLine` for a home drive and the negation of it for an away one.
const EspnDriveSchema = z.object({
	start: z.optional(z.object({ yardLine: z.optional(z.number()) })),
});

const EspnLastPlaySchema = z.object({
	team: z.optional(z.object({ id: z.optional(espnNumericText) })),
	drive: z.optional(EspnDriveSchema),
});

const EspnSituationSchema = z.object({
	onFirst: z.optional(z.boolean()),
	onSecond: z.optional(z.boolean()),
	onThird: z.optional(z.boolean()),
	balls: z.optional(z.number()),
	strikes: z.optional(z.number()),
	outs: z.optional(z.number()),
	down: z.optional(z.number()),
	distance: z.optional(z.number()),
	yardLine: z.optional(z.number()),
	isRedZone: z.optional(z.boolean()),
	shortDownDistanceText: z.optional(z.string()),
	// ESPN also ships these pre-joined into `downDistanceText`, but that string is English-only,
	// so the halves are read separately and joined through the locale files.
	possessionText: z.optional(z.string()),
	// The team id holding the ball. Dropped at every dead ball — timeouts, the end of a period —
	// while `yardLine` survives, so the field diagram falls back to `lastPlay.team`.
	possession: z.optional(espnNumericText),
	lastPlay: z.optional(EspnLastPlaySchema),
});

// ESPN is not consistent about `state`: the NFL and NHL send abbreviations, MLB sends full names,
// and leagues outside North America send no state at all and lean on `country` instead.
const EspnVenueAddressSchema = z.object({
	city: z.optional(z.string()),
	state: z.optional(z.string()),
	country: z.optional(z.string()),
});

const EspnCompetitionVenueSchema = z.object({
	fullName: z.optional(z.string()),
	name: z.optional(z.string()),
	address: z.optional(EspnVenueAddressSchema),
	indoor: z.optional(z.boolean()),
});

const EspnWeatherSchema = z.object({
	displayValue: z.optional(z.string()),
	temperature: z.optional(z.number()),
	highTemperature: z.optional(z.number()),
	conditionId: z.optional(z.string()),
});

const EspnCompetitionBroadcastSchema = z.object({
	names: z.optional(z.array(z.string())),
});

const EspnCompetitionGeoBroadcastSchema = z.object({
	media: z.optional(z.object({
		shortName: z.optional(z.string()),
	})),
});

const EspnOddsProviderLogoSchema = z.object({
	href: z.optional(z.string()),
	rel: z.optional(z.array(z.string())),
});

const EspnOddsProviderSchema = z.object({
	name: z.optional(z.string()),
	displayName: z.optional(z.string()),
	logos: z.optional(z.array(EspnOddsProviderLogoSchema)),
});

const EspnCompetitionOddsSchema = z.object({
	details: z.optional(z.string()),
	overUnder: z.optional(z.union([z.number(), z.string()])),
	provider: z.optional(EspnOddsProviderSchema),
});

// Where the Olympics record which round a game belongs to, and where the US leagues record it for
// grading — see resolvePostseason and gradePostseason. `type` is `'event'` on every round-bearing
// note sampled; zod strips undeclared keys, so it has to be declared to be readable at all.
const EspnCompetitionNoteSchema = z.object({
	type: z.optional(z.string()),
	headline: z.optional(z.string()),
});

const EspnCompetitionSchema = z.object({
	competitors: z.array(EspnCompetitorSchema),
	status: EspnCompetitionStatusSchema,
	// Present on every state, but 0 until the game is final — ESPN fills the real figure in at the
	// same time it flips the status. So the gate is a positive number, not a present key.
	attendance: z.optional(z.number()),
	situation: z.optional(EspnSituationSchema),
	venue: z.optional(EspnCompetitionVenueSchema),
	broadcasts: z.optional(z.array(EspnCompetitionBroadcastSchema)),
	geoBroadcasts: z.optional(z.array(EspnCompetitionGeoBroadcastSchema)),
	odds: z.optional(z.array(z.nullable(EspnCompetitionOddsSchema))),
	notes: z.optional(z.array(EspnCompetitionNoteSchema)),
});

const EspnSeasonSchema = z.object({
	year: z.optional(z.number()),
	type: z.optional(z.number()),
	slug: z.optional(z.string()),
});

export const EspnEventSchema = z.object({
	id: espnNumericText,
	date: z.optional(z.string()),
	status: z.optional(z.object({
		type: z.optional(z.object({
			state: z.optional(z.string()),
		})),
	})),
	season: z.optional(EspnSeasonSchema),
	competitions: z.array(EspnCompetitionSchema),
	weather: z.optional(EspnWeatherSchema),
});

// The scoreboard envelope only. `events` is deliberately left unvalidated here so a single bad
// row can't take the whole payload down — see parseScoreboard.
const EspnScoreboardShellSchema = z.object({
	events: z.optional(z.array(z.unknown())),
	leagues: z.optional(z.catch(z.array(EspnLeagueSchema), [])),
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
export const EspnSummarySchema = z.object({
	winprobability: z.optional(z.array(
		z.catch(z.object({ homeWinPercentage: z.optional(z.number()) }), {}),
	)),
});

// The teams envelope only, salvaged row by row for the same reason the scoreboard is: one
// non-conforming row used to empty the whole league, and fetchTeamsForLeagues cannot tell that
// apart from a league with no teams — so the onboarding picker offered nothing to pick.
const EspnTeamsShellSchema = z.object({
	sports: z.optional(z.array(z.object({
		leagues: z.optional(z.array(z.object({
			teams: z.optional(z.array(z.unknown())),
		}))),
	}))),
});

const EspnTeamsRowSchema = z.object({
	team: z.object({
		id: z.string(),
		displayName: z.string(),
		abbreviation: z.optional(z.string()),
		// `rel` names the variant — `default`, `dark`, `primary_logo_white` and a dozen more. Zod
		// strips what a schema does not declare, so leaving it off made every variant look alike and
		// there was no way to ask for the white one.
		logos: z.optional(z.array(z.object({
			href: z.string(),
			rel: z.optional(z.array(z.string())),
		}))),
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

export type EspnLeagueLogo = z.infer<typeof EspnLeagueLogoSchema>;
export type EspnLeague = z.infer<typeof EspnLeagueSchema>;
export type EspnTeam = z.infer<typeof EspnTeamSchema>;
export type EspnAthleteRef = z.infer<typeof EspnAthleteRefSchema>;
export type EspnProbable = z.infer<typeof EspnProbableSchema>;
export type EspnRecordEntry = z.infer<typeof EspnRecordEntrySchema>;
export type EspnLeaderCategory = z.infer<typeof EspnLeaderCategorySchema>;
export type EspnCompetitor = z.infer<typeof EspnCompetitorSchema>;
export type EspnCompetitionStatus = z.infer<typeof EspnCompetitionStatusSchema>;
export type EspnSituation = z.infer<typeof EspnSituationSchema>;
export type EspnCompetitionVenue = z.infer<typeof EspnCompetitionVenueSchema>;
export type EspnVenueAddress = z.infer<typeof EspnVenueAddressSchema>;
export type EspnCompetitionBroadcast = z.infer<typeof EspnCompetitionBroadcastSchema>;
export type EspnCompetitionGeoBroadcast = z.infer<typeof EspnCompetitionGeoBroadcastSchema>;
export type EspnOddsProviderLogo = z.infer<typeof EspnOddsProviderLogoSchema>;
export type EspnOddsProvider = z.infer<typeof EspnOddsProviderSchema>;
export type EspnCompetitionOdds = z.infer<typeof EspnCompetitionOddsSchema>;
export type EspnCompetitionNote = z.infer<typeof EspnCompetitionNoteSchema>;
export type EspnWeather = z.infer<typeof EspnWeatherSchema>;
export type EspnSeason = z.infer<typeof EspnSeasonSchema>;
export type EspnCompetition = z.infer<typeof EspnCompetitionSchema>;
export type EspnEvent = z.infer<typeof EspnEventSchema>;
export type EspnTeamsRow = z.infer<typeof EspnTeamsRowSchema>;
