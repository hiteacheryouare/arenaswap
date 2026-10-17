import { i18n } from '#i18n';

interface flowStepperProps {
	step: number;
	total: number;
	className?: string;
}

// The markers are drawn for the eye and hidden from screen readers, which hear the same sentence the
// step caption used to print.
const flowStepper = ({ step, total, className = '' }: flowStepperProps) => (
	<div className={`flow-stepper small ${className}`}>
		<span className='visually-hidden'>{i18n.t('flowStepper.step', [step, total])}</span>
		<ol className='stepper stepper-horizontal' aria-hidden='true'>
			{Array.from({ length: total }, (_, index) => {
				const position = index + 1;
				const state = position < step ? ' active' : position === step ? ' active is-current' : '';
				return <li key={position} className={`stepper-item${state}`} />;
			})}
		</ol>
	</div>
);

export default flowStepper;
