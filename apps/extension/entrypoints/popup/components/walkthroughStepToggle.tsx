import { useState } from 'react';

interface walkthroughStepToggleProps {
	onNext: () => void;
}

const walkthroughStepToggle = ({ onNext }: walkthroughStepToggleProps) => {
	const [enabled, setEnabled] = useState(true);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>Step 1 of 4</div>

			<div className='fw-bold fs-5 text-center mb-1'>Turning it on &amp; off</div>
			<div className='text-body-secondary small text-center mb-3 lh-base'>
				One switch controls everything.
			</div>

			<div className='border border-secondary-subtle rounded p-2 mb-3'>
				<div className='d-flex justify-content-between align-items-center mb-1'>
					<img
						src='/images/full_logo_white_on_transparent.png'
						alt='ArenaSwap'
						className='arenaswap-logo'
					/>
					<div className='d-flex align-items-center gap-2'>
						<i className='bi bi-gear-fill text-secondary opacity-50' style={{ fontSize: '1rem' }} />
						<div className='d-flex flex-column align-items-center gap-0'>
							<div className='form-check form-switch mb-0'>
								<input
									className='form-check-input'
									type='checkbox'
									id='wt-toggle-demo'
									checked={enabled}
									onChange={() => setEnabled(e => !e)}
								/>
							</div>
							<span className='text-primary fw-semibold' style={{ fontSize: '0.6rem', lineHeight: 1 }}>↑ try it</span>
						</div>
					</div>
				</div>

				<div
					className='small text-center lh-base mt-1 rounded px-2 py-1'
					style={{
						backgroundColor: enabled ? 'rgba(0,204,102,0.12)' : 'rgba(255,255,255,0.06)',
						color: enabled ? '#00CC66' : '#8b949e',
						fontSize: '0.72rem',
						transition: 'all 0.2s',
					}}
				>
					{enabled ? '● ArenaSwap is active' : '○ Auto-switching paused'}
				</div>
			</div>

			<p className='text-body-secondary small lh-base'>
				When <strong className='text-body'>on</strong>, ArenaSwap automatically switches your tabs to the most exciting live game.
				Toggle it off any time to take back control.
			</p>

			<button type='button' className='btn btn-primary w-100 mt-auto' onClick={onNext}>
				Next <i className='bi bi-arrow-right' />
			</button>
		</div>
	);
};

export default walkthroughStepToggle;
