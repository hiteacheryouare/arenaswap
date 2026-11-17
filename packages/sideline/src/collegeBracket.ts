import { isCollegeLeagueId, type CollegeLeagueId, type Game, type LeagueId } from '@arenaswap/core';

const titleRoundRules: Record<CollegeLeagueId, (headline: string) => boolean> = {
	ncaaf: headline => /\bcollege football playoff\b/i.test(headline),
	ncaab: headline => /^NCAA Men's Basketball Championship\b/i.test(headline) && !/\bfirst four\b/i.test(headline),
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
