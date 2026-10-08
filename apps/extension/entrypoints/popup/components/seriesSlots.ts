import type { SeriesInfo } from './useSummaryData';

export type SeriesSlot =
	| { kind: 'won'; teamId: string | undefined }
	| { kind: 'upcoming' }
	| { kind: 'ifNecessary' }
	| { kind: 'notNeeded' };

// A regular-season set plays every game whatever the score, so only a playoff series can end
// early. Of its unplayed games, the ones the leader could still win the series in are certain to
// be played; the rest wait on the trailing side, and once a side has clinched none are played.
export const seriesSlots = (info: SeriesInfo): SeriesSlot[] => {
	const total = info.totalCompetitions ?? 0;
	// ESPN returns future games first and completed games last.
	const winners = (info.events ?? [])
		.filter(event => event.statusType?.completed)
		.slice(0, total)
		.map(event => event.competitors?.find(competitor => competitor.winner)?.team?.id);
	const won: SeriesSlot[] = winners.map(teamId => ({ kind: 'won', teamId }));
	const unplayed = total - won.length;

	if (info.type !== 'playoff') {
		return [...won, ...Array.from({ length: unplayed }, (): SeriesSlot => ({ kind: 'upcoming' }))];
	}

	const winsByTeam = new Map<string, number>();
	for (const teamId of winners) {
		if (teamId !== undefined) winsByTeam.set(teamId, (winsByTeam.get(teamId) ?? 0) + 1);
	}
	const winsNeeded = Math.floor(total / 2) + 1;
	const leaderWins = Math.max(0, ...winsByTeam.values());
	const clinched = leaderWins >= winsNeeded;
	const certain = clinched ? 0 : winsNeeded - leaderWins;
	const rest: SeriesSlot[] = Array.from({ length: unplayed }, (_, i) => {
		if (i < certain) return { kind: 'upcoming' };
		return { kind: clinched ? 'notNeeded' : 'ifNecessary' };
	});
	return [...won, ...rest];
};
