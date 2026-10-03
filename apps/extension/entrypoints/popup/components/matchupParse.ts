import type { SportType } from '@arenaswap/core/types';
import { injuryStatusByType, injuryStatusOrder, seasonStatSpecsFor } from './matchupLabels';
import type { InjuryStatus, SeasonStatSpec } from './matchupLabels';

// Everything on the Matchup tab, read off the same pre-game `/summary` response the screen already
// fetches. Each block is keyed by team id and paired to a side here, so the components only ever
// see away and home.

export interface FormResult {
	id: string;
	result: 'W' | 'L' | 'D' | 'T';
	isAway: boolean;
	teamScore: string;
	opponentScore: string;
	opponentAbbreviation: string;
	opponentLogo?: string;
	date: string;
}

export interface StatComparison {
	labelKey: SeasonStatSpec['labelKey'];
	away: string;
	home: string;
	awayRank?: number;
	homeRank?: number;
	better: 'away' | 'home' | null;
	// The away side's share of the bar, 0–1, already flipped for a stat where lower is better so the
	// longer half always belongs to the better team. Null where a share means nothing, which is a
	// goal difference either side of zero.
	awayShare: number | null;
}

export interface InjuryEntry {
	id: string;
	name: string;
	position?: string;
	headshot?: string;
	status: InjuryStatus;
	detail?: string;
}

export interface Paired<T> {
	away: T;
	home: T;
}

export interface Matchup {
	form: Paired<FormResult[]>;
	stats: StatComparison[];
	injuries: Paired<InjuryEntry[]>;
}

export interface TicketLink {
	url: string;
	minPrice?: number;
}

export const emptyMatchup: Matchup = {
	form: { away: [], home: [] },
	stats: [],
	injuries: { away: [], home: [] },
};

export const hasMatchupContent = (matchup: Matchup): boolean => (
	matchup.form.away.length > 0 || matchup.form.home.length > 0
	|| matchup.stats.length > 0
	|| matchup.injuries.away.length > 0 || matchup.injuries.home.length > 0
);

interface TeamIds {
	home: string;
	away: string;
}

const str = (value: unknown): string | undefined => (
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
);

const teamIdOf = (entry: unknown): string | undefined => {
	const id = (entry as { team?: { id?: unknown } } | null)?.team?.id;
	return id === undefined || id === null ? undefined : String(id);
};

// The three blocks carry no `homeAway` of their own, but the header does, and it is what the box
// score already pairs by when ESPN's ids are not ours (college hockey). An entry that matches
// neither side is dropped rather than guessed at.
const sideMap = (data: unknown, ids: TeamIds): Map<string, 'home' | 'away'> => {
	const sides = new Map<string, 'home' | 'away'>([[ids.home, 'home'], [ids.away, 'away']]);
	const competitors = (data as {
		header?: { competitions?: { competitors?: { id?: unknown; homeAway?: unknown }[] }[] };
	})?.header?.competitions?.[0]?.competitors;
	for (const competitor of Array.isArray(competitors) ? competitors : []) {
		if (competitor.homeAway !== 'home' && competitor.homeAway !== 'away') continue;
		const id = competitor.id === undefined ? undefined : String(competitor.id);
		if (id && !sides.has(id)) sides.set(id, competitor.homeAway);
	}
	return sides;
};

const pairBlock = <T>(
	data: unknown,
	block: unknown,
	ids: TeamIds,
	parse: (entry: unknown, teamId: string) => T,
	empty: () => T,
): Paired<T> => {
	const paired: Paired<T> = { away: empty(), home: empty() };
	if (!Array.isArray(block)) return paired;
	const sides = sideMap(data, ids);
	for (const entry of block) {
		const teamId = teamIdOf(entry);
		const side = teamId ? sides.get(teamId) : undefined;
		if (teamId && side) paired[side] = parse(entry, teamId);
	}
	return paired;
};

interface RawFormEvent {
	id?: unknown;
	atVs?: unknown;
	gameDate?: unknown;
	homeTeamId?: unknown;
	homeTeamScore?: unknown;
	awayTeamScore?: unknown;
	gameResult?: unknown;
	opponent?: { abbreviation?: unknown };
	opponentLogo?: unknown;
}

const formResultOf = (value: unknown): FormResult['result'] | undefined => (
	value === 'W' || value === 'L' || value === 'D' || value === 'T' ? value : undefined
);

const parseFormEvents = (entry: unknown, teamId: string): FormResult[] => {
	const events = (entry as { events?: RawFormEvent[] }).events;
	if (!Array.isArray(events)) return [];
	const results: FormResult[] = [];
	for (const event of events) {
		const result = formResultOf(event.gameResult);
		const date = str(event.gameDate);
		const homeScore = str(event.homeTeamScore);
		const awayScore = str(event.awayTeamScore);
		if (!result || !date || homeScore === undefined || awayScore === undefined) continue;
		const isHome = String(event.homeTeamId) === teamId;
		results.push({
			id: String(event.id ?? date),
			result,
			isAway: event.atVs === '@',
			teamScore: isHome ? homeScore : awayScore,
			opponentScore: isHome ? awayScore : homeScore,
			opponentAbbreviation: str(event.opponent?.abbreviation) ?? '',
			opponentLogo: str(event.opponentLogo),
			date,
		});
	}
	// Oldest first, so the row reads left to right the way the season did.
	return results.toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date));
};

export const parseRecentForm = (data: unknown, ids: TeamIds): Paired<FormResult[]> => (
	pairBlock(data, (data as { lastFiveGames?: unknown })?.lastFiveGames, ids, parseFormEvents, () => [])
);

interface RawInjury {
	type?: { name?: unknown };
	details?: { type?: unknown };
	athlete?: {
		id?: unknown;
		displayName?: unknown;
		shortName?: unknown;
		headshot?: { href?: unknown };
		position?: { abbreviation?: unknown };
	};
}

const parseInjuryList = (entry: unknown): InjuryEntry[] => {
	const injuries = (entry as { injuries?: RawInjury[] }).injuries;
	if (!Array.isArray(injuries)) return [];
	const parsed: InjuryEntry[] = [];
	for (const injury of injuries) {
		const status = injuryStatusByType[String(injury.type?.name)];
		const name = str(injury.athlete?.shortName) ?? str(injury.athlete?.displayName);
		if (!status || !name) continue;
		const detail = str(injury.details?.type);
		parsed.push({
			id: String(injury.athlete?.id ?? name),
			name,
			position: str(injury.athlete?.position?.abbreviation),
			headshot: str(injury.athlete?.headshot?.href),
			status,
			detail: detail === 'Not Specified' ? undefined : detail,
		});
	}
	return parsed.toSorted((a, b) => injuryStatusOrder.indexOf(a.status) - injuryStatusOrder.indexOf(b.status));
};

export const parseInjuries = (data: unknown, ids: TeamIds): Paired<InjuryEntry[]> => (
	pairBlock(data, (data as { injuries?: unknown })?.injuries, ids, parseInjuryList, () => [])
);

interface RawStat {
	name?: unknown;
	displayValue?: unknown;
	rankDisplayValue?: unknown;
}

interface ParsedStat {
	display: string;
	value: number;
	rank?: number;
}

type StatTable = Map<string, ParsedStat>;

const statKey = (name: string, group?: string) => (group ? `${group}.${name}` : name);

// "5th", "Tied-1st". Read as the number alone and drawn as "#5", which every locale can carry
// without a set of English ordinal suffixes to translate.
const rankOf = (value: unknown): number | undefined => {
	const match = typeof value === 'string' ? /(\d+)/.exec(value) : null;
	return match ? Number(match[1]) : undefined;
};

const addStat = (table: StatTable, raw: RawStat, group?: string) => {
	const name = str(raw.name);
	const display = str(raw.displayValue);
	if (!name || display === undefined) return;
	const value = Number.parseFloat(display);
	if (!Number.isFinite(value)) return;
	table.set(statKey(name, group), { display, value, rank: rankOf(raw.rankDisplayValue) });
};

// Two shapes. Baseball groups its stats (`batting`, `pitching`) and ranks each one; every other
// sport sends a flat list with no rank.
const parseStatTable = (entry: unknown): StatTable => {
	const table: StatTable = new Map();
	const statistics = (entry as { statistics?: unknown }).statistics;
	if (!Array.isArray(statistics)) return table;
	for (const item of statistics as (RawStat & { stats?: RawStat[] })[]) {
		if (Array.isArray(item.stats)) {
			const group = str(item.name);
			for (const stat of item.stats) addStat(table, stat, group);
		} else {
			addStat(table, item);
		}
	}
	return table;
};

const compare = (spec: SeasonStatSpec, away: ParsedStat, home: ParsedStat): StatComparison | null => {
	// A team that has not played yet still gets "0.0", which would win every stat where lower is
	// better. Opening week staggers debuts, so one side being zero is enough to drop the row.
	if (!spec.zeroIsReal && (away.value === 0 || home.value === 0)) return null;
	if (away.value === 0 && home.value === 0) return null;
	const awayAhead = spec.lowerIsBetter ? away.value < home.value : away.value > home.value;
	const better = away.value === home.value ? null : awayAhead ? 'away' : 'home';
	const total = away.value + home.value;
	const canShare = away.value >= 0 && home.value >= 0 && total > 0;
	return {
		labelKey: spec.labelKey,
		away: away.display,
		home: home.display,
		awayRank: away.rank,
		homeRank: home.rank,
		better,
		awayShare: canShare ? (spec.lowerIsBetter ? home.value : away.value) / total : null,
	};
};

export const parseSeasonStats = (data: unknown, sportType: SportType | undefined, ids: TeamIds): StatComparison[] => {
	const teams = (data as { boxscore?: { teams?: unknown } })?.boxscore?.teams;
	const tables = pairBlock(data, teams, ids, entry => parseStatTable(entry), () => new Map() as StatTable);
	const rows: StatComparison[] = [];
	for (const spec of seasonStatSpecsFor(sportType)) {
		const key = statKey(spec.name, spec.group);
		const away = tables.away.get(key);
		const home = tables.home.get(key);
		const row = away && home ? compare(spec, away, home) : null;
		if (row) rows.push(row);
	}
	return rows;
};

export const parseMatchup = (data: unknown, sportType: SportType | undefined, ids: TeamIds): Matchup => ({
	form: parseRecentForm(data, ids),
	stats: parseSeasonStats(data, sportType, ids),
	injuries: parseInjuries(data, ids),
});

// The seller's link carries our sources' referral tag. It comes off so the link is a plain one:
// the store listings promise no tracking, and an affiliate code has to be disclosed before install.
const referralParams = ['wsUser'];

export const parseTickets = (data: unknown): TicketLink | null => {
	const seat = (data as {
		ticketsInfo?: { seatSituation?: { eventLink?: unknown; summary?: unknown } };
	})?.ticketsInfo?.seatSituation;
	const link = str(seat?.eventLink);
	if (!link) return null;

	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:') return null;
	for (const param of referralParams) url.searchParams.delete(param);

	// "Tickets as low as $141". Always dollars, in every league we have seen it for.
	const price = /\$\s?([\d,]+(?:\.\d+)?)/.exec(str(seat?.summary) ?? '')?.[1];
	const minPrice = price ? Number.parseFloat(price.replace(/,/g, '')) : undefined;
	return { url: url.toString(), minPrice: Number.isFinite(minPrice) ? minPrice : undefined };
};
