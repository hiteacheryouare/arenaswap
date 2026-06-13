import { powerScoreColor } from './gameCardShared';

interface walkthroughStepTabAssignProps {
	onNext: () => void;
	onBack: () => void;
}

const mockPsScore = 52;
const mockPsMax = 100;
const mockPsPercent = (mockPsScore / mockPsMax) * 100;
const mockPsColor = powerScoreColor(mockPsScore, mockPsMax);

const eaglesColor = '#004C54';
const giantsColor = '#0B2265';

const TeamCircle = ({ abbr, color }: { abbr: string; color: string }) => (
	<div
		className='d-flex align-items-center justify-content-center rounded-circle shrink-0 fw-bold team-logo-fallback'
		style={{ backgroundColor: color, color: '#fff' }}
	>
		{abbr}
	</div>
);

const walkthroughStepTabAssign = ({ onNext, onBack }: walkthroughStepTabAssignProps) => (
	<div className='popup-container d-flex flex-column'>
		<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>Step 2 of 4</div>

		<div className='fw-bold fs-5 text-center mb-1'>Assign tabs to games</div>
		<div className='text-body-secondary small text-center mb-3 lh-base'>
			ArenaSwap only touches tabs you register.
		</div>

		<div
			className='game-card mb-1'
			style={{
				borderLeft: `5px solid ${eaglesColor}`,
				borderRight: `5px solid ${giantsColor}`,
				background: `linear-gradient(to right, ${eaglesColor}28, ${giantsColor}28), #ffffff`,
			}}
		>
			<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label mb-1'>
				<span className='live-dot' />
				LIVE
			</div>

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<div className='d-flex flex-column align-items-center gap-1 team-column'>
					<TeamCircle abbr='PHI' color={eaglesColor} />
					<span className='fw-bold text-center text-nowrap team-abbreviation'>PHI</span>
				</div>

				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<span className='fw-bold lh-1 game-score-value'>14</span>
						<span className='game-score-sep' aria-hidden='true' />
						<span className='fw-bold lh-1 game-score-value'>10</span>
					</div>
					<span className='font-lekton game-clock'>7:43</span>
					<span className='font-lekton game-period'>Q2</span>
				</div>

				<div className='d-flex flex-column align-items-center gap-1 team-column'>
					<TeamCircle abbr='NYG' color={giantsColor} />
					<span className='fw-bold text-center text-nowrap team-abbreviation'>NYG</span>
				</div>
			</div>

			<div className='d-flex align-items-center gap-2 game-card-ps-bar-row'>
				<span className='game-card-ps-label'>PowerScore</span>
				<div className='progress flex-grow-1 game-card-ps-progress'>
					<div
						className='progress-bar'
						role='progressbar'
						style={{ width: `${mockPsPercent}%`, backgroundColor: mockPsColor }}
						aria-valuenow={mockPsScore}
						aria-valuemin={0}
						aria-valuemax={mockPsMax}
					/>
				</div>
				<span className='game-card-ps-score' style={{ color: mockPsColor }}>{mockPsScore} / {mockPsMax}</span>
			</div>

			<div className='d-flex flex-column gap-0 mt-2'>
				<select className='form-select form-select-sm' onChange={() => {}}>
					<option value=''>— Assign a tab —</option>
					<option value='1'>youtube.com/watch?v=Philly_stream</option>
					<option value='2'>nfl.com/watch/live</option>
				</select>
				<span className='text-primary fw-semibold ms-1 mt-1' style={{ fontSize: '0.65rem' }}>↑ link a browser tab here</span>
			</div>
		</div>

		<p className='text-body-secondary small lh-base mt-1'>
			Open each stream in its own browser tab, then use the dropdown on a game card to link them.
			ArenaSwap will only switch to tabs you've assigned.
		</p>

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

export default walkthroughStepTabAssign;
