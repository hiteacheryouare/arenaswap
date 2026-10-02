import { useState } from 'react';
import { i18n } from '#i18n';
import focusStepTitle from './stepTitleFocus';

interface standbyStreamGuideProps {
	onDone: () => void;
}

const standbyStreamGuide = ({ onDone }: standbyStreamGuideProps) => {
	const [step, setStep] = useState<1 | 2>(1);

	return (
		<div className='popup-container d-flex flex-column'>
			<div key={step} className='standby-guide-content d-flex flex-column flex-grow-1'>
				<div className='small text-body-secondary text-uppercase text-center mb-3'>
					{step === 1 ? i18n.t('standbyGuide.step', [1, 2]) : i18n.t('standbyGuide.step', [2, 2])}
				</div>

				{step === 1 && (
					<>
						<div className='fw-bold lh-sm mb-2 fs-5 text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('standbyGuide.title')}</div>
						<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
							{i18n.t('standbyGuide.subtitle')}
						</div>

						<div className='d-flex flex-column gap-3 mb-4'>
							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-volume-mute fs-5 text-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>{i18n.t('standbyGuide.quietTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.quietBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-arrow-repeat fs-5 text-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>{i18n.t('standbyGuide.returnTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.returnBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-window-stack fs-5 text-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>{i18n.t('standbyGuide.chooseTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.chooseBody')}
									</div>
								</div>
							</div>
						</div>

						<button type='button' className='btn btn-primary w-100 mt-auto' onClick={() => setStep(2)}>
							{i18n.t('standbyGuide.next')} <i className='bi bi-arrow-right' />
						</button>
					</>
				)}

				{step === 2 && (
					<>
						<div className='fw-bold lh-sm mb-2 fs-5 text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('standbyGuide.setupTitle')}</div>
						<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
							{i18n.t('standbyGuide.setupSubtitle')}
						</div>

						<div className='d-flex flex-column gap-3 mb-4'>
							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-thermometer-half fs-5 text-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>{i18n.t('standbyGuide.thresholdTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.thresholdBody')}
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-window-stack fs-5 text-primary flex-shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>{i18n.t('standbyGuide.designateTitle')}</div>
									<div className='setting-explainer mt-1'>
										{i18n.t('standbyGuide.designateBody')}
									</div>
								</div>
							</div>
						</div>

						<div className='d-flex gap-2 mt-auto'>
							<button type='button' className='btn btn-secondary flex-grow-1' onClick={() => setStep(1)}>
								<i className='bi bi-arrow-left' /> {i18n.t('standbyGuide.back')}
							</button>
							<button type='button' className='btn btn-primary flex-grow-1' onClick={onDone}>
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
