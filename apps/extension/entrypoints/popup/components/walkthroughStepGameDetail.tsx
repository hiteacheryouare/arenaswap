import { useState } from 'react';
import { i18n } from '#i18n';
import { powerScoreColor } from './gameCardShared';

interface walkthroughStepGameDetailProps {
	onNext: () => void;
	onBack: () => void;
}

const mockPsScore = 71;
const mockPsMax = 100;
const mockPsColor = powerScoreColor(mockPsScore, mockPsMax);

const eaglesColor = '#004C54';
const giantsColor = '#0B2265';
const LOGO_EAGLES = 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png';
const LOGO_GIANTS = 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png';

const TeamLogo = ({ abbr, color, logoUrl }: { abbr: string; color: string; logoUrl: string }) => {
	const [failed, setFailed] = useState(false);
	if (!failed) {
		return (
			<img
				src={logoUrl}
				alt={abbr}
				width={28}
				height={28}
				className='object-fit-contain flex-shrink-0'
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<div
			className='d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fw-bold team-logo-fallback'
			style={{ backgroundColor: color, color: '#fff', width: 28, height: 28, fontSize: '0.6rem' }}
		>
			{abbr}
		</div>
	);
};

const walkthroughStepGameDetail = ({ onNext, onBack }: walkthroughStepGameDetailProps) => {
	const [tapped, setTapped] = useState(false);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>
				{i18n.t('stepGameDetail.step', [6, 8])}
			</div>

			<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepGameDetail.title')}</div>
			<div className='text-body-secondary small text-center mb-3 lh-base'>
				{i18n.t('stepGameDetail.subtitle')}
			</div>

			<div className='position-relative mb-3'>
				<div
					role='button'
					tabIndex={0}
					className='game-card'
					style={{
						borderLeft: `4px solid ${eaglesColor}`,
						borderRight: `4px solid ${giantsColor}`,
						background: `linear-gradient(to right, ${eaglesColor}28, ${giantsColor}28), #ffffff`,
						cursor: 'pointer',
						outline: tapped ? `2px solid ${mockPsColor}` : '2px dashed rgba(255,255,255,0.2)',
						transition: 'outline 0.2s',
					}}
					onClick={() => setTapped(true)}
					onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setTapped(true); }}
				>
					<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label mb-1'>
						<span className='live-dot' />
						LIVE
					</div>

					<div className='d-flex align-items-center justify-content-center game-card-matchup'>
						<div className='d-flex flex-column align-items-center gap-1 team-column'>
							<TeamLogo abbr='PHI' color={eaglesColor} logoUrl={LOGO_EAGLES} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>PHI</span>
						</div>
						<div className='d-flex flex-column align-items-center game-card-center'>
							<div className='d-flex align-items-center game-score-row'>
								<span className='fw-bold lh-1 game-score-value'>21</span>
								<span className='game-score-sep' aria-hidden='true' />
								<span className='fw-bold lh-1 game-score-value'>17</span>
							</div>
							<span className='font-lekton game-clock'>2:14</span>
							<span className='font-lekton game-period'>Q4</span>
						</div>
						<div className='d-flex flex-column align-items-center gap-1 team-column'>
							<TeamLogo abbr='NYG' color={giantsColor} logoUrl={LOGO_GIANTS} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>NYG</span>
						</div>
					</div>

					<div className='d-flex align-items-center gap-2 game-card-ps-bar-row'>
						<span className='game-card-ps-label'>PowerScore</span>
						<div className='progress flex-grow-1 game-card-ps-progress'>
							<div
								className='progress-bar'
								role='progressbar'
								style={{ width: `${(mockPsScore / mockPsMax) * 100}%`, backgroundColor: mockPsColor }}
								aria-valuenow={mockPsScore}
								aria-valuemin={0}
								aria-valuemax={mockPsMax}
							/>
						</div>
						<span className='game-card-ps-score' style={{ color: mockPsColor }}>
							{mockPsScore} / {mockPsMax}
						</span>
					</div>
				</div>

				{!tapped && (
					<div
						className='position-absolute top-50 start-50 translate-middle text-center pointer-events-none'
						style={{ zIndex: 2 }}
					>
						<span
							className='badge rounded-pill fw-semibold px-3 py-2'
							style={{
								backgroundColor: 'rgba(0,0,0,0.75)',
								color: '#fff',
								fontSize: '0.72rem',
								backdropFilter: 'blur(4px)',
								border: '1px solid rgba(255,255,255,0.15)',
							}}
						>
							<i className='bi bi-cursor-fill me-1' />
							{i18n.t('stepGameDetail.tapHint')}
						</span>
					</div>
				)}
			</div>

			{tapped ? (
				<div
					className='border border-secondary-subtle rounded p-2 mb-3'
					style={{ fontSize: '0.72rem' }}
				>
					<div className='fw-semibold text-body mb-2' style={{ fontSize: '0.8rem' }}>
						<i className='bi bi-bar-chart-line text-primary me-1' />
						{i18n.t('stepGameDetail.detailPreviewTitle')}
					</div>
					<div className='d-flex flex-column gap-1'>
						{[
							{ label: i18n.t('stepGameDetail.signalCloseness'), val: 18, color: '#22c55e' },
							{ label: i18n.t('stepGameDetail.signalLateGame'), val: 22, color: '#f75c03' },
							{ label: i18n.t('stepGameDetail.signalMomentum'), val: 14, color: '#3e9bd1' },
							{ label: i18n.t('stepGameDetail.signalLeadChanges'), val: 9, color: '#f1c40f' },
							{ label: i18n.t('stepGameDetail.signalComeback'), val: 8, color: '#d90368' },
						].map(({ label, val, color }) => (
							<div key={label} className='d-flex align-items-center gap-2'>
								<span className='text-body-secondary' style={{ minWidth: '5.5rem' }}>{label}</span>
								<div className='flex-grow-1 progress' style={{ height: '6px' }}>
									<div
										className='progress-bar'
										style={{ width: `${(val / 30) * 100}%`, backgroundColor: color }}
									/>
								</div>
								<span style={{ color, minWidth: '2rem', textAlign: 'right' }}>{val}</span>
							</div>
						))}
					</div>
					<p className='text-body-secondary mt-2 mb-0' style={{ fontSize: '0.68rem' }}>
						{i18n.t('stepGameDetail.detailPreviewCaption')}
					</p>
				</div>
			) : (
				<p className='text-body-secondary small lh-base'>
					{i18n.t('stepGameDetail.body')}
				</p>
			)}

			{tapped && (
				<p className='text-body-secondary small lh-base'>
					{i18n.t('stepGameDetail.bodyAfterTap')}
				</p>
			)}

			<div className='d-flex gap-2 mt-auto'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepGameDetail.back')}
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepGameDetail.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepGameDetail;
