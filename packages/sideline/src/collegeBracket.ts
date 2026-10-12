import { isCollegeLeagueId, type CollegeLeagueId, type Game, type LeagueId } from '@arenaswap/core';

/* Which postseason games get past the filter: the path to the trophy the whole field is playing for,
   from the round the whole country watches. Side tournaments (NIT, WBIT), bowls outside the Playoff,
   conference tournaments and baseball's regionals stay filtered, and so do the FCS and lower-division
   playoffs, which already follow the division picks. Matched on our sources' round headline:
   "NCAA Men's Basketball Championship - East Region - 1st Round", "College Football Playoff First
   Round Game", "Men's College World Series - Elimination Game". */
const titleRoundRules: Record<CollegeLeagueId, (headline: string) => boolean> = {
	ncaaf: headline => /\bcollege football playoff\b/i.test(headline),
	ncaab: headline => /^NCAA Men's Basketball Championship\b/i.test(headline) && !/\bfirst four\b/i.test(headline),
	// The women's first weekend is spread over sixteen campuses; the national audience starts at the Sweet 16.
	ncaaw: headline => /^NCAA Women's Basketball Championship\b/i.test(headline) && !/\b(?:first four|1st round|2nd round)\b/i.test(headline),
	ncaamh: headline => /^NCAA Men's (?:Ice )?Hockey\b/i.test(headline),
	cbase: headline => /^Men's College World Series\b/i.test(headline),
	csoft: headline => /^Women's College World Series\b/i.test(headline),
};

const seededBracketPattern = /^NCAA (?:Men|Women)'s Basketball Championship\b|\bcollege football playoff\b/i;

export const readCollegeBracket = (leagueId: LeagueId, headline: string | undefined): Pick<Game, 'collegeTitleRound' | 'collegeSeeded'> => {
	if (!headline || !isCollegeLeagueId(leagueId)) return {};
	return {
		collegeTitleRound: titleRoundRules[leagueId](headline) || undefined,
		collegeSeeded: seededBracketPattern.test(headline) || undefined,
	};
};
