import type { LeagueId } from './types';

// How far a game is from the trophy, rather than which number round it is. 0 is the game that
// decides the title, 1 a semifinal, 2 a quarterfinal, 3 anything earlier. Every league we track
// maps onto that without a per-league round table, because it is the same question in all of them:
// a Sweet 16 game and an NHL first-rounder are both "several wins away", and an NBA Finals Game 1
// and a Super Bowl are both "win this and it is over".
export type PostseasonRound = 0 | 1 | 2 | 3;

// Bottom of the ladder. A side trophy's final and a championship bracket's opening round are worth
// the same, which is the analyst's ruling and also what falls out of the arithmetic.
const earliestRound: PostseasonRound = 3;

// Shares of the user's postseasonBoostPoints ceiling, indexed by distance. Even quarters: at the
// default of 8 the ladder is 2/4/6/8, which is legible at a glance and never rounds two rungs onto
// the same integer.
const roundShares: Record<PostseasonRound, number> = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.25 };

export const postseasonBoostShare = (round: PostseasonRound | undefined): number =>
	round === undefined ? 0 : roundShares[round];

// ESPN puts the round in `competition.notes[].headline` for the US leagues, and the note carries
// `type: 'event'`. Regular-season oddities (an NFL London game) also carry a typed note with no
// round in it, so the headline is only ever trusted for grading a game we already know is
// postseason — never as a postseason detector on its own.
const readEventHeadline = (notes: { type?: string; headline?: string }[] | undefined): string | undefined => {
	if (!notes) return undefined;
	const typed = notes.find(n => n.type === 'event' && n.headline?.trim());
	const any = notes.find(n => n.headline?.trim());
	return (typed ?? any)?.headline?.trim() || undefined;
};

// A scheduling note ESPN sends through the same field as the round: the real string is
// "NCAA Baseball Championship - Atlanta Regional Rescheduled from 5/29". It names no round and must
// not be printed as one.
const schedulingNotePattern = /\brescheduled from\b/i;

// Prefixes that repeat the league the popup already names twice over, in the section header and the
// league logo. Stripping them is what takes ESPN's longest headline from 404px to 168px on a card
// with 228.6px to spend.
//
// Four tournaments are deliberately absent: NIT, WBIT, Women's NIT and the College Basketball
// Crown. Those prefixes are not redundant with the league — they are the fact that says *which* of
// four tournaments a March basketball card is showing. Stripping them collided
// `WBIT - Semifinal` and `Women's NIT - Semifinal` onto one label, and those two score +2 and 0
// respectively, so the card would have shown the same words over different numbers.
//
// The dash is optional throughout. Requiring it left `NCAA Men's Hockey National Championship`
// unstripped while its own regional games reduced normally, so one tournament printed labels two
// different ways and the biggest game got the longest one.
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

// ESPN's own segment join, and the preposition in "Quarterfinal at the Rose Bowl". Neither carries
// information, and the middot is the separator the card already uses elsewhere.
const segmentJoin = /\s+[-–]\s+/g;
const venueJoin = /\s+at the\s+/gi;

// The event name as it should appear on a card: ESPN's own words, its own casing, its sponsors
// intact. Nothing is ever truncated — a label too wide for the status row takes its own line
// instead, which is a rendering decision rather than a text one.
//
// Returns undefined when there is nothing worth printing: a scheduling note, or a headline that is
// nothing but the tournament name once the redundant prefix is gone.
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

// Games ESPN stamps postseason that are not on anybody's championship path. They keep their name on
// the card — a bowl's sponsor is the most interesting thing about it — and score nothing.
const proBowlPattern = /\bpro bowl\b/i;
// The CFP names its own rounds. ~26 sponsor-named bowls do not, so absence of a round signal is
// what identifies a bowl, rather than a list of bowl names that changes every year.
const collegeFootballPlayoffPattern = /\bcollege football playoff\b|\bnational championship\b/i;
// Since the WBIT launched in 2024 the Women's NIT is the third tier of the women's postseason.
const womensNitPattern = /\bwomen's nit\b/i;
// Secondary tournaments: their final is worth the bottom rung, their earlier rounds nothing.
const sideTrophyPattern = /^(?:nit|wbit|college basketball crown)\b/i;

const isChampionshipRoundOfItsOwnBracket = (round: PostseasonRound | undefined): boolean => round === 0;

// Ordered most specific first. Matched against the round phrase, which is the headline with any
// trailing series game number removed — "West Final - Game 3" grades on "West Final".
//
// The conference qualifiers are anchored to the start on purpose. NBA and NHL write "East Final"
// and "West Semifinals", and matching a bare east|west anywhere in the string instead would have
// graded "Big East Tournament - Final" and "West Coast Conference Tournament - Final" as conference
// finals, which is a conference name rather than a conference round.
const roundRules: { pattern: RegExp; round: PostseasonRound }[] = [
	// A regional round scopes inside its bracket: an NCAA hockey regional final is the national
	// tournament's quarterfinal, not its title game.
	{ pattern: /\bregional final\b/i, round: 2 },
	{ pattern: /\bregional semifinal\b/i, round: 3 },
	{ pattern: /\bregional\b/i, round: earliestRound },

	{ pattern: /\bnational championship\b/i, round: 0 },
	{ pattern: /\bsuper bowl\b/i, round: 0 },
	{ pattern: /\bunited bowl\b/i, round: 0 },
	{ pattern: /\bstanley cup final/i, round: 0 },
	{ pattern: /\bmls cup\b/i, round: 0 },
	{ pattern: /\bgold medal\b/i, round: 0 },
	// Not on the trophy path, but a medal game is a final in every way that matters to a viewer.
	{ pattern: /\bbronze medal\b/i, round: 1 },
	{ pattern: /\bworld series\b/i, round: 0 },
	{ pattern: /\bchampionship (?:series|final|finals|game)\b/i, round: 0 },

	{ pattern: /\bfinal four\b/i, round: 1 },
	{ pattern: /\bfrozen four\b/i, round: 1 },
	{ pattern: /\b(?:al|nl)cs\b/i, round: 1 },
	{ pattern: /^(?:afc|nfc)\s+championship\b/i, round: 1 },
	// Only the geographic qualifiers. "NBA Finals" and "WNBA Finals" are the title series, not a
	// conference round, and including the league name here graded both of them a rung too low.
	{ pattern: /^(?:east|west|eastern|western)\s+(?:conference\s+)?finals?\b/i, round: 1 },
	{ pattern: /\bsemi-?finals?\b/i, round: 1 },

	{ pattern: /\belite 8\b/i, round: 2 },
	{ pattern: /\b(?:al|nl)ds\b/i, round: 2 },
	{ pattern: /\bdivisional\b/i, round: 2 },
	{ pattern: /\bquarter-?finals?\b/i, round: 2 },
	{ pattern: /\b(?:2nd|second) round\b/i, round: 2 },

	{ pattern: /\bsweet 16\b/i, round: earliestRound },
	{ pattern: /\bfirst four\b/i, round: earliestRound },
	{ pattern: /\b(?:alwc|nlwc)\b/i, round: earliestRound },
	{ pattern: /\bwild card\b/i, round: earliestRound },
	{ pattern: /\b(?:1st|first|3rd|third|4th|fourth) round\b/i, round: earliestRound },

	// An unqualified "Final" only reaches here once every conference-qualified form above has been
	// ruled out, so at this point it really is the title game.
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
const collegeBaseballLeagues = new Set<LeagueId>(['cbase', 'csoft']);

// The soccer family carries the round in `season.slug`, and its notes are aggregate and penalty
// results rather than round names, so the slug is the only usable signal there.
// Ordered most specific first, and the ordering is doing real work. `semi-finals` ends in
// `-finals`, so a bare finals rule placed above it grades a semifinal as the title match; and
// `playoffs---championship` contains `playoffs`, so a catch-all placed above it grades the NWSL
// final as an opening round. Both were live bugs caught by the table below.
const soccerSlugRounds: { pattern: RegExp; round: PostseasonRound }[] = [
	// MLS runs its bracket per conference, so a conference final is one win from MLS Cup rather
	// than being it, exactly as in the NBA and NHL.
	{ pattern: /conference.*semi-?finals?$/, round: 2 },
	{ pattern: /conference.*finals?$/, round: 1 },
	{ pattern: /semi-?finals?$/, round: 1 },
	{ pattern: /quarter-?finals?$/, round: 2 },
	{ pattern: /round-of-16$/, round: 2 },
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
	// Undefined means "postseason, but scores nothing" — a bowl, the Pro Bowl, a side trophy's
	// early round. The label can still be present on all of those.
	round?: PostseasonRound;
	label?: string;
}

interface GradeInput {
	league: LeagueId;
	seasonType?: number;
	seasonSlug?: string;
	notes?: { type?: string; headline?: string }[];
}

// Grades a game already known to be postseason. Every branch either returns a round or deliberately
// withholds one; nothing here can throw on a malformed payload, because a scoreboard that changes
// shape must degrade to "no boost" rather than take the popup down.
export const gradePostseason = ({ league, seasonType, seasonSlug, notes }: GradeInput): PostseasonGrade => {
	const headline = readEventHeadline(notes);
	const label = reduceEventName(headline);

	if (headline && proBowlPattern.test(headline)) return { label };

	// College football's postseason is ~26 sponsor-named exhibitions alongside 11 playoff games.
	// Requiring an affirmative playoff signal is what separates them, and it survives the bracket
	// growing because a 16-team CFP still calls its games "College Football Playoff First Round".
	if (league === 'ncaaf' && !(headline && collegeFootballPlayoffPattern.test(headline))) return { label };

	if (headline && womensNitPattern.test(headline)) return { label };

	if (collegeBaseballLeagues.has(league)) {
		const round = seasonType === undefined ? undefined : collegeBaseballRounds[seasonType];
		return { round: round ?? earliestRound, label };
	}

	const slugRound = resolveRoundFromSlug(seasonSlug);
	if (slugRound !== undefined) return { round: slugRound, label };

	const headlineRound = resolveRoundFromHeadline(headline);

	// A secondary tournament's final is worth the bottom rung and its earlier rounds nothing, so the
	// round has to be graded before it is discarded.
	if (headline && sideTrophyPattern.test(headline)) {
		return isChampionshipRoundOfItsOwnBracket(headlineRound) ? { round: earliestRound, label } : { label };
	}

	// The fallback that matters most in a year's time. ESPN renames things, and a postseason game we
	// can no longer grade should keep the smallest boost rather than silently lose the feature or
	// silently claim to be a final.
	return { round: headlineRound ?? earliestRound, label };
};
