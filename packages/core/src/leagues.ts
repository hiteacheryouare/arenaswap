import { allLeagueIds, leagueConfigs } from 'powerscore';
import type { Game, LeagueId, ResolvedTheme } from './types';

const leagueLogoOverrides: Partial<Record<LeagueId, string>> = {
	cbase: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_baseball.png',
	csoft: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_womens_softball.png',
	olybb: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olymih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olywih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
};

export const leagueLogoFallbacks: Partial<Record<LeagueId, string>> = {
	nba: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
	wnba: 'https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png',
	nhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	mlb: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
	nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
	ncaab: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaaw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaaf: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaamh: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	mls: 'https://a.espncdn.com/i/teamlogos/leagues/500/mls.png',
	epl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png',
	fifawc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/4.png',
	wbbc: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-baseball.png',
	ufl: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufl.png',
	laliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/15.png',
	bundesliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/10.png',
	seriea: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/12.png',
	ligamx: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/22.png',
	ucl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2.png',
	uel: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2310.png',
	nwsl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2323.png',
	fifawwc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/60.png',
};

export const leagueLabels = Object.fromEntries(leagueConfigs.map(config => [config.id, config.label])) as Record<LeagueId, string>;

const homeFirstLeagues: ReadonlySet<LeagueId> = new Set<LeagueId>(['olybkm', 'olybkw', 'olymih', 'olywih']);

export const isHomeFirst = (game: Pick<Game, 'league' | 'sportType'>): boolean => (
	game.sportType === 'soccer' || homeFirstLeagues.has(game.league)
);

export const leagueShortLabels: Record<LeagueId, string> = {
	nba: 'NBA',
	wnba: 'WNBA',
	ncaab: 'NCAAM',
	nhl: 'NHL',
	ncaamh: 'NCAAH',
	mlb: 'MLB',
	nfl: 'NFL',
	ncaaf: 'CFB',
	mls: 'MLS',
	ncaaw: 'NCAAW',
	epl: 'EPL',
	fifawc: 'WC',
	cbase: 'NCAA BSB',
	csoft: 'NCAA SB',
	olybb: 'OLY BSB',
	wbbc: 'WBC',
	ufl: 'UFL',
	olymih: 'OLY MIH',
	olywih: 'OLY WIH',
	olybkm: 'OLY MBB',
	olybkw: 'OLY WBB',
	olysocm: 'OLY MSOC',
	olysocw: 'OLY WSOC',
	laliga: 'La Liga',
	bundesliga: 'Bundesliga',
	seriea: 'Serie A',
	ligamx: 'Liga MX',
	ucl: 'UCL',
	uel: 'UEL',
	nwsl: 'NWSL',
	fifawwc: 'WWC',
};

export const resolveLeagueLogoUrl = (leagueId: LeagueId, espnLogoUrl?: string, surface: ResolvedTheme = 'dark'): string => {
	const url = leagueLogoOverrides[leagueId]
		?? (typeof espnLogoUrl === 'string' && espnLogoUrl.length > 0 ? espnLogoUrl : leagueLogoFallbacks[leagueId])
		?? '';
	return surface === 'light' ? url.replace('/500-dark/', '/500/') : url;
};

export const teamLogoOnColor = (logo: string | undefined): string | undefined => (
	logo?.replace(/(\/i\/teamlogos\/[^/]+)\/500\//, '$1/500-dark/')
);

export const isLeagueId = (value: unknown): value is LeagueId => (
	typeof value === 'string' && allLeagueIds.includes(value as LeagueId)
);

export const parseFavoriteTeamKey = (value: string): { leagueId: LeagueId; teamId: string } | null => {
	const trimmed = value.trim();
	const separatorIndex = trimmed.indexOf(':');
	if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) return null;

	const leagueCandidate = trimmed.slice(0, separatorIndex);
	const teamCandidate = trimmed.slice(separatorIndex + 1).trim();
	if (!isLeagueId(leagueCandidate) || teamCandidate.length === 0) return null;

	return { leagueId: leagueCandidate, teamId: teamCandidate };
};

export const createFavoriteTeamKey = (leagueId: LeagueId, teamId: string): string => (
	`${leagueId}:${teamId.trim()}`
);

export const isFavoriteTeamGame = (
	game: Pick<Game, 'league' | 'homeTeam' | 'awayTeam'>,
	favoriteTeamIds: Set<string>,
): boolean => (
	favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id))
	|| favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id))
);
