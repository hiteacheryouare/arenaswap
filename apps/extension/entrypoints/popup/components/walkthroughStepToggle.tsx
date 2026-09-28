import { useState } from 'react';
import { i18n } from '#i18n';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import WalkthroughFrame from './walkthroughFrame';

interface walkthroughStepToggleProps {
	onNext: () => void;
}

const noop = () => {};

const walkthroughStepToggle = ({ onNext }: walkthroughStepToggleProps) => {
	const [enabled, setEnabled] = useState(true);

	return (
		<WalkthroughFrame
			step={1}
			stepLabel={i18n.t('stepToggle.step', [1, 8])}
			title={i18n.t('stepToggle.title')}
			lede={i18n.t('stepToggle.subtitle')}
			nextLabel={i18n.t('stepToggle.next')}
			onNext={onNext}
		>
			<div className='wt-screen wt-toggle'>
				<PopupHeader
					enabled={enabled}
					interactive='toggle'
					toggleId='wt-toggle-demo'
					onToggleEnabled={() => setEnabled(on => !on)}
					onOpenSettings={noop}
					onStartTour={noop}
					onOpenGuide={noop}
				/>
				<span className='wt-try' aria-hidden='true'>{i18n.t('stepToggle.tryIt')}</span>
				<p className={`wt-state${enabled ? ' is-on' : ''}`} aria-live='polite'>
					{enabled ? i18n.t('stepToggle.stateOn') : i18n.t('stepToggle.stateOff')}
				</p>
			</div>
			<p className='wt-body'>
				{i18n.t('stepToggle.bodyBeforeOn')}<strong>{i18n.t('stepToggle.bodyOn')}</strong>{i18n.t('stepToggle.bodyAfterOn')}
			</p>
		</WalkthroughFrame>
	);
};

export default walkthroughStepToggle;
