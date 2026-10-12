import { leagueConfigs } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';

export const leagueOrder = Object.fromEntries(leagueConfigs.map((config, index) => [config.id, index])) as Record<LeagueId, number>;
