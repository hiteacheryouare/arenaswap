import type { ReactNode, Ref } from 'react';
import OnboardingStep from './onboardingStep';

export const walkthroughSteps = 8;

interface walkthroughFrameProps {
	step: number;
	stepLabel: string;
	title: ReactNode;
	lede?: ReactNode;
	backLabel?: string;
	onBack?: () => void;
	nextLabel: string;
	onNext: () => void;
	nextDisabled?: boolean;
	className?: string;
	scrollerRef?: Ref<HTMLDivElement>;
	children: ReactNode;
}

const walkthroughFrame = ({ step, stepLabel, title, lede, backLabel, onBack, nextLabel, onNext, nextDisabled, className, scrollerRef, children }: walkthroughFrameProps) => (
	<OnboardingStep
		step={step}
		total={walkthroughSteps}
		stepLabel={stepLabel}
		title={title}
		lede={lede}
		className={`wt${className ? ` ${className}` : ''}`}
		scrollerRef={scrollerRef}
		footer={(
			<>
				{onBack && <button type='button' className='btn btn-quiet' onClick={onBack}>{backLabel}</button>}
				<button type='button' className='btn btn-primary' onClick={onNext} disabled={nextDisabled}>{nextLabel}</button>
			</>
		)}
	>
		{children}
	</OnboardingStep>
);

export default walkthroughFrame;
