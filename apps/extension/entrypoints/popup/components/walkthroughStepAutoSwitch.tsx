import { useEffect, useState } from 'react';
import { powerScoreColor } from './gameCardShared';
import { i18n } from '#i18n';

interface walkthroughStepAutoSwitchProps {
	onNext: () => void;
	onBack: () => void;
}

const psMax = 100;

const eaglesColor = '#004C54';
const giantsColor = '#0B2265';
const sixersColor = '#006BB6';
const celticsColor = '#007A33';

const TeamCircle = ({ abbr, color }: { abbr: string; color: string }) => (
	<div
		className='d-flex align-items-center justify-content-center rounded-circle shrink-0 fw-bold team-logo-fallback'
		style={{ backgroundColor: color, color: '#fff' }}
	>
		{abbr}
	</div>
);

interface mockCardProps {
	abbr1: string; color1: string;
	abbr2: string; color2: string;
	score1: number; score2: number;
	clock: string; period: string;
	ps: number; watching: boolean;
}

const MockCard = ({ abbr1, color1, abbr2, color2, score1, score2, clock, period, ps, watching }: mockCardProps) => {
	const psColor = powerScoreColor(ps, psMax);
	const psPercent = (ps / psMax) * 100;
	return (
		<div
			className='game-card mb-1'
			style={{
				pointerEvents: 'none',
				borderLeft: `5px solid ${color1}`,
				borderRight: `5px solid ${color2}`,
				background: `linear-gradient(to right, ${color1}28, ${color2}28), #ffffff`,
				outline: watching ? '2px solid var(--bs-primary)' : undefined,
				transition: 'outline 0.3s',
			}}
		>
			<div className='d-flex align-items-center justify-content-between mb-1'>
				<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label'>
					<span className='live-dot' />
					LIVE
				</div>
				{watching && (
					<span className='badge text-bg-primary' style={{ fontSize: '0.6rem' }}>WATCHING</span>
				)}
			</div>

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<div className='d-flex flex-column align-items-center gap-1 team-column'>
					<TeamCircle abbr={abbr1} color={color1} />
					<span className='fw-bold text-center text-nowrap team-abbreviation'>{abbr1}</span>
				</div>
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<span className='fw-bold lh-1 game-score-value'>{score1}</span>
						<span className='game-score-sep' aria-hidden='true' />
						<span className='fw-bold lh-1 game-score-value'>{score2}</span>
					</div>
					<span className='font-lekton game-clock'>{clock}</span>
					<span className='font-lekton game-period'>{period}</span>
				</div>
				<div className='d-flex flex-column align-items-center gap-1 team-column'>
					<TeamCircle abbr={abbr2} color={color2} />
					<span className='fw-bold text-center text-nowrap team-abbreviation'>{abbr2}</span>
				</div>
			</div>

			<div className='d-flex align-items-center gap-2 game-card-ps-bar-row'>
				<span className='game-card-ps-label'>PowerScore</span>
				<div className='progress flex-grow-1 game-card-ps-progress'>
					<div
						className='progress-bar'
						role='progressbar'
						style={{ width: `${psPercent}%`, backgroundColor: psColor, transition: 'width 0.9s ease-out, background-color 0.9s ease-out' }}
						aria-valuenow={ps}
						aria-valuemin={0}
						aria-valuemax={psMax}
					/>
				</div>
				<span className='game-card-ps-score' style={{ color: psColor, transition: 'color 0.9s ease-out' }}>
					{ps} / {psMax}
				</span>
			</div>
		</div>
	);
};

const walkthroughStepAutoSwitch = ({ onNext, onBack }: walkthroughStepAutoSwitchProps) => {
	const [phase, setPhase] = useState(0);
	const [ps76ers, setPs76ers] = useState(31);
	const [watching76ers, setWatching76ers] = useState(false);
	const [flash, setFlash] = useState(false);

	useEffect(() => {
		const t1 = setTimeout(() => setPs76ers(89), 800);
		const t2 = setTimeout(() => { setFlash(true); setTimeout(() => setFlash(false), 300); setWatching76ers(true); }, 1800);
		const t3 = setTimeout(() => setPhase(1), 2200);
		return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
	}, []);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>{i18n.t('stepAutoSwitch.step', [3, 4])}</div>

			<div className='fw-bold fs-5 text-center mb-3'>{i18n.t('stepAutoSwitch.title')}</div>

			<div className='position-relative'>
				<MockCard
					abbr1='PHI' color1={eaglesColor}
					abbr2='NYG' color2={giantsColor}
					score1={14} score2={10}
					clock='7:43' period='Q2'
					ps={52} watching={!watching76ers}
				/>
				<MockCard
					abbr1='PHI' color1={sixersColor}
					abbr2='BOS' color2={celticsColor}
					score1={98} score2={95}
					clock='1:22' period='Q4'
					ps={ps76ers} watching={watching76ers}
				/>
				{flash && (
					<div
						className='position-absolute top-0 start-0 w-100 h-100 rounded'
						style={{ backgroundColor: 'rgba(255,255,255,0.25)', pointerEvents: 'none', zIndex: 10 }}
					/>
				)}
			</div>

			{phase === 0 && (
				<p className='text-body-secondary small lh-base mt-2 text-center fst-italic'>
					{i18n.t('stepAutoSwitch.watchingCaption')}
				</p>
			)}

			{phase === 1 && (
				<>
					<p className='fw-semibold text-body mt-2 mb-1'>{i18n.t('stepAutoSwitch.reveal')}</p>
					<p className='text-body-secondary small lh-base'>
						{i18n.t('stepAutoSwitch.revealBody')}
					</p>
				</>
			)}

			<div className='d-flex gap-2 mt-auto'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepAutoSwitch.back')}
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext} disabled={phase === 0}>
					{i18n.t('stepAutoSwitch.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepAutoSwitch;
