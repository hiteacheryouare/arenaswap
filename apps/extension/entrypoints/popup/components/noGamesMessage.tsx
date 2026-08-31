import { useState } from 'react';
import { i18n } from '#i18n';
import { getRandomNoGamesMessage } from '../popupHelpers';

interface noGamesMessageProps {
	onOpenSetup: () => void;
	onRefresh: () => void;
}

// Rendered only while the empty state is showing, so the message is tied to the mount rather than to
// a render body that a settling SWR mutate re-enters several times.
const noGamesMessage = ({ onOpenSetup, onRefresh }: noGamesMessageProps) => {
	const [msg] = useState(getRandomNoGamesMessage);

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
};

export default noGamesMessage;
