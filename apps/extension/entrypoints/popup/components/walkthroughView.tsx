import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import WalkthroughStepToggle from './walkthroughStepToggle';
import WalkthroughStepTabAssign from './walkthroughStepTabAssign';
import WalkthroughStepAutoSwitch from './walkthroughStepAutoSwitch';
import WalkthroughStepSettings from './walkthroughStepSettings';

type walkthroughStep = 1 | 2 | 3 | 4 | 'done';

interface walkthroughViewProps {
	onComplete: () => void;
}

const brandColors = ['#F75C03', '#2274A5', '#D90368', '#00CC66', '#F1C40F'];

const DoneScreen = ({ onComplete }: { onComplete: () => void }) => {
	useEffect(() => {
		const run = async () => {
			const confetti = (await import('canvas-confetti')).default;
			confetti({
				particleCount: 120,
				spread: 70,
				origin: { y: 0.55 },
				colors: brandColors,
			});
		};
		void run();
	}, []);

	return (
		<div className='popup-container d-flex flex-column align-items-center justify-content-center text-center gap-3'>
			<img
				src='/images/full_logo_white_on_transparent.svg'
				alt='ArenaSwap'
				className='arenaswap-logo mb-2'
			/>
			<div className='fw-bold fs-3 lh-sm'>{i18n.t('walkthrough.allSet')}</div>
			<div className='text-body-secondary lh-base'>
				{i18n.t('walkthrough.allSetSubtitle')}
			</div>
			<button type='button' className='btn btn-primary w-100 mt-2' onClick={onComplete}>
				{i18n.t('walkthrough.letsGo')} <i className='bi bi-arrow-right' />
			</button>
		</div>
	);
};

const walkthroughView = ({ onComplete }: walkthroughViewProps) => {
	const [step, setStep] = useState<walkthroughStep>(1);

	const next = () => setStep(prev => {
		if (prev === 1) return 2;
		if (prev === 2) return 3;
		if (prev === 3) return 4;
		return 'done';
	});

	const back = (from: walkthroughStep) => {
		if (from === 2) setStep(1);
		else if (from === 3) setStep(2);
		else if (from === 4) setStep(3);
	};

	return (
		<div className='popup-root'>
			<div className='popup-view-shell'>
				{step === 1 && <WalkthroughStepToggle onNext={next} />}
				{step === 2 && <WalkthroughStepTabAssign onNext={next} onBack={() => back(2)} />}
				{step === 3 && <WalkthroughStepAutoSwitch onNext={next} onBack={() => back(3)} />}
				{step === 4 && <WalkthroughStepSettings onNext={next} onBack={() => back(4)} />}
				{step === 'done' && <DoneScreen onComplete={onComplete} />}
			</div>
		</div>
	);
};

export default walkthroughView;
