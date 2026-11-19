import { leagueConfigMap, type LeagueId } from '@arenaswap/core';
import { getTimelineProgress, resolveLeagueConfig, resolveSportConfig, type WinProbabilityReading } from 'powerscore';
import { EspnSummarySchema, type EspnSummaryPlay } from './espnSchemas';
import { parseClockToSeconds } from './gameClock';

const inningHalf = (type: string | undefined): boolean | undefined => {
	if (type === 'Top') return true;
	if (type === 'Bottom') return false;
	return undefined;
};

export const parseWinProbabilityReadings = (raw: unknown, league: LeagueId): WinProbabilityReading[] => {
	const config = leagueConfigMap[league];
	const parsed = EspnSummarySchema.safeParse(raw);
	if (!config || !parsed.success) return [];

	const { winprobability = [], plays = [], drives } = parsed.data;
	const drivePlays = [...(drives?.previous ?? []), ...(drives?.current ? [drives.current] : [])].flatMap(drive => drive.plays ?? []);
	const playsById = new Map<string, EspnSummaryPlay>();
	for (const play of [...plays, ...drivePlays]) if (play.id !== undefined) playsById.set(play.id, play);

	const sport = resolveSportConfig(config.sportType);
	const leagueConfig = resolveLeagueConfig({ league, sportType: config.sportType });
	const readings: WinProbabilityReading[] = [];
	let progress = 0;
	for (const entry of winprobability) {
		const probability = entry.homeWinPercentage;
		if (typeof probability !== 'number' || !Number.isFinite(probability)) continue;
		const play = entry.playId === undefined ? undefined : playsById.get(entry.playId);
		if (play?.period?.number !== undefined) {
			const clock = play.clock?.displayValue;
			const playProgress = getTimelineProgress({
				period: play.period.number,
				clockSeconds: clock === undefined ? undefined : parseClockToSeconds(clock),
				topOfInning: inningHalf(play.period.type),
			}, sport, leagueConfig);
			progress = Math.max(progress, playProgress);
		}
		readings.push({ homeWinProbability: Math.min(Math.max(probability, 0), 1), progress });
	}
	return readings;
};
