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
			<div className='text-center rounded mt-2 mb-3 p-3 popup-empty-leagues'>
				<h2 className='fw-bold text-white lh-sm mb-2 popup-empty-leagues-title'>{i18n.t('empty.leaguesTitle')}</h2>
				<p className='mb-2 lh-sm popup-empty-leagues-copy'>
					{i18n.t('empty.leaguesCopy')}
				</p>
				<button className='btn btn-primary btn-lg w-100' onClick={onOpenSetup}>{i18n.t('empty.selectLeagues')}</button>
			</div>
		);
	}

	if (noGames) return <NoGamesMessage onOpenSetup={onOpenSetup} onRefresh={onRefresh} />;

	return null;
};

export default emptyGameState;
