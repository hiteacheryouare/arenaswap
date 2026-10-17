import { i18n } from '#i18n';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { fullLogoSrc } from '../../../utils/theme';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface onboardingTabControlProps {
	onNext: () => void;
}

const onboardingTabControl = ({ onNext }: onboardingTabControlProps) => {
	const theme = useDocumentTheme();

	return (
		<div className='popup-container d-flex flex-column'>

			<div className='onb-logo-wrap d-flex justify-content-center pt-7 pb-5'>
				<img
					src={fullLogoSrc(theme)}
					alt='ArenaSwap'
					className='arenaswap-logo'
				/>
			</div>

			<div className='onb-content-wrap d-flex flex-column'>
				<FlowStepper step={1} total={3} className='justify-content-center mb-5' />

				<div className='fw-bold lh-xs mb-3 fs-xl text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('tabControl.title')}</div>
				<div className='fg-secondary fs-md text-center mb-7 lh-md'>
					{i18n.t('tabControl.subtitle')}
				</div>

				<div className='d-flex flex-column gap-5 mb-7'>
					<div className='d-flex gap-5 align-items-start'>
						<i className='bi bi-tv fs-lg fg-primary flex-shrink-0 mt-1' />
						<div>
							<div className='fw-semibold fg-body lh-xs small'>{i18n.t('tabControl.feature1Title')}</div>
							<div className='setting-explainer mt-1'>
								{i18n.t('tabControl.feature1Body')}
							</div>
						</div>
					</div>

					<div className='d-flex gap-5 align-items-start'>
						<i className='bi bi-collection-play fs-lg fg-primary flex-shrink-0 mt-1' />
						<div>
							<div className='fw-semibold fg-body lh-xs small'>{i18n.t('tabControl.feature2Title')}</div>
							<div className='setting-explainer mt-1'>
								{i18n.t('tabControl.feature2Body')}
							</div>
						</div>
					</div>

					<div className='d-flex gap-5 align-items-start'>
						<i className='bi bi-sliders fs-lg fg-primary flex-shrink-0 mt-1' />
						<div>
							<div className='fw-semibold fg-body lh-xs small'>{i18n.t('tabControl.feature3Title')}</div>
							<div className='setting-explainer mt-1'>
								{i18n.t('tabControl.feature3Body')}
							</div>
						</div>
					</div>
				</div>

				<button className='btn btn-solid theme-primary w-100 mt-auto' onClick={onNext}>
					{i18n.t('tabControl.gotIt')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default onboardingTabControl;
