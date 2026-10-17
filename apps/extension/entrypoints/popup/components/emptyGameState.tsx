import { i18n } from '#i18n';
import NoGamesMessage from './noGamesMessage';

interface emptyGameStateProps {
	noLeaguesSelected: boolean;
	noGames: boolean;
	onOpenSetup: () => void;
	onRefresh: () => unknown;
}

const emptyGameState = ({ noLeaguesSelected, noGames, onOpenSetup, onRefresh }: emptyGameStateProps) => {
	if (noLeaguesSelected) {
		return (
			<div className='text-center rounded mt-3 mb-5 p-5 popup-empty-leagues'>
				<h2 className='fw-bold fg-body lh-xs mb-3 popup-empty-leagues-title'>{i18n.t('empty.leaguesTitle')}</h2>
				<p className='mb-3 lh-xs popup-empty-leagues-copy'>
					{i18n.t('empty.leaguesCopy')}
				</p>
				<button className='btn btn-solid theme-primary btn-lg w-100' onClick={onOpenSetup}>{i18n.t('empty.selectLeagues')}</button>
			</div>
		);
	}

	if (noGames) return <NoGamesMessage onOpenSetup={onOpenSetup} onRefresh={onRefresh} />;

	return null;
};

export default emptyGameState;
