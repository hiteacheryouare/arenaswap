import { i18n } from '#i18n';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import WalkthroughFrame from './walkthroughFrame';

interface walkthroughStepReAccessProps {
	onNext: () => void;
	onBack: () => void;
}

const noop = () => {};

const walkthroughStepReAccess = ({ onNext, onBack }: walkthroughStepReAccessProps) => (
	<WalkthroughFrame
		step={8}
		stepLabel={i18n.t('stepReAccess.step', [8, 8])}
		title={i18n.t('stepReAccess.title')}
		lede={i18n.t('stepReAccess.subtitle')}
		backLabel={i18n.t('stepReAccess.back')}
		onBack={onBack}
		nextLabel={i18n.t('stepReAccess.next')}
		onNext={onNext}
	>
		<div className='wt-screen wt-reaccess'>
			<PopupHeader
				enabled
				interactive={false}
				toggleId='wt-reaccess-toggle'
				onToggleEnabled={noop}
				onOpenSettings={noop}
				onStartTour={noop}
				onOpenGuide={noop}
			/>
			<span className='wt-callout'>
				<i className='bi bi-arrow-up' aria-hidden='true' />
				{i18n.t('stepReAccess.callout')}
			</span>
		</div>
		<p className='wt-body'>{i18n.t('stepReAccess.body')}</p>
	</WalkthroughFrame>
);

export default walkthroughStepReAccess;
