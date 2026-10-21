import { useState } from 'react';
import { i18n } from '#i18n';
import type { LeagueId, ScoringModeChoice } from '@arenaswap/core/types';
import { displayModeOf } from '@arenaswap/ui/src/components/scoringModeMeta';
import WalkthroughStepToggle from './walkthroughStepToggle';
import WalkthroughStepPowerScore, { lastPowerScoreSubStep } from './walkthroughStepPowerScore';
import WalkthroughStepTabAssign from './walkthroughStepTabAssign';
import WalkthroughStepAutoSwitch from './walkthroughStepAutoSwitch';
import WalkthroughStepFullScreen from './walkthroughStepFullScreen';
import WalkthroughStepSettings from './walkthroughStepSettings';
import WalkthroughStepGameDetail from './walkthroughStepGameDetail';
import WalkthroughStepLeaguesFavorites from './walkthroughStepLeaguesFavorites';
import WalkthroughStepReAccess from './walkthroughStepReAccess';

type walkthroughStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface walkthroughViewProps {
	onComplete: () => void;
	leagues?: readonly LeagueId[];
	scoringMode?: ScoringModeChoice;
}

const brandColors = ['#F75C03', '#3E9BD1', '#D90368', '#00CC66', '#F1C40F'];

// Onboarding has just said "You're all set", so the tour ends on its last step rather than on a
// second finish screen. canvas-confetti draws on a canvas of its own on the body, so the burst
// keeps falling over the games list the tour hands back to.
const celebrate = async () => {
	const confetti = (await import('canvas-confetti')).default;
	void confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 }, colors: brandColors, disableForReducedMotion: true });
};

const walkthroughView = ({ onComplete, leagues, scoringMode }: walkthroughViewProps) => {
	const modeId = displayModeOf(scoringMode);
	const [step, setStep] = useState<walkthroughStep>(1);
	const [initialSubStep, setInitialSubStep] = useState<number>(0);

	const next = () => {
		if (step === 1) setInitialSubStep(0);
		setStep(prev => Math.min(prev + 1, 9) as walkthroughStep);
	};

	const finish = () => {
		void celebrate();
		onComplete();
	};

	// Stepping back into the PowerScore step lands on its last sub-step, the one just left.
	const back = (from: walkthroughStep) => {
		if (from === 1) return;
		if (from === 3) setInitialSubStep(lastPowerScoreSubStep(modeId));
		setStep((from - 1) as walkthroughStep);
	};

	return (
		<div className='popup-root'>
			<div className='popup-view-shell position-relative'>
				<button type='button' className='btn btn-link btn-sm walkthrough-skip' onClick={onComplete}>
					{i18n.t('walkthrough.skipTour')}
				</button>
				{step === 1 && <WalkthroughStepToggle onNext={next} />}
				{step === 2 && <WalkthroughStepPowerScore key={`step2-${initialSubStep}`} onNext={next} onBack={() => back(2)} initialSubStep={initialSubStep} modeId={modeId} />}
				{step === 3 && <WalkthroughStepTabAssign onNext={next} onBack={() => back(3)} />}
				{step === 4 && <WalkthroughStepAutoSwitch onNext={next} onBack={() => back(4)} />}
				{step === 5 && <WalkthroughStepFullScreen onNext={next} onBack={() => back(5)} />}
				{step === 6 && <WalkthroughStepSettings onNext={next} onBack={() => back(6)} leagues={leagues} />}
				{step === 7 && <WalkthroughStepGameDetail onNext={next} onBack={() => back(7)} />}
				{step === 8 && <WalkthroughStepLeaguesFavorites onNext={next} onBack={() => back(8)} />}
				{step === 9 && <WalkthroughStepReAccess onNext={finish} onBack={() => back(9)} />}
			</div>
		</div>
	);
};

export default walkthroughView;
