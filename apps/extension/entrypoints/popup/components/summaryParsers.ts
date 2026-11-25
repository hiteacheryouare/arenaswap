import { monoMarksFromLogos } from '@arenaswap/sideline';
import type { TeamMonoMarks } from '@arenaswap/core/types';
import { emptyTeamRecords, type MonoLogos, type SeriesInfo, type TeamRecords } from '@arenaswap/ui/src/components/detailSummary';

interface RecordEntry {
	type?: string;
	summary?: string;
	displayValue?: string;
}

interface HeaderLogo {
	href?: string;
	rel?: string[];
}

interface HeaderCompetitor {
	homeAway?: string;
	team?: { id?: string; logos?: HeaderLogo[] };
	record?: RecordEntry[];
}

export const emptyMonoLogos: MonoLogos = { home: null, away: null };

const monoMarksOf = (competitor: HeaderCompetitor | undefined): TeamMonoMarks | null => (
	monoMarksFromLogos(competitor?.team?.logos)
);

// `summary` beats `displayValue` because the NHL appends standings points there —
// "28-28-10, 66 PTS" — twice the width of the column it has to sit in.
const totalRecord = (competitor: HeaderCompetitor | undefined): string | null => {
	const total = competitor?.record?.find(entry => entry.type === 'total');
	const value = (total?.summary ?? total?.displayValue ?? '').trim();
	return value.length > 0 ? value : null;
};

// Team id is the primary key rather than array position: ESPN orders `competitors` by its own
// `order` field, which is not away-then-home across every sport. `homeAway` is the fallback for
// leagues where we synthesize team ids (college hockey) and so can never match.
const headerCompetitors = (data: unknown): HeaderCompetitor[] | null => {
	const competitors = (data as {
		header?: { competitions?: { competitors?: HeaderCompetitor[] }[] };
	})?.header?.competitions?.[0]?.competitors;
	return Array.isArray(competitors) ? competitors : null;
};

const sidesOf = (data: unknown, homeTeamId: string, awayTeamId: string) => {
	const competitors = headerCompetitors(data);
	if (!competitors) return null;
	const byId = (id: string) => (id ? competitors.find(c => c.team?.id === id) : undefined);
	const bySide = (side: string) => competitors.find(c => c.homeAway === side);
	return {
		home: byId(homeTeamId) ?? bySide('home'),
		away: byId(awayTeamId) ?? bySide('away'),
	};
};

export const parseTeamRecords = (data: unknown, homeTeamId: string, awayTeamId: string): TeamRecords => {
	const sides = sidesOf(data, homeTeamId, awayTeamId);
	if (!sides) return emptyTeamRecords;
	return { home: totalRecord(sides.home), away: totalRecord(sides.away) };
};

export const parseMonoLogos = (data: unknown, homeTeamId: string, awayTeamId: string): MonoLogos => {
	const sides = sidesOf(data, homeTeamId, awayTeamId);
	if (!sides) return emptyMonoLogos;
	return { home: monoMarksOf(sides.home), away: monoMarksOf(sides.away) };
};

// Only the series being played right now. ESPN also ships a 'season' entry holding the whole
// head-to-head — six meetings spread across the year — and a series opener carries that and
// nothing else, so falling back to it captions a series that has not started with the record from
// the last one. It is not reliably index 0 either: a 'preseason' entry can sit in front of it.
// A playoff series comes first: the NBA and NHL ship no 'current' entry at all, and MLB's shrinks
// to the games actually played once a side clinches, losing the length of the series.
export const pickSeriesEntry = (entries: SeriesInfo[] | undefined): SeriesInfo | null => {
	if (!Array.isArray(entries)) return null;
	return entries.find(entry => entry.type === 'playoff')
		?? entries.find(entry => entry.type === 'current')
		?? null;
};
