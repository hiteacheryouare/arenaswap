import FavoriteTeamsPage from '../favoriteTeamsPage';
import type { setupViewProps } from '../setupView';

interface settingsFavoritesPageProps extends Pick<setupViewProps, 'prefs' | 'favoriteTeamIds' | 'rivalTeamIds' | 'onToggleFavoriteTeam' | 'onToggleRivalTeam'> {
}

const settingsFavoritesPage = ({ prefs, favoriteTeamIds, rivalTeamIds, onToggleFavoriteTeam, onToggleRivalTeam }: settingsFavoritesPageProps) => (
	<FavoriteTeamsPage
		enabledLeagues={prefs.enabledLeagues}
		favoriteTeamIds={favoriteTeamIds}
		rivalTeamIds={rivalTeamIds}
		onToggleFavoriteTeam={onToggleFavoriteTeam}
		onToggleRivalTeam={onToggleRivalTeam}
	/>
);

export default settingsFavoritesPage;
