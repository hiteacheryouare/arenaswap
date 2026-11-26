import type { LeagueId, TeamMonoLogoMap, TeamMonoMarks } from '@arenaswap/core';
import { getEnabledLeagueConfigs } from './apiClient';
import { warnOnDroppedCountChange } from './dropWarnings';
import { parseTeams } from './espnSchemas';
import { espnBase, espnGet } from './endpoints';
import { espnRequestPoolSize, settledInPool, takeRequestSlot } from './requestPool';

export interface EspnTeamEntry {
	leagueId: LeagueId;
	id: string;
	name: string;
	abbreviation: string;
	logo?: string;
}

const espnImageHost = 'https://a.espncdn.com';

// ESPN draws the mono marks at 4096x4096 — 225KB apiece for something that renders at 15px in a
// guide bar. The combiner is their own resizer and hands the same transparent PNG back at about 6KB.
export const monoLogoUrl = (href: string | undefined, size: number): string | undefined => {
	if (!href || !href.startsWith(`${espnImageHost}/`)) return undefined;
	return `${espnImageHost}/combiner/i?img=${href.slice(espnImageHost.length)}&w=${size}&h=${size}`;
};

export const monoMarksFromLogos = (
	logos: { href?: string; rel?: string[] }[] | undefined,
	size = 120,
): TeamMonoMarks | null => {
	const of = (rel: string) => monoLogoUrl(logos?.find(logo => logo.rel?.includes(rel))?.href, size);
	const white = of('primary_logo_white');
	const black = of('primary_logo_black');
	if (!white && !black) return null;
	const marks: TeamMonoMarks = {};
	if (white) marks.white = white;
	if (black) marks.black = black;
	return marks;
};

// A league's teams keyed by id to ESPN's all-white mark. The scoreboard carries a single logo per
// competitor and no variants at all, so a surface that wants the white one has to ask `/teams` —
// which is one request per league.
export const fetchTeamMonoLogos = async (leagueIds: LeagueId[], size = 120): Promise<TeamMonoLogoMap> => {
	const configs = getEnabledLeagueConfigs(leagueIds);
	if (configs.length === 0) return {};

	const results = await settledInPool(configs, async (config) => {
		const url = `${espnBase}/${config.espnPath}/teams?limit=1000`;
		await takeRequestSlot();
		const res = await espnGet(url);
		if (!res.ok) throw new Error(`Failed to fetch team logos for ${config.id}: HTTP ${res.status}`);
		const parsed = parseTeams(await res.json());
		const entries = parsed.teams.reduce<Record<string, TeamMonoMarks>>((acc, { team }) => {
			const marks = monoMarksFromLogos(team.logos, size);
			if (team.id && marks) acc[team.id] = marks;
			return acc;
		}, {});
		return [config.id, entries] as const;
	});

	return results.reduce<TeamMonoLogoMap>((acc, result) => {
		if (result.status === 'fulfilled' && Object.keys(result.value[1]).length > 0) {
			acc[result.value[0]] = result.value[1];
		}
		return acc;
	}, {});
};

export const fetchTeamsForLeagues = async (
	leagueIds: LeagueId[],
	onLeagueProgress?: (settled: number, total: number) => void,
): Promise<EspnTeamEntry[]> => {
	if (leagueIds.length === 0) return [];

	const leagueConfigs = getEnabledLeagueConfigs(leagueIds);
	if (leagueConfigs.length === 0) return [];

	const results = await settledInPool(leagueConfigs, async (config): Promise<EspnTeamEntry[]> => {
		// College football alone has 762 teams. `/teams` ignores `groups`, so the limit is the only
		// thing that decides whether a school makes the list.
		const url = `${espnBase}/${config.espnPath}/teams?limit=1000`;
		await takeRequestSlot();
		const res = await espnGet(url);
		if (!res.ok) throw new Error(`Failed to fetch teams for ${config.id}: HTTP ${res.status}`);
		const parsed = parseTeams(await res.json());
		warnOnDroppedCountChange(
			`teams:${config.id}`,
			parsed.droppedTeams,
			() => `Skipped ${parsed.droppedTeams} unparseable ${config.id} team(s); kept ${parsed.teams.length}.`,
		);
		return parsed.teams
			.filter(({ team }) => team.id && team.displayName)
			.map(({ team }) => ({
				leagueId: config.id,
				id: team.id,
				name: team.displayName,
				abbreviation: team.abbreviation || team.displayName.slice(0, 3).toUpperCase(),
				logo: team.logos?.[0]?.href,
			}));
	}, espnRequestPoolSize, onLeagueProgress);

	const fulfilled = results
		.filter((result): result is PromiseFulfilledResult<EspnTeamEntry[]> => result.status === 'fulfilled')
		.flatMap(result => result.value);
	if (fulfilled.length > 0) return fulfilled;

	const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
	throw (firstError?.reason instanceof Error
		? firstError.reason
		: new Error('Failed to fetch teams for selected leagues'));
};
