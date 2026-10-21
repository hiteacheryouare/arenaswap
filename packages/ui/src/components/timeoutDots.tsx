import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { useT } from './i18nContext';

interface timeoutDotsProps {
	remaining: number;
	// What a full allotment looks like in this sport: 3 a half in gridiron, 7 a game in the NBA.
	max?: number;
	teamAbbreviation: string;
}

const gridironTimeouts = 3;

// Overtime hands out fewer: two a team in NFL regular-season overtime and one per college overtime
// period. NFL playoff overtime plays halves, so it keeps three.
export const gridironTimeoutAllotment = (game: Pick<Game, 'league' | 'period' | 'isPostseason'>): number => {
	const regular = leagueConfigMap[game.league]?.regularPeriods;
	if (regular === undefined || game.period <= regular) return gridironTimeouts;
	if (game.league === 'ncaaf') return 1;
	if (game.league === 'nfl' && !game.isPostseason) return 2;
	return gridironTimeouts;
};

const basketballTimeoutAllotments: Partial<Record<LeagueId, number>> = { nba: 7, wnba: 5 };

export const basketballTimeoutAllotment = (league: LeagueId): number => basketballTimeoutAllotments[league] ?? 4;

// A full allotment, so the dots can show the ones already spent. Undefined in the sports that
// draw no dots.
export const timeoutAllotment = (game: Pick<Game, 'sportType' | 'league' | 'period' | 'isPostseason'>): number | undefined => {
	if (game.sportType === 'football') return gridironTimeoutAllotment(game);
	if (game.sportType === 'basketball') return basketballTimeoutAllotment(game.league);
	return undefined;
};

// Past four the dots shrink so the NBA's seven still fit under a team name. Past seven they would
// not, and the row says the number instead.
const maxFullSizeDots = 4;
const maxDrawableDots = 7;

const timeoutDots = ({ remaining, max = gridironTimeouts, teamAbbreviation }: timeoutDotsProps) => {
	const t = useT();
	if (!Number.isFinite(remaining) || remaining < 0) return null;

	const label = t('gameCard.timeoutsRemaining', remaining, { team: teamAbbreviation });
	const total = Math.max(max, remaining);

	// A count too wide to draw still has to be readable, so it says the number instead of
	// silently rendering a shorter row than the sport actually allows.
	if (total > maxDrawableDots) {
		return (
			<span className='timeout-dots timeout-dots-numeric' title={label} aria-label={label}>
				{t('gameCard.timeoutsShort', { count: remaining })}
			</span>
		);
	}

	return (
		<span className={`timeout-dots${total > maxFullSizeDots ? ' is-compact' : ''}`} role='img' title={label} aria-label={label}>
			{Array.from({ length: total }, (_, i) => (
				<i
					key={i}
					// Same pair and the same `.is-empty` hook as BsoIndicator, so the hero's dark
					// re-toning already covers the unfilled half.
					className={`bi ${i < remaining ? 'bi-circle-fill' : 'bi-circle'} timeout-dot${i < remaining ? '' : ' is-empty'}`}
					aria-hidden='true'
				/>
			))}
		</span>
	);
};

export default timeoutDots;
