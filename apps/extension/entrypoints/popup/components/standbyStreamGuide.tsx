import { useState } from 'react';

interface standbyStreamGuideProps {
	onDone: () => void;
}

const standbyStreamGuide = ({ onDone }: standbyStreamGuideProps) => {
	const [step, setStep] = useState<1 | 2>(1);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='onb-content-wrap d-flex flex-column grow'>
				<div className='small text-body-secondary text-uppercase text-center mb-3'>
					{step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
				</div>

				{step === 1 && (
					<>
						<div className='fw-bold lh-sm mb-2 fs-5 text-center'>Standby Stream</div>
						<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
							A fallback for the slow moments.
						</div>

						<div className='d-flex flex-column gap-3 mb-4'>
							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-volume-mute fs-5 text-primary shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>When games go quiet</div>
									<div className='setting-explainer mt-1'>
										When every game you're watching drops below your threshold, ArenaSwap parks on your standby stream automatically.
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-arrow-repeat fs-5 text-primary shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>It comes back on its own</div>
									<div className='setting-explainer mt-1'>
										The moment any game heats back up above your threshold, ArenaSwap switches you right back.
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-window-stack fs-5 text-primary shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>You choose the standby tab</div>
									<div className='setting-explainer mt-1'>
										Open any stream you want in a tab, then pick it from the dropdown in Settings.
									</div>
								</div>
							</div>
						</div>

						<button className='btn btn-primary w-100 mt-auto' onClick={() => setStep(2)}>
							Next <i className='bi bi-arrow-right' />
						</button>
					</>
				)}

				{step === 2 && (
					<>
						<div className='fw-bold lh-sm mb-2 fs-5 text-center'>How to set it up</div>
						<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
							Two things to configure below.
						</div>

						<div className='d-flex flex-column gap-3 mb-4'>
							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-thermometer-half fs-5 text-primary shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>Set your threshold</div>
									<div className='setting-explainer mt-1'>
										Choose how low scores need to drop before standby kicks in. Lower is more patient; higher triggers sooner.
									</div>
								</div>
							</div>

							<div className='d-flex gap-3 align-items-start'>
								<i className='bi bi-window-stack fs-5 text-primary shrink-0 mt-1' />
								<div>
									<div className='fw-semibold text-body lh-sm small'>Designate a standby tab</div>
									<div className='setting-explainer mt-1'>
										Open your standby stream in a tab, come back here, and pick it from the dropdown.
									</div>
								</div>
							</div>
						</div>

						<button className='btn btn-primary w-100 mt-auto' onClick={onDone}>
							Got it <i className='bi bi-check-lg' />
						</button>
					</>
				)}
			</div>
		</div>
	);
};

export default standbyStreamGuide;
