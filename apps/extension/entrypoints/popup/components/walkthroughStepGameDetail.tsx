import { useState } from 'react';
import { i18n } from '#i18n';
import Crest from '@arenaswap/ui/src/components/crest';
import { teamLogoOnColor } from '@arenaswap/core/constants';
import { matchupSurfaceStyle, powerScoreColor } from './gameCardShared';
import { signalColors } from '@arenaswap/ui/src/components/signalColors';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

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

const TeamLogo = ({ abbr, color, logoUrl }: { abbr: string; color: string; logoUrl: string }) => (
	<Crest
		logo={teamLogoOnColor(logoUrl)}
		abbreviation={abbr}
		className='team-crest-28'
		teamColor={color}
	/>
);

const walkthroughStepGameDetail = ({ onNext, onBack }: walkthroughStepGameDetailProps) => {
	const [tapped, setTapped] = useState(false);

	return (
		<div className='popup-container d-flex flex-column'>
			<FlowStepper step={6} total={8} className='pt-5 pb-3' />

			<div className='fw-bold fs-lg text-center mb-1 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepGameDetail.title')}</div>
			<div className='fg-secondary small text-center mb-5 lh-md'>
				{i18n.t('stepGameDetail.subtitle')}
			</div>

			<div className='position-relative mb-5'>
				<div
					role='button'
					tabIndex={0}
					className='game-card is-team-colored motion-outline'
					style={{
						...matchupSurfaceStyle(eaglesColor, giantsColor),
						cursor: 'pointer',
						outline: tapped ? `2px solid ${mockPsColor}` : '2px dashed rgba(255,255,255,0.2)',
					}}
					onClick={() => setTapped(true)}
					onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setTapped(true); }}
				>
					<div className='d-flex align-items-center gap-1 fw-bold text-uppercase live-status-label mb-1'>
						<span className='live-dot' />
						{i18n.t('gameCard.live')}
					</div>

					<div className='d-flex align-items-center justify-content-center game-card-matchup'>
						<div className='d-flex flex-column align-items-center gap-1 team-column is-away'>
							<TeamLogo abbr='PHI' color={eaglesColor} logoUrl={LOGO_EAGLES} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>PHI</span>
						</div>
						<div className='d-flex flex-column align-items-center game-card-center'>
							<div className='d-flex align-items-center game-score-row'>
								<span className='fw-bold lh-1 game-score-value'>21</span>
								<span className='game-score-sep' aria-hidden='true' />
								<span className='fw-bold lh-1 game-score-value'>17</span>
							</div>
							<span className='game-clock'>2:14</span>
							<span className='game-period'>{i18n.t('gameCard.periodQuarter', { count: '4' })}</span>
						</div>
						<div className='d-flex flex-column align-items-center gap-1 team-column is-home'>
							<TeamLogo abbr='NYG' color={giantsColor} logoUrl={LOGO_GIANTS} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>NYG</span>
						</div>
					</div>

					<div className='d-flex align-items-center gap-3 game-card-ps-bar-row'>
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
						<span className='game-card-ps-score'>
							{mockPsScore} / {mockPsMax}
						</span>
					</div>
				</div>

				{!tapped && (
					<div
						// `pe-none`, not Tailwind's `pointer-events-none`: the extension has no Tailwind
						// build, so the hint was swallowing the tap it is asking for.
						className='position-absolute top-50 start-50 translate-middle text-center pe-none'
						style={{ zIndex: 2 }}
					>
						<span
							className='badge rounded-pill fw-semibold px-5 py-3'
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
					className='border border-subtle-accent rounded p-3 mb-5'
					style={{ fontSize: '0.72rem' }}
				>
					<div className='fw-semibold fg-body mb-3' style={{ fontSize: '0.8rem' }}>
						<i className='bi bi-bar-chart-line fg-primary me-1' />
						{i18n.t('stepGameDetail.detailPreviewTitle')}
					</div>
					<div className='d-flex flex-column gap-1'>
						{[
							{ label: i18n.t('stepGameDetail.signalCloseness'), val: 18, color: signalColors.closeness },
							{ label: i18n.t('stepGameDetail.signalLateGame'), val: 22, color: signalColors.lateGame },
							{ label: i18n.t('stepGameDetail.signalMomentum'), val: 14, color: signalColors.momentum },
							{ label: i18n.t('stepGameDetail.signalLeadChanges'), val: 9, color: signalColors.leadChanges },
							{ label: i18n.t('stepGameDetail.signalComeback'), val: 8, color: signalColors.comeback },
						].map(({ label, val, color }) => (
							<div key={label} className='d-flex align-items-center gap-3'>
								<span className='fg-secondary' style={{ minWidth: '5.5rem' }}>{label}</span>
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
					<p className='fg-secondary mt-3 mb-0' style={{ fontSize: '0.68rem' }}>
						{i18n.t('stepGameDetail.detailPreviewCaption')}
					</p>
				</div>
			) : (
				<p className='fg-secondary small lh-md'>
					{i18n.t('stepGameDetail.body')}
				</p>
			)}

			{tapped && (
				<p className='fg-secondary small lh-md'>
					{i18n.t('stepGameDetail.bodyAfterTap')}
				</p>
			)}

			<div className='d-flex gap-3 mt-auto'>
				<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepGameDetail.back')}
				</button>
				<button type='button' className='btn btn-solid theme-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepGameDetail.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepGameDetail;
