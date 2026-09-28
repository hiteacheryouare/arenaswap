import { i18n } from '#i18n';
import NoGamesMessage from './noGamesMessage';

interface emptyGameStateProps {
	noLeaguesSelected: boolean;
	noGames: boolean;
	onOpenSetup: () => void;
	onRefresh: () => void;
}

const emptyGameState = ({ noLeaguesSelected, noGames, onOpenSetup, onRefresh }: emptyGameStateProps) => {
	if (noLeaguesSelected) {
		return (
			<div className='as-empty popup-empty-leagues'>
				<h2 className='popup-empty-leagues-title'>{i18n.t('empty.leaguesTitle')}</h2>
				<p className='popup-empty-leagues-copy'>{i18n.t('empty.leaguesCopy')}</p>
				<div className='as-empty-actions'>
					<button type='button' className='btn btn-primary w-100' onClick={onOpenSetup}>{i18n.t('empty.selectLeagues')}</button>
				</div>
			</div>
		);
	}

	if (noGames) return <NoGamesMessage onOpenSetup={onOpenSetup} onRefresh={onRefresh} />;

	return null;
};

export default emptyGameState;
