import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '#i18n';

interface standbyTestCardProps {
	// Which end of the slider opened it. At 0 standby can never fire; at 100 it always does.
	limit: 'min' | 'max';
	onClose: () => void;
}

// 75% SMPTE bars, in the order every broadcast test card has used them since 1976.
const barColors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];

const standbyTestCard = ({ limit, onClose }: standbyTestCardProps) => {
	const handleKeyDown = useCallback((event: KeyboardEvent) => {
		if (event.key === 'Escape') onClose();
	}, [onClose]);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

	return createPortal(
		<div
			role='button'
			tabIndex={0}
			className='stc-overlay'
			onClick={onClose}
			onKeyDown={event => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				onClose();
			}}
		>
			<div className='stc-bars'>
				{barColors.map(color => <span key={color} style={{ backgroundColor: color }} />)}
			</div>
			<div className='stc-bars stc-bars-inverted'>
				{barColors.toReversed().map(color => <span key={color} style={{ backgroundColor: color }} />)}
			</div>
			<div className='stc-card'>
				<div className='stc-heading'>{i18n.t('standbyTestCard.heading')}</div>
				<p className='stc-body'>{i18n.t(limit === 'max' ? 'standbyTestCard.atMax' : 'standbyTestCard.atMin')}</p>
				<div className='stc-dismiss'>{i18n.t('standbyTestCard.dismiss')}</div>
			</div>
			<div className='stc-roll' aria-hidden='true' />
		</div>,
		document.body,
	);
};

export default standbyTestCard;
