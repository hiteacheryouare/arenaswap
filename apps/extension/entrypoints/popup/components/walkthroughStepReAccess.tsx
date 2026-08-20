import { i18n } from '#i18n';

interface walkthroughStepReAccessProps {
	onNext: () => void;
	onBack: () => void;
}

const walkthroughStepReAccess = ({ onNext, onBack }: walkthroughStepReAccessProps) => (
	<div className='popup-container d-flex flex-column'>
		<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>
			{i18n.t('stepReAccess.step', [8, 8])}
		</div>

		<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepReAccess.title')}</div>
		<div className='text-body-secondary small text-center mb-3 lh-base'>
			{i18n.t('stepReAccess.subtitle')}
		</div>

		<div className='border border-secondary-subtle rounded p-2 mb-3'>
			<div className='d-flex justify-content-between align-items-center'>
				<img
					src='/images/full_logo_white_on_transparent.svg'
					alt='ArenaSwap'
					className='arenaswap-logo'
				/>
				<div className='d-flex align-items-center gap-2'>
					<div className='position-relative'>
						<div
							className='btn btn-sm p-0 popup-settings-button'
							style={{ pointerEvents: 'none' }}
						>
							<i className='bi bi-question-circle popup-settings-icon' style={{ color: 'var(--bs-primary)' }} />
						</div>
						<div
							className='position-absolute d-flex flex-column align-items-center'
							style={{ top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1 }}
						>
							<div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid var(--bs-primary)' }} />
							<span
								className='badge rounded-pill mt-1 px-2 py-1'
								style={{ backgroundColor: 'var(--bs-primary)', fontSize: '0.62rem' }}
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

					<div className='form-check form-switch mb-0 opacity-25'>
						<input className='form-check-input' type='checkbox' defaultChecked readOnly style={{ pointerEvents: 'none' }} tabIndex={-1} />
					</div>
				</div>
			</div>

			<div style={{ height: '2.5rem' }} />
		</div>

		<p className='text-body-secondary small lh-base'>
			{i18n.t('stepReAccess.body')}
		</p>

		<div className='d-flex gap-2 mt-auto'>
			<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
				<i className='bi bi-arrow-left' /> {i18n.t('stepReAccess.back')}
			</button>
			<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext}>
				{i18n.t('stepReAccess.next')} <i className='bi bi-arrow-right' />
			</button>
		</div>
	</div>
);

export default walkthroughStepReAccess;
