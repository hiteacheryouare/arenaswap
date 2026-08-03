import { i18n } from '#i18n';

interface onboardingTabControlProps {
	onNext: () => void;
}

const onboardingTabControl = ({ onNext }: onboardingTabControlProps) => (
	<div className='popup-container d-flex flex-column'>

		<div className='onb-logo-wrap d-flex justify-content-center pt-4 pb-3'>
			<img
				src='/images/full_logo_white_on_transparent.svg'
				alt='ArenaSwap'
				className='arenaswap-logo'
			/>
		</div>

		<div className='onb-content-wrap d-flex flex-column grow'>
			<div className='small text-body-secondary text-uppercase text-center mb-3'>{i18n.t('tabControl.step', [1, 3])}</div>

			<div className='fw-bold lh-sm mb-2 fs-4 text-center'>{i18n.t('tabControl.title')}</div>
			<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
				{i18n.t('tabControl.subtitle')}
			</div>

			<div className='d-flex flex-column gap-3 mb-4'>
				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-tv fs-5 text-primary flex-shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>{i18n.t('tabControl.feature1Title')}</div>
						<div className='setting-explainer mt-1'>
							{i18n.t('tabControl.feature1Body')}
						</div>
					</div>
				</div>

				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-collection-play fs-5 text-primary flex-shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>{i18n.t('tabControl.feature2Title')}</div>
						<div className='setting-explainer mt-1'>
							{i18n.t('tabControl.feature2Body')}
						</div>
					</div>
				</div>

				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-sliders fs-5 text-primary flex-shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>{i18n.t('tabControl.feature3Title')}</div>
						<div className='setting-explainer mt-1'>
							{i18n.t('tabControl.feature3Body')}
						</div>
					</div>
				</div>
			</div>

			<button className='btn btn-primary w-100 mt-auto' onClick={onNext}>
				{i18n.t('tabControl.gotIt')} <i className='bi bi-arrow-right' />
			</button>
		</div>
	</div>
);

export default onboardingTabControl;
