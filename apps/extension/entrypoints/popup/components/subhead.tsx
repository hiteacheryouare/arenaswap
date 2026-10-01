import { i18n } from '#i18n';
import type { MouseEvent, ReactNode } from 'react';

interface subheadProps {
	title: string;
	onBack: () => void;
	// Controls of the page's own, which a click on doesn't count as going back.
	trailing?: ReactNode;
}

// A sub-page's top bar, which goes back from anywhere on it, as v2's did. The arrow stays a real
// button so the keyboard has something to land on, and a click on it bubbles up to the bar.
const subhead = ({ title, onBack, trailing }: subheadProps) => {
	const onClick = (event: MouseEvent<HTMLElement>) => {
		if ((event.target as Element).closest('.as-subhead-trailing')) return;
		onBack();
	};
	return (
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<header className='as-subhead is-back' onClick={onClick}>
			<button type='button' className='as-icon st-back' aria-label={i18n.t('setup.back')}>
				<i className='bi bi-arrow-left' aria-hidden='true' />
			</button>
			<h2>{title}</h2>
			{trailing && <span className='as-subhead-trailing'>{trailing}</span>}
		</header>
	);
};

export default subhead;
