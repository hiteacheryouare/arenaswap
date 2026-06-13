import { useState } from 'react';

interface walkthroughStepSettingsProps {
	onNext: () => void;
	onBack: () => void;
}

const sensitivityLabels: Record<number, string> = {
	1: 'Barely Active', 2: 'Passive', 3: 'Conservative',
	4: 'Balanced', 5: 'Eager', 6: 'Trigger Happy', 7: 'Ludicrous Speed',
};

const cooldownSteps = [15, 30, 45, 60, 90, 120, 180];
const formatCooldown = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`;

const walkthroughStepSettings = ({ onNext, onBack }: walkthroughStepSettingsProps) => {
	const [sensitivity, setSensitivity] = useState(4);
	const [cooldownIdx, setCooldownIdx] = useState(1);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>Step 4 of 4</div>

			<div className='fw-bold fs-5 text-center mb-1'>Tune it your way</div>
			<div className='text-body-secondary small text-center mb-3 lh-base'>
				Open Settings any time to adjust.
			</div>

			<div className='border border-secondary-subtle rounded p-2 mb-3'>
				<div className='mb-3'>
					<div className='d-flex justify-content-between align-items-center mb-1'>
						<span className='text-body-secondary setting-toggle-label'>
							<i className='bi bi-sliders me-1 text-primary' />
							Switch sensitivity
						</span>
						<span className={`fw-semibold setting-value-label${sensitivity === 7 ? ' ludicrous-speed' : ''}`}>
							{sensitivityLabels[sensitivity]}
						</span>
					</div>
					<input
						type='range'
						className='form-range w-100'
						min={1} max={7} step={1}
						value={sensitivity}
						onChange={e => setSensitivity(Number(e.target.value))}
					/>
					<div className='text-body-secondary small lh-base' style={{ fontSize: '0.7rem' }}>
						Controls how big the PowerScore gap must be before ArenaSwap switches tabs.
					</div>
				</div>

				<div>
					<div className='d-flex justify-content-between align-items-center mb-1'>
						<span className='text-body-secondary setting-toggle-label'>
							<i className='bi bi-clock me-1 text-primary' />
							Switch cooldown
						</span>
						<span className='fw-semibold setting-value-label'>
							{formatCooldown(cooldownSteps[cooldownIdx]!)}
						</span>
					</div>
					<input
						type='range'
						className='form-range w-100'
						min={0} max={cooldownSteps.length - 1} step={1}
						value={cooldownIdx}
						onChange={e => setCooldownIdx(Number(e.target.value))}
					/>
					<div className='text-body-secondary small lh-base' style={{ fontSize: '0.7rem' }}>
						Sets the minimum time between automatic switches to reduce rapid tab flipping.
					</div>
				</div>

				<div className='d-flex gap-1 flex-wrap mt-3'>
					{['NFL', 'NBA', 'NHL', 'MLB'].map(l => (
						<span key={l} className='badge text-bg-primary'>{l}</span>
					))}
					<span className='badge border border-secondary-subtle text-body-secondary'>+ more in Leagues tab</span>
				</div>
			</div>

			<div className='d-flex gap-2 mt-auto'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> Back
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext}>
					Next <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepSettings;
