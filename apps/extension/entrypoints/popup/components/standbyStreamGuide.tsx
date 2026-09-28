import { useState } from 'react';
import { i18n } from '#i18n';

interface standbyStreamGuideProps {
	onDone: () => void;
}

interface guidePoint {
	icon: string;
	title: string;
	body: string;
}

const steps: { title: string; lede: string; points: guidePoint[] }[] = [
	{
		title: i18n.t('standbyGuide.title'),
		lede: i18n.t('standbyGuide.subtitle'),
		points: [
			{ icon: 'bi-volume-mute', title: i18n.t('standbyGuide.quietTitle'), body: i18n.t('standbyGuide.quietBody') },
			{ icon: 'bi-arrow-repeat', title: i18n.t('standbyGuide.returnTitle'), body: i18n.t('standbyGuide.returnBody') },
			{ icon: 'bi-window-stack', title: i18n.t('standbyGuide.chooseTitle'), body: i18n.t('standbyGuide.chooseBody') },
		],
	},
	{
		title: i18n.t('standbyGuide.setupTitle'),
		lede: i18n.t('standbyGuide.setupSubtitle'),
		points: [
			{ icon: 'bi-thermometer-half', title: i18n.t('standbyGuide.thresholdTitle'), body: i18n.t('standbyGuide.thresholdBody') },
			{ icon: 'bi-window-stack', title: i18n.t('standbyGuide.designateTitle'), body: i18n.t('standbyGuide.designateBody') },
		],
	},
];

const standbyStreamGuide = ({ onDone }: standbyStreamGuideProps) => {
	const [step, setStep] = useState(0);
	const current = steps[step]!;
	const last = step === steps.length - 1;

	return (
		<div className='popup-container st st-guide d-flex flex-column'>
			<div key={step} className='st-guide-body'>
				<p className='st-guide-step'>{i18n.t('standbyGuide.step', [step + 1, steps.length])}</p>
				<h2 className='st-guide-title'>{current.title}</h2>
				<p className='st-guide-lede'>{current.lede}</p>
				<div className='st-card'>
					{current.points.map(point => (
						<div key={point.title} className='st-control st-guide-point'>
							<i className={`bi ${point.icon}`} aria-hidden='true' />
							<div>
								<p className='st-guide-point-title'>{point.title}</p>
								<p className='st-note'>{point.body}</p>
							</div>
						</div>
					))}
				</div>
			</div>
			<footer className='st-guide-foot'>
				{last ? (
					<button type='button' className='btn btn-primary w-100' onClick={onDone}>
						{i18n.t('standbyGuide.gotIt')} <i className='bi bi-check-lg' aria-hidden='true' />
					</button>
				) : (
					<button type='button' className='btn btn-primary w-100' onClick={() => setStep(step + 1)}>
						{i18n.t('standbyGuide.next')} <i className='bi bi-arrow-right' aria-hidden='true' />
					</button>
				)}
			</footer>
		</div>
	);
};

export default standbyStreamGuide;
