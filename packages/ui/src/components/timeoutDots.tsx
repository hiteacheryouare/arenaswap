import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { useT } from './i18nContext';

interface timeoutDotsProps {
	remaining: number;
	max?: number;
	teamAbbreviation: string;
}

const gridironTimeouts = 3;
const ncaafOvertimeTimeouts = 1;
const nflRegularSeasonOvertimeTimeouts = 2;

export const gridironTimeoutAllotment = (game: Pick<Game, 'league' | 'period' | 'isPostseason'>): number => {
	const regular = leagueConfigMap[game.league]?.regularPeriods;
	if (regular === undefined || game.period <= regular) return gridironTimeouts;
	if (game.league === 'ncaaf') return ncaafOvertimeTimeouts;
	if (game.league === 'nfl' && !game.isPostseason) return nflRegularSeasonOvertimeTimeouts;
	return gridironTimeouts;
};

const basketballTimeoutAllotments: Partial<Record<LeagueId, number>> = { nba: 7, wnba: 5 };

export const basketballTimeoutAllotment = (league: LeagueId): number => basketballTimeoutAllotments[league] ?? 4;

export const timeoutAllotment = (game: Pick<Game, 'sportType' | 'league' | 'period' | 'isPostseason'>): number | undefined => {
	if (game.sportType === 'football') return gridironTimeoutAllotment(game);
	if (game.sportType === 'basketball') return basketballTimeoutAllotment(game.league);
	return undefined;
};

const maxFullSizeDots = 4;
const maxDrawableDots = 7;

const timeoutDots = ({ remaining, max = gridironTimeouts, teamAbbreviation }: timeoutDotsProps) => {
	const t = useT();
	if (!Number.isFinite(remaining) || remaining < 0) return null;

	const label = t('gameCard.timeoutsRemaining', remaining, { team: teamAbbreviation });
	const total = Math.max(max, remaining);

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
					className={`bi ${i < remaining ? 'bi-circle-fill' : 'bi-circle'} timeout-dot${i < remaining ? '' : ' is-empty'}`}
					aria-hidden='true'
				/>
			))}
		</span>
	);
};

export default timeoutDots;
