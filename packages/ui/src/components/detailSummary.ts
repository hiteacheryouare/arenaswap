import type { TeamMonoMarks } from '@arenaswap/core/types';

export interface SeriesCompetitor {
	homeAway: string;
	winner?: boolean;
	team: { id: string };
}

export interface SeriesEvent {
	statusType?: { completed?: boolean };
	competitors?: SeriesCompetitor[];
}

export interface SeriesInfo {
	type?: string;
	summary?: string;
	totalCompetitions?: number;
	events?: SeriesEvent[];
}

export interface TeamRecords {
	home: string | null;
	away: string | null;
}

export interface MonoLogos {
	home: TeamMonoMarks | null;
	away: TeamMonoMarks | null;
}

export const emptyTeamRecords: TeamRecords = { home: null, away: null };
