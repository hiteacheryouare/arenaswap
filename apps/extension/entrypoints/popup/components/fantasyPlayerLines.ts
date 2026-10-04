import type { FantasyRosterEntry } from '@arenaswap/core';
import type { SportType } from '@arenaswap/core/types';
import { buildSections, type BoxColumnLabelKey, type BoxHeadingKey } from './boxScoreColumns';
import type { BoxScore } from './boxScoreParse';

export interface playerStatGroup {
	headingKey: BoxHeadingKey;
	stats: { labelKey: BoxColumnLabelKey; value: string }[];
}

export interface rosterPlayerLine {
	entry: FantasyRosterEntry;
	// The box score's own position for this game, which beats the roster's coarser one.
	position: string;
	didNotPlay: boolean;
	groups: playerStatGroup[];
}

// Each rostered player's row in this game's box score, read through the same condensed columns the
// Box tab shows, so a stat here is always one the reader can find there.
export const rosterPlayerLines = (sportType: SportType | undefined, boxScore: BoxScore, players: readonly FantasyRosterEntry[]): rosterPlayerLine[] => {
	const sections = [boxScore.away, boxScore.home].flatMap(team => (team ? buildSections(sportType, team) : []));
	return players.map(entry => {
		const groups: playerStatGroup[] = [];
		let position = '';
		let didNotPlay = false;
		if (entry.position !== 'DST') {
			for (const section of sections) {
				const athlete = section.athletes.find(candidate => candidate.id === entry.athleteId);
				if (!athlete) continue;
				position ||= athlete.position;
				didNotPlay ||= athlete.didNotPlay;
				const stats = section.columns
					.map(column => ({ labelKey: column.labelKey, value: athlete.stats[column.index] ?? '' }))
					.filter(stat => stat.value !== '' && stat.value !== '--');
				if (stats.length > 0) groups.push({ headingKey: section.headingKey, stats });
			}
		}
		return { entry, position, didNotPlay, groups };
	});
};
