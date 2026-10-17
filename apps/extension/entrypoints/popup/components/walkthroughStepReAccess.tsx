import { i18n } from '#i18n';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { fullLogoSrc } from '../../../utils/theme';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface walkthroughStepReAccessProps {
	onNext: () => void;
	onBack: () => void;
}

const walkthroughStepReAccess = ({ onNext, onBack }: walkthroughStepReAccessProps) => {
	const theme = useDocumentTheme();

	return (
		<div className='popup-container d-flex flex-column'>
			<FlowStepper step={8} total={8} className='pt-5 pb-3' />

			<div className='fw-bold fs-lg text-center mb-1 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepReAccess.title')}</div>
			<div className='fg-secondary small text-center mb-5 lh-md'>
				{i18n.t('stepReAccess.subtitle')}
			</div>

			<div className='border border-subtle-accent rounded p-3 mb-5'>
				<div className='d-flex justify-content-between align-items-center'>
					<img
						src={fullLogoSrc(theme)}
						alt='ArenaSwap'
						className='arenaswap-logo'
					/>
					<div className='d-flex align-items-center gap-3'>
						<div className='position-relative'>
							<div
								className='btn btn-sm p-0 popup-settings-button'
								style={{ pointerEvents: 'none' }}
							>
								<i className='bi bi-question-circle popup-settings-icon' style={{ color: 'var(--as-primary-fg)' }} />
							</div>
							<div
								className='position-absolute d-flex flex-column align-items-center'
								style={{ top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1 }}
							>
								<div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid var(--as-primary-bg)' }} />
								<span
									className='badge rounded-pill mt-1 px-3 py-1'
									style={{ backgroundColor: 'var(--as-primary-bg)', color: 'var(--as-primary-contrast)', fontSize: '0.62rem' }}
								>
									{i18n.t('stepReAccess.callout')}
								</span>
							</div>
						</div>

						<div
							className='btn btn-sm p-0 popup-settings-button opacity-25'
							style={{ pointerEvents: 'none' }}
						>
							<i className='bi bi-gear-fill popup-settings-icon' />
						</div>

						<ToggleSwitch className='opacity-25' defaultChecked readOnly style={{ pointerEvents: 'none' }} tabIndex={-1} />
					</div>
				</div>

				<div style={{ height: '2.5rem' }} />
			</div>

			<p className='fg-secondary small lh-md'>
				{i18n.t('stepReAccess.body')}
			</p>

			<div className='d-flex gap-3 mt-auto'>
				<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepReAccess.back')}
				</button>
				<button type='button' className='btn btn-solid theme-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepReAccess.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepReAccess;
