import { useState } from 'react';
import { i18n } from '#i18n';
import { getRandomNoGamesMessage } from '../popupHelpers';

interface noGamesMessageProps {
	// Absent where there is no settings screen to open, as in the Guide's own tab.
	onOpenSetup?: () => void;
	onRefresh: () => void;
}

// Rendered only while the empty state is showing, so the message is tied to the mount rather than to
// a render body that a settling SWR mutate re-enters several times.
const noGamesMessage = ({ onOpenSetup, onRefresh }: noGamesMessageProps) => {
	const [msg] = useState(getRandomNoGamesMessage);

	return (
		<div className='as-empty popup-no-games-wrap'>
			<div className='as-empty-title popup-no-games-title'>{msg.title}</div>
			<div className='as-empty-copy popup-no-games-sub'>{msg.sub}</div>
			<div className='as-empty-actions'>
				<button type='button' className='btn btn-quiet popup-settings-link' onClick={onRefresh}>{i18n.t('empty.refresh')}</button>
				{onOpenSetup && <button type='button' className='btn btn-quiet popup-settings-link' onClick={onOpenSetup}>{i18n.t('empty.settings')}</button>}
			</div>
		</div>
	);
};

export default noGamesMessage;
