export { fetchGames, fetchLiveGames, fetchLeagueLogos, fetchGamesWithLeagueLogos,
	fetchTeamMonoLogos, fetchNextScheduledStart, fetchTeamsForLeagues, fetchWinProbability, fetchGameDurationMins, parseGameDurationMins,
	monoMarksFromLogos, scoreboardRefreshMs } from './apiClient';
export { logWarn, logError, setVerboseLogging, isVerboseLogging } from './logger';
export { computeEagerIntervalMs, computeHebetudinousIntervalMs, computeLeagueIntervalMs, earliestUpcomingStartMs, pollWinProbabilityMs } from './pollIntervalComputer';
export type { EspnTeamEntry } from './apiClient';
export { computeGameProgress, computePowerScore, computeScoringOpportunityBoost, computeWinProbVarianceScore, isPlayFrozen, normalizePowerScoreResult } from 'powerscore';
export { scoreMaxTotal } from 'powerscore';
export { MockGameSimulator } from './mockGames';
export { chooseSwitchTarget, getFavoriteTeamCount, getHistoryWindowMsForGame, maxSnapshotsPerGame, nextClockStall, recentSnapshots, retainSnapshots, scoreLiveGame, scoreOptionsFor, scoringContextFor, toLegacyPowerScoreResult, toScoreSnapshot, toScoringGame } from './scoring';
export type { ClockStallEntry, LiveScoringInput, ScoringPrefs, SwitchCandidateTab, SwitchPolicyInput, SwitchTarget } from './scoring';
export { offseasonGraceMs, resolveOffseason, toLeagueSchedule } from './leagueSchedule';
export type { LeagueOffseason } from './leagueSchedule';
export { gradePostseason, postseasonBoostShare, reduceEventName } from './postseasonRound';
export type { PostseasonGrade, PostseasonRound } from './postseasonRound';
export { createPollModeTracker } from './pollModeTracker';
export { fetchConferenceDirectory } from './collegeConferences';
export type { PollMode, PollModeTracker } from './pollModeTracker';
export * from './types';
export * from './constants';
export * from './typeGuards';
export { BackgroundStateSchema } from './backgroundSchema';
