import { useState } from 'react';
import { i18n } from '#i18n';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface standbyStreamGuideProps {
	onDone: () => void;
}

const standbyStreamGuide = ({ onDone }: standbyStreamGuideProps) => {
	const [step, setStep] = useState<1 | 2>(1);

	return (
		<div className='popup-container d-flex flex-column'>
			<div key={step} className='standby-guide-content d-flex flex-column flex-grow-1'>
				<FlowStepper step={step} total={2} className='justify-content-center mb-5' />

				{step === 1 && (
					<>
						<div className='fw-bold lh-xs mb-3 fs-lg text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('standbyGuide.title')}</div>
						<div className='fg-secondary fs-md text-center mb-7 lh-md'>
							{i18n.t('standbyGuide.subtitle')}
						</div>

						<div className='d-flex flex-column gap-5 mb-7'>
							<div className='d-flex gap-5 align-items-start'>
								<i className='bi bi-volume-mute fs-lg fg-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold fg-body lh-xs small'>{i18n.t('standbyGuide.quietTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.quietBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-5 align-items-start'>
								<i className='bi bi-arrow-repeat fs-lg fg-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold fg-body lh-xs small'>{i18n.t('standbyGuide.returnTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.returnBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-5 align-items-start'>
								<i className='bi bi-window-stack fs-lg fg-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold fg-body lh-xs small'>{i18n.t('standbyGuide.chooseTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.chooseBody')}
									</div>
								</div>
							</div>
						</div>

						<button type='button' className='btn btn-solid theme-primary w-100 mt-auto' onClick={() => setStep(2)}>
							{i18n.t('standbyGuide.next')} <i className='bi bi-arrow-right' />
						</button>
					</>
				)}

				{step === 2 && (
					<>
						<div className='fw-bold lh-xs mb-3 fs-lg text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('standbyGuide.setupTitle')}</div>
						<div className='fg-secondary fs-md text-center mb-7 lh-md'>
							{i18n.t('standbyGuide.setupSubtitle')}
						</div>

						<div className='d-flex flex-column gap-5 mb-7'>
							<div className='d-flex gap-5 align-items-start'>
								<i className='bi bi-thermometer-half fs-lg fg-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold fg-body lh-xs small'>{i18n.t('standbyGuide.thresholdTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.thresholdBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-5 align-items-start'>
								<i className='bi bi-window-stack fs-lg fg-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold fg-body lh-xs small'>{i18n.t('standbyGuide.designateTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.designateBody')}
									</div>
								</div>
							</div>
						</div>

						<div className='d-flex gap-3 mt-auto'>
							<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={() => setStep(1)}>
								<i className='bi bi-arrow-left' /> {i18n.t('standbyGuide.back')}
							</button>
							<button type='button' className='btn btn-solid theme-primary flex-grow-1' onClick={onDone}>
								{i18n.t('standbyGuide.gotIt')} <i className='bi bi-check-lg' />
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default standbyStreamGuide;
