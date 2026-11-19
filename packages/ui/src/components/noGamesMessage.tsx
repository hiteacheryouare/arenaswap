import { useState } from 'react';
import { useT, type Translator } from './i18nContext';
import RefreshButton from './refreshButton';

interface noGamesMessageProps {
	onOpenSetup?: () => void;
	onRefresh: () => unknown;
	offseasonLine?: string | null;
}

const noGamesMessages = (t: Translator) => [
	{ title: t('noGames.m1.title'), sub: t('noGames.m1.sub') },
	{ title: t('noGames.m2.title'), sub: t('noGames.m2.sub') },
	{ title: t('noGames.m3.title'), sub: t('noGames.m3.sub') },
	{ title: t('noGames.m4.title'), sub: t('noGames.m4.sub') },
	{ title: t('noGames.m5.title'), sub: t('noGames.m5.sub') },
	{ title: t('noGames.m6.title'), sub: t('noGames.m6.sub') },
	{ title: t('noGames.m7.title'), sub: t('noGames.m7.sub') },
];

const noGamesMessage = ({ onOpenSetup, onRefresh, offseasonLine }: noGamesMessageProps) => {
	const t = useT();
	const [msg] = useState(() => {
		const messages = noGamesMessages(t);
		return messages[Math.floor(Math.random() * messages.length)]!;
	});

	return (
		<div className='mt-5 text-center popup-no-games-wrap'>
			<div className='fw-bold fg-body mb-1 popup-no-games-title'>{msg.title}</div>
			<div className='popup-no-games-sub mb-3'>{offseasonLine ?? msg.sub}</div>
			<div className='d-flex justify-content-center gap-5'>
				<RefreshButton label={t('empty.refresh')} className='btn btn-link btn-sm p-0 popup-settings-link' onRefresh={onRefresh} />
				{onOpenSetup && <button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onOpenSetup}>{t('empty.settings')}</button>}
			</div>
		</div>
	);
};

export default noGamesMessage;
