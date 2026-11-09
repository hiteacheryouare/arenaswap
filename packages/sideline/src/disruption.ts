import type { Game } from '@arenaswap/core';

type Disruption = NonNullable<Game['disruption']>;
type PostponedReason = NonNullable<Game['postponedReason']>;

interface CompetitorName {
	id: string;
	team: { displayName?: string; shortDisplayName?: string; location?: string; name?: string };
}

// A canceled game is dropped before it becomes a Game, so it has no member here.
export const isCanceledStatus = (statusName?: string): boolean => /CANCEL/i.test(statusName ?? '');

// A suspended soccer match stays live (it resumes within the hour), so only a game read as
// finished carries the suspension as a disruption.
export const readDisruption = (statusName: string | undefined, state: Game['status']): Disruption | undefined => {
	const name = statusName ?? '';
	if (/POSTPONED/i.test(name)) return 'postponed';
	if (/FORFEIT/i.test(name)) return 'forfeit';
	if (/SUSPEND/i.test(name) && state === 'post') return 'suspended';
	return undefined;
};

const reasonPatterns: [PostponedReason, RegExp][] = [
	['airQuality', /air quality|smoke/i],
	['rain', /\brain/i],
	['weather', /weather|snow|icy|storm|hurricane|lightning/i],
	['travel', /travel/i],
];

// Our sources write the reason in front of the makeup date ("Rain - Makeup date April 6") and the
// NBA writes a sentence ("Postponed due to severe weather"). A reason outside this list shows nothing
// rather than English text in every language.
export const readPostponedReason = (headline?: string): PostponedReason | undefined => (
	headline ? reasonPatterns.find(([, pattern]) => pattern.test(headline))?.[0] : undefined
);

const monthIndex: Record<string, number> = {
	jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// "Makeup date April 6", "Makeup on Jul 29", "Makeup date Aug. 20", "Makeup date Sep 3rd". The year is
// the game's own, moved on one when the makeup month comes before the postponed one.
export const readMakeupDate = (headline: string | undefined, eventDate: string | undefined): string | undefined => {
	if (!eventDate) return undefined;
	const match = headline?.match(/Makeup (?:date|on) ([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?\b/i);
	if (!match) return undefined;
	const month = monthIndex[match[1]!.toLowerCase()];
	const day = Number(match[2]);
	if (month === undefined || day < 1 || day > 31) return undefined;
	const scheduled = new Date(eventDate);
	if (Number.isNaN(scheduled.getTime())) return undefined;
	const year = scheduled.getUTCFullYear() + (month < scheduled.getUTCMonth() ? 1 : 0);
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// "Doubleheader - Game 1 – Makeup from April 5". A postponed game can carry the same words about the
// doubleheader it was meant to be part of, so the caller only asks for a game that is being played.
export const readDoubleheader = (headline?: string): { doubleheaderGame?: 1 | 2; isMakeup?: true } => {
	const game = headline?.match(/Doubleheader\s*-\s*Game ([12])\b/i)?.[1];
	if (!game) return {};
	return {
		doubleheaderGame: game === '1' ? 1 : 2,
		...(/Makeup from/i.test(headline ?? '') ? { isMakeup: true as const } : {}),
	};
};

// The competitor's `winner` flag follows the score, and a forfeit can go against the team that
// scored more: "St. Thomas-Minnesota wins due to Kansas City Forfeit" came with Kansas City marked
// the winner, 76-69. The note is the only place the real result is written.
const namesOf = ({ team }: CompetitorName): string[] => [team.displayName, team.shortDisplayName, team.location]
	.filter((name): name is string => Boolean(name))
	.map(name => name.toLowerCase());

const onlyMatch = (found: CompetitorName[]): CompetitorName | undefined => (found.length === 1 ? found[0] : undefined);

export const readForfeitWinner = (headline: string | undefined, competitors: CompetitorName[]): string | undefined => {
	if (!headline || competitors.length !== 2) return undefined;

	const forfeited = headline.match(/(?:due to|by)\s+(.+?)\s+forfeit/i)?.[1]?.toLowerCase();
	const loser = forfeited ? onlyMatch(competitors.filter(competitor => namesOf(competitor).some(name => forfeited.includes(name)))) : undefined;
	if (loser) return competitors.find(competitor => competitor !== loser)!.id;

	const named = headline.match(/^(.+?)\s+wins?\b/i)?.[1]?.toLowerCase();
	return named ? onlyMatch(competitors.filter(competitor => namesOf(competitor).some(name => named.startsWith(name))))?.id : undefined;
};

export const readDelayKind = (statusName?: string, description?: string): NonNullable<Game['delayKind']> => {
	const text = `${statusName ?? ''} ${description ?? ''}`;
	if (/rain/i.test(text)) return 'rain';
	if (/weather|lightning/i.test(text)) return 'weather';
	return 'other';
};
