import type { Team } from '@arenaswap/core/types';
import { useT } from './i18nContext';

interface favoriteStarProps {
	team: Team;
	favorited: boolean;
	onToggle?: () => void;
}

// A button where the team can be starred from here, otherwise a filled mark on favourites only.
const FavoriteStar = ({ team, favorited, onToggle }: favoriteStarProps) => {
	const t = useT();
	if (!onToggle) return favorited ? <i className='bi bi-star-fill as-star-mark' role='img' aria-label={t('gameCard.favorited')} /> : null;
	return (
		<button
			type='button'
			className='as-star'
			data-favorited={favorited}
			data-team-star='true'
			aria-pressed={favorited}
			aria-label={favorited ? t('gameCard.removeFromFavorites', { team: team.abbreviation }) : t('gameCard.addToFavorites', { team: team.abbreviation })}
			title={favorited ? t('gameCard.favorited') : t('gameCard.addToFavoritesShort')}
			onClick={onToggle}
		>
			<i className={`bi ${favorited ? 'bi-star-fill' : 'bi-star'}`} aria-hidden='true' />
		</button>
	);
};

export default FavoriteStar;
