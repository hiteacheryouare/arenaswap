import { z as zod } from 'zod';

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
	id: zod.string(),
	homeAway: zod.string(),
	score: zod.string().optional(),
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

const EspnCompetitionSchema = zod.object({
	competitors: zod.array(EspnCompetitorSchema),
	status: EspnCompetitionStatusSchema,
	situation: EspnSituationSchema.optional(),
	venue: EspnCompetitionVenueSchema.optional(),
	broadcasts: zod.array(EspnCompetitionBroadcastSchema).optional(),
	geoBroadcasts: zod.array(EspnCompetitionGeoBroadcastSchema).optional(),
	odds: zod.array(EspnCompetitionOddsSchema.nullable()).optional(),
});

const EspnSeasonSchema = zod.object({
	year: zod.number().optional(),
	type: zod.number().optional(),
	slug: zod.string().optional(),
});

const EspnEventSchema = zod.object({
	id: zod.string(),
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

export const EspnScoreboardSchema = zod.object({
	events: zod.array(EspnEventSchema).optional(),
	leagues: zod.array(EspnLeagueSchema).optional(),
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
export type EspnWeather = zod.infer<typeof EspnWeatherSchema>;
export type EspnSeason = zod.infer<typeof EspnSeasonSchema>;
export type EspnCompetition = zod.infer<typeof EspnCompetitionSchema>;
export type EspnEvent = zod.infer<typeof EspnEventSchema>;
export type EspnScoreboardResponse = zod.infer<typeof EspnScoreboardSchema>;
export type EspnTeamsResponse = zod.infer<typeof EspnTeamsResponseSchema>;
