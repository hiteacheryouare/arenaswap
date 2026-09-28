import type { ReactNode, Ref } from 'react';

interface onboardingStepProps {
	step: number;
	total: number;
	// "Step 2 of 3". Absent on the screens that close a flow, which show the bar full instead.
	stepLabel?: string;
	title?: ReactNode;
	lede?: ReactNode;
	// The far end of the step line, such as the team step's Skip.
	aside?: ReactNode;
	footer: ReactNode;
	children?: ReactNode;
	className?: string;
	scrollerRef?: Ref<HTMLDivElement>;
}

export const StepProgress = ({ step, total }: { step: number; total: number }) => (
	<div className='ob-progress' aria-hidden='true'>
		{Array.from({ length: total }, (_, index) => (
			<i key={index} className={index < step ? 'is-done' : undefined} />
		))}
	</div>
);

// The frame every first-run and tour screen shares: the bar, the step, the title, and a footer that
// stays pinned while the step scrolls under it.
const onboardingStep = ({ step, total, stepLabel, title, lede, aside, footer, children, className, scrollerRef }: onboardingStepProps) => (
	<div ref={scrollerRef} className={`popup-container ob${className ? ` ${className}` : ''}`}>
		<StepProgress step={step} total={total} />
		{(stepLabel || aside) && (
			<div className='ob-stepline'>
				{stepLabel && <p className='ob-step'>{stepLabel}</p>}
				{aside}
			</div>
		)}
		{title && <h2 className='ob-title'>{title}</h2>}
		{lede && <p className='ob-lede'>{lede}</p>}
		{children}
		<footer className='ob-foot'>{footer}</footer>
	</div>
);

export default onboardingStep;
