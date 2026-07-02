import { i18n } from '#i18n';
import { getRandomNoGamesMessage } from '../popupHelpers';

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

	if (noGames) {
		const msg = getRandomNoGamesMessage();
		return (
			<div className='mt-3 text-center popup-no-games-wrap'>
				<div className='fw-bold text-body mb-1 popup-no-games-title'>{msg.title}</div>
				<div className='popup-no-games-sub mb-2'>{msg.sub}</div>
				<div className='d-flex justify-content-center gap-3'>
					<button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onRefresh}>{i18n.t('empty.refresh')}</button>
					<button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onOpenSetup}>{i18n.t('empty.settings')}</button>
				</div>
			</div>
		);
	}

	return null;
};

export default emptyGameState;
