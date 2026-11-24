import type { Game, LeagueId } from '@arenaswap/core/types';
import { i18n } from '#i18n';

export interface leagueGroup { league: LeagueId; games: Game[] }
export interface dateGroup { key: string; dateLabel: string; games: Game[] }

const toKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const formatDateLabel = (dateStr: string, locale?: string): string => {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	const gameDate = new Date(dateStr);
	if (toKey(gameDate) === toKey(today)) return i18n.t('date.today');
	if (toKey(gameDate) === toKey(tomorrow)) return i18n.t('date.tomorrow');
	return gameDate.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const groupByDate = (games: Game[], locale?: string): dateGroup[] => {
	const groups = new Map<string, Game[]>();
	for (const game of games) {
		const key = game.startTime
			? new Date(game.startTime).toDateString()
			: 'Unknown';
		const group = groups.get(key) ?? [];
		group.push(game);
		groups.set(key, group);
	}
	return Array.from(groups.entries()).map(([key, grpGames]) => {
		const first = grpGames[0];
		return {
			key,
			dateLabel: first?.startTime ? formatDateLabel(first.startTime, locale) : i18n.t('date.upcoming'),
			games: grpGames,
		};
	});
};

// Up Next pages one day at a time, and the day list is rebuilt on every poll: games kick off and
// leave the pre list, the day range setting moves, midnight rolls the labels forward. The page is
// therefore held as a date key rather than an index, so the popup cannot silently land you on a
// different date than the one you navigated to.
export const resolveSelectedDayIndex = (days: dateGroup[], selectedKey: string | null): number => {
	if (!selectedKey) return 0;
	const index = days.findIndex(d => d.key === selectedKey);
	return index >= 0 ? index : 0;
};

export const groupByLeague = (games: Game[]): leagueGroup[] => (
	games.reduce<leagueGroup[]>((groups, game) => {
		const last = groups[groups.length - 1];
		if (last?.league === game.league) {
			last.games.push(game);
			return groups;
		}
		return [...groups, { league: game.league, games: [game] }];
	}, [])
);
