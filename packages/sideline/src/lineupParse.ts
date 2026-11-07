import type { Paired } from './matchupParse';

export interface LineupPlayer {
	id: string;
	name: string;
	jersey?: string;
	position?: string;
}

export interface TeamLineup {
	formation?: string;
	// From the goalkeeper out. Each row runs left to right as the team itself faces the pitch.
	rows: LineupPlayer[][];
	shirtColor?: string;
	numberColor?: string;
}

export type Lineups = Paired<TeamLineup | null>;

export const emptyLineups: Lineups = { away: null, home: null };

export const hasLineups = (lineups: Lineups): boolean => lineups.away !== null || lineups.home !== null;

interface RosterEntry {
	starter?: boolean;
	jersey?: string;
	formationPlace?: string;
	position?: { abbreviation?: string };
	athlete?: { id?: string; lastName?: string; shortName?: string; displayName?: string };
}

interface RosterTeam {
	team?: { id?: string };
	formation?: string;
	uniform?: { color?: string; alternateColor?: string };
	roster?: RosterEntry[];
}

interface Starter extends LineupPlayer {
	place: number;
	depth: number;
	side: number;
}

// How far up the pitch a position plays, from the position names our sources use (Opta's).
const positionDepth = (position: string): number => {
	if (position === 'G' || position === 'GK') return 0;
	if (/^(CD|CB|SW|D)(-|$)|^[LR]B$/.test(position)) return 1;
	if (/^[LR]WB$/.test(position)) return 1.5;
	if (position.startsWith('DM')) return 2;
	if (/^(CM|[LR]M|M)(-|$)/.test(position)) return 3;
	if (/^AM|^[LR]W$/.test(position)) return 4;
	if (/^(CF|[LR]CF|SS)(-|$)/.test(position)) return 5;
	return 5.5;
};

// Negative is the team's left. Wide positions sit outside the inside-left and inside-right ones.
const positionSide = (position: string): number => {
	if (/^L(B|WB|M|W|F)$/.test(position)) return -2;
	if (/^R(B|WB|M|W|F)$/.test(position)) return 2;
	if (/-L$|^LC/.test(position)) return -1;
	if (/-R$|^RC/.test(position)) return 1;
	return 0;
};

const toHex = (value: string | undefined): string | undefined => (
	value && /^[0-9a-f]{6}$/i.test(value) ? `#${value.toUpperCase()}` : undefined
);

const formationRows = (formation: string | undefined, outfield: number): number[] | undefined => {
	const counts = formation?.split('-').map(Number);
	if (!counts || counts.some(count => !Number.isInteger(count) || count < 1)) return undefined;
	return counts.reduce((sum, count) => sum + count, 0) === outfield ? counts : undefined;
};

const groupByDepth = (players: Starter[]): Starter[][] => {
	const rows = new Map<number, Starter[]>();
	for (const player of players) rows.set(player.depth, [...(rows.get(player.depth) ?? []), player]);
	return [...rows.keys()].toSorted((a, b) => a - b).map(depth => rows.get(depth)!);
};

const byDepth = (a: Starter, b: Starter) => a.depth - b.depth || a.place - b.place;
const bySide = (a: Starter, b: Starter) => a.side - b.side || a.place - b.place;

const layOutLineup = (formation: string | undefined, starters: Starter[]): Starter[][] => {
	const keepers = starters.filter(player => player.depth === 0);
	const outfield = starters.filter(player => player.depth > 0).toSorted(byDepth);
	const counts = formationRows(formation, outfield.length);
	let rows: Starter[][];
	if (counts) {
		let taken = 0;
		rows = counts.map(count => outfield.slice(taken, taken += count));
	} else {
		rows = groupByDepth(outfield);
	}
	return [keepers, ...rows].filter(row => row.length > 0).map(row => row.toSorted(bySide));
};

const toStarter = (entry: RosterEntry): Starter | null => {
	const name = entry.athlete?.lastName?.trim() || entry.athlete?.shortName?.trim() || entry.athlete?.displayName?.trim();
	if (!name) return null;
	const position = entry.position?.abbreviation?.trim().toUpperCase();
	return {
		id: entry.athlete?.id ?? name,
		name,
		...(entry.jersey ? { jersey: entry.jersey } : {}),
		...(position ? { position } : {}),
		place: Number(entry.formationPlace) || 99,
		depth: position ? positionDepth(position) : 3,
		side: position ? positionSide(position) : 0,
	};
};

const toLineup = (team: RosterTeam | undefined): TeamLineup | null => {
	const starters = (team?.roster ?? [])
		.filter(entry => entry.starter === true)
		.map(toStarter)
		.filter((starter): starter is Starter => starter !== null);
	if (starters.length < 7) return null;
	const shirtColor = toHex(team?.uniform?.color);
	const numberColor = toHex(team?.uniform?.alternateColor);
	return {
		...(team?.formation ? { formation: team.formation } : {}),
		rows: layOutLineup(team?.formation, starters).map(row => row.map(({ id, name, jersey, position }) => ({
			id,
			name,
			...(jersey ? { jersey } : {}),
			...(position ? { position } : {}),
		}))),
		...(shirtColor ? { shirtColor } : {}),
		...(numberColor ? { numberColor } : {}),
	};
};

export const parseLineups = (data: unknown, ids: { home: string; away: string }): Lineups => {
	const rosters = (data as { rosters?: unknown })?.rosters;
	if (!Array.isArray(rosters)) return emptyLineups;
	const teamFor = (id: string) => (rosters as RosterTeam[]).find(team => team?.team?.id === id);
	return { away: toLineup(teamFor(ids.away)), home: toLineup(teamFor(ids.home)) };
};
