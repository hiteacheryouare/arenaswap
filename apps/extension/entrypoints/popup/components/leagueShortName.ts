import { leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';

// What a fan calls the league out loud. Anything missing here is already short enough, or has no
// shorter name anybody uses, so it falls back to the league's own label.
const shortNames: Partial<Record<LeagueId, string>> = {
	ncaab: 'NCAAB',
	ncaaw: 'NCAAW',
	ncaaf: 'NCAAF',
	ncaamh: 'NCAAH',
	cbase: 'NCAABB',
	csoft: 'NCAASB',
	epl: 'EPL',
	ucl: 'UCL',
	uel: 'UEL',
	laliga: 'LaLiga',
};

const leagueShortName = (league: LeagueId): string => (
	shortNames[league] ?? leagueConfigMap[league]?.label ?? league.toUpperCase()
);

export default leagueShortName;
