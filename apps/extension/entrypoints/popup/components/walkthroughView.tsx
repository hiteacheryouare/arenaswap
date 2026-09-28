import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import Wordmark from '@arenaswap/ui/src/components/wordmark';
import OnboardingStep from './onboardingStep';
import { walkthroughSteps } from './walkthroughFrame';
import WalkthroughStepToggle from './walkthroughStepToggle';
import WalkthroughStepPowerScore from './walkthroughStepPowerScore';
import WalkthroughStepTabAssign from './walkthroughStepTabAssign';
import WalkthroughStepAutoSwitch from './walkthroughStepAutoSwitch';
import WalkthroughStepSettings from './walkthroughStepSettings';
import WalkthroughStepGameDetail from './walkthroughStepGameDetail';
import WalkthroughStepLeaguesFavorites from './walkthroughStepLeaguesFavorites';
import WalkthroughStepReAccess from './walkthroughStepReAccess';

type walkthroughStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'done';

interface walkthroughViewProps {
	onComplete: () => void;
}

const brandColors = ['#F75C03', '#3E9BD1', '#D90368', '#00CC66', '#F1C40F'];

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
		<OnboardingStep
			step={walkthroughSteps}
			total={walkthroughSteps}
			className='ob-finale'
			footer={<button type='button' className='btn btn-primary' onClick={onComplete}>{i18n.t('walkthrough.letsGo')}</button>}
		>
			<div className='ob-finale-body'>
				<Wordmark className='ob-wordmark' />
				<div>
					<h2 className='ob-title'>{i18n.t('walkthrough.allSet')}</h2>
					<p className='ob-lede'>{i18n.t('walkthrough.allSetSubtitle')}</p>
				</div>
			</div>
		</OnboardingStep>
	);
};

const walkthroughView = ({ onComplete }: walkthroughViewProps) => {
	const [step, setStep] = useState<walkthroughStep>(1);
	const [initialSubStep, setInitialSubStep] = useState<number>(0);

	const next = () => {
		if (step === 'done') return;
		if (step === 1) setInitialSubStep(0);
		setStep(step === 8 ? 'done' : ((step + 1) as walkthroughStep));
	};

	const back = (from: Exclude<walkthroughStep, 1 | 'done'>) => {
		// Back from tab assignment lands on the last PowerScore sub-step, not the first.
		if (from === 3) setInitialSubStep(11);
		setStep((from - 1) as walkthroughStep);
	};

	return (
		<div className='popup-root'>
			<div key={step === 2 ? `2-${initialSubStep}` : step} className='popup-view-shell'>
				{step === 1 && <WalkthroughStepToggle onNext={next} />}
				{step === 2 && <WalkthroughStepPowerScore onNext={next} onBack={() => back(2)} initialSubStep={initialSubStep} />}
				{step === 3 && <WalkthroughStepTabAssign onNext={next} onBack={() => back(3)} />}
				{step === 4 && <WalkthroughStepAutoSwitch onNext={next} onBack={() => back(4)} />}
				{step === 5 && <WalkthroughStepSettings onNext={next} onBack={() => back(5)} />}
				{step === 6 && <WalkthroughStepGameDetail onNext={next} onBack={() => back(6)} />}
				{step === 7 && <WalkthroughStepLeaguesFavorites onNext={next} onBack={() => back(7)} />}
				{step === 8 && <WalkthroughStepReAccess onNext={next} onBack={() => back(8)} />}
				{step === 'done' && <DoneScreen onComplete={onComplete} />}
			</div>
		</div>
	);
};

export default walkthroughView;
