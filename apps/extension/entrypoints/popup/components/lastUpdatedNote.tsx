import { useEffect, useState } from 'react';
import { i18n } from '#i18n';

interface lastUpdatedNoteProps {
	updatedAt: number | undefined;
}

const secondMs = 1_000;
const justNowSeconds = 5;

export const formatLastUpdated = (updatedAt: number, nowMs: number): string => {
	const seconds = Math.max(0, Math.floor((nowMs - updatedAt) / secondMs));
	if (seconds < justNowSeconds) return i18n.t('detail.lastUpdatedJustNow');
	if (seconds < 60) return i18n.t('detail.lastUpdatedSeconds', seconds);
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return i18n.t('gameCard.staleMinutes', minutes);
	return i18n.t('gameCard.staleHours', Math.floor(minutes / 60));
};

const lastUpdatedNote = ({ updatedAt }: lastUpdatedNoteProps) => {
	const [nowMs, setNowMs] = useState(Date.now);

	useEffect(() => {
		if (updatedAt === undefined) return;
		setNowMs(Date.now());
		const timer = setInterval(() => setNowMs(Date.now()), secondMs);
		return () => clearInterval(timer);
	}, [updatedAt]);

	if (updatedAt === undefined) return null;

	return (
		<div className='d-flex justify-content-center py-3 game-meta'>
			<time className='d-flex align-items-center gap-1 text-center game-meta-venue' dateTime={new Date(updatedAt).toISOString()}>
				<i className='bi bi-clock-history' aria-hidden='true' />
				{formatLastUpdated(updatedAt, nowMs)}
			</time>
		</div>
	);
};

export default lastUpdatedNote;
