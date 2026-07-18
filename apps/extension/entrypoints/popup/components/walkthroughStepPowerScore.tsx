import { useEffect, useRef, useState } from 'react';
import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
} from '@arenaswap/core/constants';
import { i18n } from '#i18n';

interface walkthroughStepPowerScoreProps {
	onNext: () => void;
	onBack: () => void;
	initialSubStep?: number;
}

const signalMeta = [
	{
		name: 'closeness',
		labelKey: 'powerScore.signalCloseness',
		tooltipKey: 'powerScore.tooltipCloseness',
		measuredKey: 'stepPowerScore.closenessMeasured',
		max: scoreMaxCloseness,
		color: '#22c55e',
	},
	{
		name: 'lateGame',
		labelKey: 'powerScore.signalLateGame',
		tooltipKey: 'powerScore.tooltipLateGame',
		measuredKey: 'stepPowerScore.lateGameMeasured',
		max: scoreMaxLateGame,
		color: '#f75c03',
	},
	{
		name: 'momentum',
		labelKey: 'powerScore.signalMomentum',
		tooltipKey: 'powerScore.tooltipMomentum',
		measuredKey: 'stepPowerScore.momentumMeasured',
		max: scoreMaxMomentum,
		color: '#2274a5',
	},
	{
		name: 'leadChanges',
		labelKey: 'powerScore.signalLeadChanges',
		tooltipKey: 'powerScore.tooltipLeadChanges',
		measuredKey: 'stepPowerScore.leadChangesMeasured',
		max: scoreMaxLeadChanges,
		color: '#f1c40f',
	},
	{
		name: 'comeback',
		labelKey: 'powerScore.signalComeback',
		tooltipKey: 'powerScore.tooltipComeback',
		measuredKey: 'stepPowerScore.comebackMeasured',
		max: scoreMaxComeback,
		color: '#d90368',
	},
] as const;

const boostPenaltyMeta = [
	{
		name: 'clockStall',
		labelKey: 'stepPowerScore.clockStallPenaltyName',
		descriptionKey: 'powerScore.tooltipClockStallPenalty',
		measuredKey: 'stepPowerScore.clockStallPenaltyMeasured',
		color: '#ef4444',
		icon: 'hourglass-split',
	},
	{
		name: 'volatility',
		labelKey: 'stepPowerScore.volatilityName',
		descriptionKey: 'powerScore.tooltipVolatility',
		measuredKey: 'stepPowerScore.volatilityMeasured',
		color: '#a855f7',
		icon: 'activity',
	},
	{
		name: 'favorite',
		labelKey: 'stepPowerScore.favoriteBoostName',
		descriptionKey: 'powerScore.tooltipFavoriteBoost',
		measuredKey: 'stepPowerScore.favoriteBoostMeasured',
		color: '#f1c40f',
		icon: 'star-fill',
	},
	{
		name: 'gameBoost',
		labelKey: 'stepPowerScore.gameBoostName',
		descriptionKey: 'powerScore.tooltipGameBoost',
		measuredKey: 'stepPowerScore.gameBoostMeasured',
		color: '#22c55e',
		icon: 'lightning-fill',
	},
	{
		name: 'scoringOpp',
		labelKey: 'powerScore.scoringOpportunity',
		descriptionKey: 'powerScore.tooltipScoringOpportunity',
		measuredKey: 'stepPowerScore.scoringOpportunityMeasured',
		color: '#f75c03',
		icon: 'bullseye',
	},
	{
		name: 'postseason',
		labelKey: 'stepPowerScore.postseasonBoostName',
		descriptionKey: 'powerScore.tooltipPostseasonBoost',
		measuredKey: 'stepPowerScore.postseasonBoostMeasured',
		color: '#2274a5',
		icon: 'trophy-fill',
	},
] as const;

/** Compute dot positions around the orbit circle */
const buildDots = () =>
	signalMeta.map((sig, idx) => {
		const angle = -Math.PI / 2 + (idx * 72 * Math.PI) / 180;
		const radius = 50;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		return {
			...sig,
			pxX: x,
			pxY: y,
			style: {
				left: `calc(50% + ${x}px - 8px)`,
				top: `calc(50% + ${y}px - 8px)`,
				backgroundColor: sig.color,
				color: sig.color,
			},
		};
	});

const dots = buildDots();

const contrastText = (hex: string): string => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return lum > 0.55 ? '#111111' : '#ffffff';
};

// ─── Bloom Overlay ───────────────────────────────────────────────────────────

interface BloomOverlayProps {
	signal: (typeof signalMeta)[number];
	dotPxX: number;
	dotPxY: number;
	phase: 'blooming' | 'visible' | 'shrinking';
	onClick: () => void;
}

const BloomOverlay = ({ signal, dotPxX, dotPxY, phase, onClick }: BloomOverlayProps) => {
	const textColor = contrastText(signal.color);

	const containerCenterX = 160;
	const containerCenterY = 181;
	const originX = containerCenterX + dotPxX;
	const originY = containerCenterY + dotPxY;

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick();
		}
	};

	return (
		<div
			className={`ps-bloom-overlay ps-bloom-${phase}`}
			style={
				{
					backgroundColor: signal.color,
					'--bloom-origin-x': `${originX}px`,
					'--bloom-origin-y': `${originY}px`,
					color: textColor,
				} as React.CSSProperties
			}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			role='button'
			tabIndex={0}
			aria-label={`Signal: ${i18n.t(signal.labelKey)}`}
			aria-live='polite'
		>
			<div className='ps-bloom-content'>
				<div
					className='ps-bloom-dot-badge'
					style={{ border: `3px solid ${textColor}`, backgroundColor: signal.color }}
				/>

				<div className='ps-bloom-label' style={{ color: textColor }}>
					{i18n.t(signal.labelKey)}
				</div>

				<div className='ps-bloom-body' style={{ color: textColor }}>
					{i18n.t(signal.tooltipKey)}
				</div>

				<div className='ps-bloom-tap-hint' style={{ color: textColor }}>
					<i className='bi bi-hand-index-thumb' />
					Tap anywhere to continue
				</div>
			</div>
		</div>
	);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BLOOM_IN_DURATION = 450;
const BLOOM_OUT_DURATION = 400;

const isSignalSubStep = (s: number) => s >= 1 && s <= 5;

const walkthroughStepPowerScore = ({ onNext, onBack, initialSubStep = 0 }: walkthroughStepPowerScoreProps) => {
	const [subStep, setSubStep] = useState<number>(initialSubStep);
	const [bloomPhase, setBloomPhase] = useState<'blooming' | 'visible' | 'shrinking' | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	// Auto-bloom when landing on a signal substep
	useEffect(() => {
		clearTimer();
		setBloomPhase(null);

		if (!isSignalSubStep(subStep)) return;

		// Small delay so the dot renders before the bloom starts
		timerRef.current = setTimeout(() => {
			setBloomPhase('blooming');
			timerRef.current = setTimeout(() => {
				setBloomPhase('visible');
				timerRef.current = null;
			}, BLOOM_IN_DURATION);
		}, 150);

		return clearTimer;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subStep]);

	useEffect(() => () => clearTimer(), []);

	const advanceTo = (nextSubStep: number) => {
		clearTimer();

		if (isSignalSubStep(subStep) && bloomPhase && bloomPhase !== 'shrinking') {
			// Shrink the bloom first, then navigate
			setBloomPhase('shrinking');
			timerRef.current = setTimeout(() => {
				setBloomPhase(null);
				setSubStep(nextSubStep);
				timerRef.current = null;
			}, BLOOM_OUT_DURATION);
		} else {
			setBloomPhase(null);
			setSubStep(nextSubStep);
		}
	};

	const handleNext = () => {
		if (subStep < 11) {
			advanceTo(subStep + 1);
		} else {
			onNext();
		}
	};

	const handleBack = () => {
		if (subStep > 0) {
			advanceTo(subStep - 1);
		} else {
			onBack();
		}
	};

	const moveToSubStep = (idx: number) => {
		if (idx === subStep) return;
		advanceTo(idx);
	};

	const renderVisual = () => {
		if (subStep === 0) {
			return (
				<div className='powerscore-orbit-container' aria-hidden='true'>
					<div className='powerscore-orbit-ring animating'>
						{dots.map(dot => (
							<div
								key={dot.name}
								className='powerscore-orbit-dot'
								style={dot.style}
							/>
						))}
					</div>
					<div className='powerscore-orbit-center'>
						<img
							src='/images/icon_white_on_transparent.svg'
							alt='ArenaSwap'
							style={{ width: '28px', height: '28px' }}
						/>
					</div>
				</div>
			);
		}

		if (isSignalSubStep(subStep)) {
			const activeIdx = subStep - 1;
			return (
				<div className='powerscore-orbit-container' aria-hidden='true'>
					<div className='powerscore-orbit-ring'>
						{dots.map((dot, idx) => {
							const isActive = idx === activeIdx;
							return (
								<div
									key={dot.name}
									className={`powerscore-orbit-dot${isActive ? ' active' : ' dimmed'}`}
									style={dot.style}
									aria-label={i18n.t(dot.labelKey)}
								/>
							);
						})}
					</div>
					<div className='powerscore-orbit-center'>
						<img
							src='/images/icon_white_on_transparent.svg'
							alt='ArenaSwap'
							style={{ width: '28px', height: '28px' }}
						/>
					</div>
				</div>
			);
		}

		const activeBoost = boostPenaltyMeta[subStep - 6]!;
		return (
			<div className='powerscore-orbit-container'>
				<div
					className='powerscore-boost-icon-container'
					style={{ color: activeBoost.color, borderColor: `${activeBoost.color}40` }}
				>
					<i className={`bi bi-${activeBoost.icon}`} style={{ fontSize: '2.2rem', color: activeBoost.color }} />
				</div>
			</div>
		);
	};

	const renderContent = () => {
		if (subStep === 0) {
			return (
				<>
					<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepPowerScore.introTitle')}</div>
					<div className='text-body-secondary small text-center mb-3 lh-base'>
						{i18n.t('stepPowerScore.subtitle')}
					</div>
					{renderVisual()}
					<p className='text-body-secondary small lh-base text-center mt-2 px-1'>
						{i18n.t('stepPowerScore.introBody')}
					</p>
				</>
			);
		}

		if (isSignalSubStep(subStep)) {
			const activeSignal = signalMeta[subStep - 1]!;
			const activeDot = dots[subStep - 1]!;
			return (
				<>
					<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepPowerScore.title')}</div>
					<div className='text-body-secondary small text-center mb-3 lh-base'>
						{i18n.t('stepPowerScore.subtitle')}
					</div>
					{renderVisual()}
					{bloomPhase && (
						<BloomOverlay
							signal={activeSignal}
							dotPxX={activeDot.pxX}
							dotPxY={activeDot.pxY}
							phase={bloomPhase}
							onClick={handleNext}
						/>
					)}
				</>
			);
		}

		const activeBoost = boostPenaltyMeta[subStep - 6]!;
		return (
			<>
				<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepPowerScore.boostsHeading')}</div>
				<div className='text-body-secondary small text-center mb-3 lh-base'>
					{i18n.t('stepPowerScore.boostsSubtitle')}
				</div>
				{renderVisual()}
				<div className='text-center px-3 mt-2'>
					<div className='fw-semibold small mb-1' style={{ color: activeBoost.color }}>
						{i18n.t(activeBoost.labelKey)}
					</div>
					<p className='text-body-secondary small lh-base mb-0'>
						{i18n.t(activeBoost.descriptionKey)}
					</p>
				</div>
			</>
		);
	};

	return (
		<div className='popup-container d-flex flex-column' style={{ position: 'relative', overflow: 'hidden' }}>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2 walkthrough-step-label'>
				{i18n.t('stepPowerScore.step', [2, 8])}
			</div>

			{renderContent()}

			<ul className='powerscore-progress-dots' aria-label='Walkthrough progress'>
				{Array.from({ length: 12 }).map((_, idx) => {
					let dotColor = '#8b949e';
					let label = 'PowerScore Intro';
					if (idx >= 1 && idx <= 5) {
						const sig = signalMeta[idx - 1]!;
						dotColor = sig.color;
						label = i18n.t(sig.labelKey);
					} else if (idx >= 6) {
						const boost = boostPenaltyMeta[idx - 6]!;
						dotColor = boost.color;
						label = i18n.t(boost.labelKey);
					}

					const isActive = idx === subStep;
					return (
						<li key={idx}>
							<button
								type='button'
								className={`powerscore-progress-dot${isActive ? ' active' : ''}`}
								style={{ color: isActive ? dotColor : undefined, backgroundColor: isActive ? dotColor : undefined }}
								onClick={() => moveToSubStep(idx)}
								title={label}
								aria-label={label}
								aria-current={isActive ? 'step' : undefined}
							/>
						</li>
					);
				})}
			</ul>

			<div className='d-flex gap-2 mt-auto walkthrough-step-actions'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={handleBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepPowerScore.back')}
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={handleNext}>
					{subStep === 0 ? i18n.t('stepPowerScore.introButton') : i18n.t('stepPowerScore.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepPowerScore;
