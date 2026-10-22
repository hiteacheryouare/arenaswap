import { useState } from 'react';
import { i18n } from '#i18n';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { fullLogoSrc } from '../../../utils/theme';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface walkthroughStepToggleProps {
	onNext: () => void;
}

const walkthroughStepToggle = ({ onNext }: walkthroughStepToggleProps) => {
	const [enabled, setEnabled] = useState(true);
	const theme = useDocumentTheme();

	return (
		<div className='popup-container d-flex flex-column'>
			<FlowStepper step={1} total={9} className='pt-5 pb-3' />

			<div className='fw-bold fs-lg text-center mb-5 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepToggle.title')}</div>

			<div className='border border-subtle-accent rounded p-3 mb-5'>
				<div className='d-flex justify-content-between align-items-center mb-1'>
					<img
						src={fullLogoSrc(theme)}
						alt='ArenaSwap'
						className='arenaswap-logo'
					/>
					<div className='d-flex align-items-center gap-3'>
						<i className='bi bi-gear-fill fg-accent opacity-50' style={{ fontSize: '1rem' }} />
						<div className='d-flex flex-column align-items-center gap-0'>
							<ToggleSwitch
								id='wt-toggle-demo'
								checked={enabled}
								onChange={() => setEnabled(e => !e)}
							/>
							<span className='fg-primary fw-semibold' style={{ fontSize: '0.6rem', lineHeight: 1 }}>{i18n.t('stepToggle.tryIt')}</span>
						</div>
					</div>
				</div>

				<div
					className='small text-center lh-md mt-1 rounded px-3 py-1 motion-tint'
					style={{
						backgroundColor: enabled ? 'color-mix(in srgb, var(--as-success-base) 12%, transparent)' : 'color-mix(in srgb, var(--as-overlay) 6%, transparent)',
						color: enabled ? 'var(--as-success-fg)' : 'var(--as-fg-3)',
						fontSize: '0.72rem',
					}}
				>
					{enabled ? i18n.t('stepToggle.statusActive') : i18n.t('stepToggle.statusPaused')}
				</div>
			</div>

			<p className='fg-secondary small lh-md'>
				{i18n.t('stepToggle.bodyBeforeOn')}<strong className='fg-body'>{i18n.t('stepToggle.bodyOn')}</strong>{i18n.t('stepToggle.bodyAfterOn')}
			</p>

			<button type='button' className='btn btn-solid theme-primary w-100 mt-auto' onClick={onNext}>
				{i18n.t('stepToggle.next')} <i className='bi bi-arrow-right' />
			</button>
		</div>
	);
};

export default walkthroughStepToggle;
