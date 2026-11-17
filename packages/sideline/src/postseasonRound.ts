import type { LeagueId } from '@arenaswap/core';

export type PostseasonRound = 0 | 1 | 2 | 3;

const earliestRound: PostseasonRound = 3;

// ESPN puts the round in `competition.notes[].headline` for the US leagues, and the note carries
// `type: 'event'`. Regular-season oddities (an NFL London game) also carry a typed note with no
// round in it, so the headline is only ever trusted for grading a game we already know is
// postseason — never as a postseason detector on its own.
export const readEventHeadline = (notes: { type?: string; headline?: string }[] | undefined): string | undefined => {
	if (!notes) return undefined;
	const typed = notes.find(n => n.type === 'event' && n.headline?.trim());
	const any = notes.find(n => n.headline?.trim());
	return (typed ?? any)?.headline?.trim() || undefined;
};

// A scheduling note ESPN sends through the same field as the round: the real string is
// "NCAA Baseball Championship - Atlanta Regional Rescheduled from 5/29". It names no round and must
// not be printed as one.
const schedulingNotePattern = /\brescheduled from\b/i;

const redundantPrefixes: RegExp[] = [
	/^College Football Playoff\s*[-–]?\s*/i,
	/^NCAA (?:Men|Women)'s Basketball Championship\s*[-–]?\s*/i,
	/^NCAA (?:Men|Women)'s (?:Ice )?Hockey(?: Championship)?\s*[-–]?\s*/i,
	/^(?:Men|Women)'s College World Series\s*[-–]?\s*/i,
	/^NCAA (?:Baseball|Softball) Championship\s*[-–]?\s*/i,
	/^\d{4} World Baseball Classic\s*[-–]?\s*/i,
	/^\d{4} Olympic (?:Men|Women)'s \w+\s*[-–]?\s*/i,
	/^Milano Cortina \d{4} (?:Men|Women)'s Hockey\s*[-–]?\s*/i,
	/^UFL\s+/i,
	/^WNBA\s+/i,
];

const segmentJoin = /\s+[-–]\s+/g;
const venueJoin = /\s+at the\s+/gi;

export const reduceEventName = (headline: string | undefined): string | undefined => {
	const raw = headline?.trim();
	if (!raw || schedulingNotePattern.test(raw)) return undefined;

	let name = raw;
	for (const prefix of redundantPrefixes) {
		const stripped = name.replace(prefix, '');
		if (stripped !== name) {
			name = stripped;
			break;
		}
	}

	name = name.replace(segmentJoin, ' · ').replace(venueJoin, ' · ').replace(/\s{2,}/g, ' ').trim();
	return name || undefined;
};

const proBowlPattern = /\bpro bowl\b/i;
// The CFP names its own rounds. ~26 sponsor-named bowls do not, so absence of a round signal is
// what identifies a bowl, rather than a list of bowl names that changes every year.
const collegeFootballPlayoffPattern = /\bcollege football playoff\b|\bnational championship\b/i;
const womensNitPattern = /\bwomen's nit\b/i;
const sideTrophyPattern = /^(?:nit|wbit|college basketball crown)\b/i;

const isChampionshipRoundOfItsOwnBracket = (round: PostseasonRound | undefined): boolean => round === 0;

const roundRules: { pattern: RegExp; round: PostseasonRound }[] = [
	{ pattern: /\belite 8\b/i, round: 2 },
	{ pattern: /\bregional final\b/i, round: 2 },
	{ pattern: /\bregional semifinal\b/i, round: 3 },
	{ pattern: /\bregional\b/i, round: earliestRound },

	{ pattern: /\bnational championship\b/i, round: 0 },
	{ pattern: /\bsuper bowl\b/i, round: 0 },
	{ pattern: /\bunited bowl\b/i, round: 0 },
	{ pattern: /\bstanley cup final/i, round: 0 },
	{ pattern: /\bmls cup\b/i, round: 0 },
	{ pattern: /\bgold medal\b/i, round: 0 },
	{ pattern: /\bbronze medal\b/i, round: 1 },
	{ pattern: /\bworld series\b/i, round: 0 },
	{ pattern: /\b(?:al|nl)cs\b/i, round: 1 },
	{ pattern: /\b(?:american|national) league championship series\b/i, round: 1 },
	{ pattern: /^(?:afc|nfc)\s+championship\b/i, round: 1 },
	{ pattern: /\b(?:al|nl)ds\b/i, round: 2 },
	{ pattern: /\b(?:american|national) league division series\b/i, round: 2 },
	{ pattern: /^division series\b/i, round: 2 },
	{ pattern: /\bchampionship (?:series|final|finals|game)\b/i, round: 0 },

	{ pattern: /\bfinal four\b/i, round: 1 },
	{ pattern: /\bfrozen four\b/i, round: 1 },
	{ pattern: /^(?:east|west|eastern|western)\s+(?:conference\s+)?finals?\b/i, round: 1 },
	{ pattern: /^(?:east|west|eastern|western)\s+(?:conference\s+)?semi-?finals?\b/i, round: 2 },
	{ pattern: /\bsemi-?finals?\b/i, round: 1 },

	{ pattern: /\bdivisional\b/i, round: 2 },
	{ pattern: /\bquarter-?finals?\b/i, round: 2 },
	{ pattern: /\bregion\b.*\b(?:2nd|second) round\b/i, round: earliestRound },
	{ pattern: /\b(?:2nd|second) round\b/i, round: 2 },

	{ pattern: /\bsweet 16\b/i, round: earliestRound },
	{ pattern: /\bfirst four\b/i, round: earliestRound },
	{ pattern: /\b(?:alwc|nlwc)\b/i, round: earliestRound },
	{ pattern: /\bwild card\b/i, round: earliestRound },
	{ pattern: /\b(?:1st|first|3rd|third|4th|fourth) round\b/i, round: earliestRound },

	{ pattern: /\bfinals?\b/i, round: 0 },
	{ pattern: /\bchampionship\b/i, round: 0 },
];

const seriesGameSuffix = /\s*[-–]\s*game\s+\d+\s*$/i;

export const resolveRoundFromHeadline = (headline: string | undefined): PostseasonRound | undefined => {
	const phrase = headline?.trim().replace(seriesGameSuffix, '');
	if (!phrase) return undefined;
	return roundRules.find(r => r.pattern.test(phrase))?.round;
};

// NCAA baseball and softball are the one family that grades off `season.type` rather than off text.
// ESPN gives them a type per stage — 3 Regionals, 4 Super Regionals, 5 the College World Series,
// 6 the Championship Series — which tracks the field shrinking 64 → 16 → 8 → 2. The headline cannot
// do this job: every CWS string contains the words "World Series", including the opening
// double-elimination games that are three rounds from the trophy.
const collegeBaseballRounds: Record<number, PostseasonRound> = { 3: earliestRound, 4: 2, 5: 1, 6: 0 };
export const collegeBaseballLeagues = new Set<LeagueId>(['cbase', 'csoft']);

// The soccer family carries the round in `season.slug`, and its notes are aggregate and penalty
// results rather than round names, so the slug is the only usable signal there.
const soccerSlugRounds: { pattern: RegExp; round: PostseasonRound }[] = [
	{ pattern: /conference.*semi-?finals?$/, round: 2 },
	{ pattern: /conference.*finals?$/, round: 1 },
	{ pattern: /semi-?finals?$/, round: 1 },
	{ pattern: /quarter-?finals?$/, round: 2 },
	{ pattern: /round-of-16$/, round: earliestRound },
	{ pattern: /round-of-32$/, round: earliestRound },
	{ pattern: /gold-medal-match/, round: 0 },
	{ pattern: /bronze-medal-match|3rd-place/, round: 1 },
	{ pattern: /knockout-round-playoffs$/, round: earliestRound },
	{ pattern: /wild-card$/, round: earliestRound },
	{ pattern: /round-one$/, round: earliestRound },
	{ pattern: /liguilla/, round: earliestRound },
	{ pattern: /(?:^|-)(?:mls-cup|final|finals|championship)$/, round: 0 },
	{ pattern: /playoffs/, round: earliestRound },
];

export const resolveRoundFromSlug = (slug: string | undefined): PostseasonRound | undefined => {
	const s = slug?.trim().toLowerCase();
	if (!s) return undefined;
	return soccerSlugRounds.find(r => r.pattern.test(s))?.round;
};

export interface PostseasonGrade {
	round?: PostseasonRound;
	label?: string;
}

interface GradeInput {
	league: LeagueId;
	seasonType?: number;
	seasonSlug?: string;
	notes?: { type?: string; headline?: string }[];
}

export const gradePostseason = ({ league, seasonType, seasonSlug, notes }: GradeInput): PostseasonGrade => {
	const headline = readEventHeadline(notes);
	const label = reduceEventName(headline);

	if (headline && proBowlPattern.test(headline)) return { label };

	if (league === 'ncaaf' && !(headline && collegeFootballPlayoffPattern.test(headline))) return { label };

	if (headline && womensNitPattern.test(headline)) return { label };

	if (collegeBaseballLeagues.has(league)) {
		const round = seasonType === undefined ? undefined : collegeBaseballRounds[seasonType];
		return { round: round ?? earliestRound, label };
	}

	const slugRound = resolveRoundFromSlug(seasonSlug);
	if (slugRound !== undefined) return { round: slugRound, label };

	const headlineRound = resolveRoundFromHeadline(headline);

	if (headline && sideTrophyPattern.test(headline)) {
		return isChampionshipRoundOfItsOwnBracket(headlineRound) ? { round: earliestRound, label } : { label };
	}

	return { round: headlineRound ?? earliestRound, label };
};
