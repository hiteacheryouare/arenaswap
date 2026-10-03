import { useState } from 'react';
import { i18n } from '#i18n';
import type { LeagueId } from '@arenaswap/core/types';
import WalkthroughStepToggle from './walkthroughStepToggle';
import WalkthroughStepPowerScore from './walkthroughStepPowerScore';
import WalkthroughStepTabAssign from './walkthroughStepTabAssign';
import WalkthroughStepAutoSwitch from './walkthroughStepAutoSwitch';
import WalkthroughStepSettings from './walkthroughStepSettings';
import WalkthroughStepGameDetail from './walkthroughStepGameDetail';
import WalkthroughStepLeaguesFavorites from './walkthroughStepLeaguesFavorites';
import WalkthroughStepReAccess from './walkthroughStepReAccess';

type walkthroughStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface walkthroughViewProps {
	onComplete: () => void;
	leagues?: readonly LeagueId[];
}

const brandColors = ['#F75C03', '#3E9BD1', '#D90368', '#00CC66', '#F1C40F'];

// Onboarding has just said "You're all set", so the tour ends on its last step rather than on a
// second finish screen. canvas-confetti draws on a canvas of its own on the body, so the burst
// keeps falling over the games list the tour hands back to.
const celebrate = async () => {
	const confetti = (await import('canvas-confetti')).default;
	void confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 }, colors: brandColors, disableForReducedMotion: true });
};

const walkthroughView = ({ onComplete, leagues }: walkthroughViewProps) => {
	const [step, setStep] = useState<walkthroughStep>(1);
	const [initialSubStep, setInitialSubStep] = useState<number>(0);

	const next = () => setStep(prev => {
		if (prev === 1) {
			setInitialSubStep(0);
			return 2;
		}
		if (prev === 2) return 3;
		if (prev === 3) return 4;
		if (prev === 4) return 5;
		if (prev === 5) return 6;
		if (prev === 6) return 7;
		return 8;
	});

	const finish = () => {
		void celebrate();
		onComplete();
	};

	const back = (from: walkthroughStep) => {
		if (from === 2) setStep(1);
		else if (from === 3) {
			setInitialSubStep(11);
			setStep(2);
		}
		else if (from === 4) setStep(3);
		else if (from === 5) setStep(4);
		else if (from === 6) setStep(5);
		else if (from === 7) setStep(6);
		else if (from === 8) setStep(7);
	};

	return (
		<div className='popup-root'>
			<div className='popup-view-shell position-relative'>
				<button type='button' className='btn btn-link btn-sm walkthrough-skip' onClick={onComplete}>
					{i18n.t('walkthrough.skipTour')}
				</button>
				{step === 1 && <WalkthroughStepToggle onNext={next} />}
				{step === 2 && <WalkthroughStepPowerScore key={`step2-${initialSubStep}`} onNext={next} onBack={() => back(2)} initialSubStep={initialSubStep} />}
				{step === 3 && <WalkthroughStepTabAssign onNext={next} onBack={() => back(3)} />}
				{step === 4 && <WalkthroughStepAutoSwitch onNext={next} onBack={() => back(4)} />}
				{step === 5 && <WalkthroughStepSettings onNext={next} onBack={() => back(5)} leagues={leagues} />}
				{step === 6 && <WalkthroughStepGameDetail onNext={next} onBack={() => back(6)} />}
				{step === 7 && <WalkthroughStepLeaguesFavorites onNext={next} onBack={() => back(7)} />}
				{step === 8 && <WalkthroughStepReAccess onNext={finish} onBack={() => back(8)} />}
			</div>
		</div>
	);
};

export default walkthroughView;
