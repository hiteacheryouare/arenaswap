import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
} from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import WalkthroughFrame from './walkthroughFrame';

interface walkthroughStepPowerScoreProps {
	onNext: () => void;
	onBack: () => void;
	initialSubStep?: number;
}

export const signalMeta = [
	{ name: 'closeness', labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', max: scoreMaxCloseness, color: '#22c55e' },
	{ name: 'lateGame', labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', max: scoreMaxLateGame, color: '#f75c03' },
	{ name: 'momentum', labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ name: 'leadChanges', labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ name: 'comeback', labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', max: scoreMaxComeback, color: '#d90368' },
] as const;

const boostPenaltyMeta = [
	{ name: 'clockStall', labelKey: 'stepPowerScore.clockStallPenaltyName', descriptionKey: 'powerScore.tooltipClockStallPenalty', color: '#ef4444', icon: 'hourglass-split' },
	{ name: 'volatility', labelKey: 'stepPowerScore.volatilityName', descriptionKey: 'powerScore.tooltipVolatility', color: '#a855f7', icon: 'activity' },
	{ name: 'favorite', labelKey: 'stepPowerScore.favoriteBoostName', descriptionKey: 'powerScore.tooltipFavoriteBoost', color: '#f1c40f', icon: 'star-fill' },
	{ name: 'gameBoost', labelKey: 'stepPowerScore.gameBoostName', descriptionKey: 'powerScore.tooltipGameBoost', color: '#22c55e', icon: 'lightning-fill' },
	{ name: 'scoringOpp', labelKey: 'powerScore.scoringOpportunity', descriptionKey: 'powerScore.tooltipScoringOpportunity', color: '#f75c03', icon: 'bullseye' },
	{ name: 'postseason', labelKey: 'stepPowerScore.postseasonBoostName', descriptionKey: 'powerScore.tooltipPostseasonBoost', color: '#2274a5', icon: 'trophy-fill' },
] as const;

const orbitRadius = 50;

// Five signals, a fifth of a turn apart, starting at twelve o'clock.
const dots = signalMeta.map((signal, index) => {
	const angle = -Math.PI / 2 + (index * 2 * Math.PI) / signalMeta.length;
	return {
		...signal,
		style: {
			'--signal': signal.color,
			left: `calc(50% + ${Math.cos(angle) * orbitRadius}px - 8px)`,
			top: `calc(50% + ${Math.sin(angle) * orbitRadius}px - 8px)`,
		} as CSSProperties,
	};
});

const inkOn = (hex: string): string => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#111111' : '#ffffff';
};

type bloomPhase = 'blooming' | 'visible' | 'shrinking';

interface bloomOverlayProps {
	signal: (typeof signalMeta)[number];
	origin: { x: number; y: number };
	phase: bloomPhase;
	onClick: () => void;
}

const BloomOverlay = ({ signal, origin, phase, onClick }: bloomOverlayProps) => {
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick();
		}
	};

	return (
		<div
			className={`ps-bloom-overlay ps-bloom-${phase}`}
			style={{
				'--signal': signal.color,
				'--bloom-ink': inkOn(signal.color),
				'--bloom-origin-x': `${origin.x}px`,
				'--bloom-origin-y': `${origin.y}px`,
			} as CSSProperties}
			onClick={onClick}
			onKeyDown={onKeyDown}
			role='button'
			tabIndex={0}
			aria-label={i18n.t('stepPowerScore.signalAriaLabel', { signal: i18n.t(signal.labelKey) })}
			aria-live='polite'
		>
			<div className='ps-bloom-content'>
				<i className='ps-bloom-dot' aria-hidden='true' />
				<div className='ps-bloom-label'>{i18n.t(signal.labelKey)}</div>
				<p className='ps-bloom-body'>{i18n.t(signal.tooltipKey)}</p>
				<div className='ps-bloom-tap-hint'>
					<i className='bi bi-hand-index-thumb' aria-hidden='true' />
					{i18n.t('stepPowerScore.tapHint')}
				</div>
			</div>
		</div>
	);
};

const bloomInMs = 450;
const bloomOutMs = 400;
const bloomDelayMs = 150;
const lastSubStep = signalMeta.length + boostPenaltyMeta.length;

const isSignalSubStep = (subStep: number) => subStep >= 1 && subStep <= signalMeta.length;

const walkthroughStepPowerScore = ({ onNext, onBack, initialSubStep = 0 }: walkthroughStepPowerScoreProps) => {
	const [subStep, setSubStep] = useState<number>(initialSubStep);
	const [bloom, setBloom] = useState<bloomPhase | null>(null);
	const [origin, setOrigin] = useState({ x: 160, y: 200 });
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const screenRef = useRef<HTMLDivElement>(null);
	const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	useEffect(() => {
		clearTimer();
		setBloom(null);
		if (!isSignalSubStep(subStep)) return;

		timerRef.current = setTimeout(() => {
			// The bloom grows out of the dot it explains, wherever the layout has put that dot.
			const dot = dotRefs.current[subStep - 1]?.getBoundingClientRect();
			const screen = screenRef.current?.getBoundingClientRect();
			if (dot && screen) setOrigin({ x: dot.left + dot.width / 2 - screen.left, y: dot.top + dot.height / 2 - screen.top });
			setBloom('blooming');
			timerRef.current = setTimeout(() => {
				setBloom('visible');
				timerRef.current = null;
			}, bloomInMs);
		}, bloomDelayMs);

		return clearTimer;
	}, [subStep]);

	useEffect(() => () => clearTimer(), []);

	const advanceTo = (next: number) => {
		clearTimer();
		if (isSignalSubStep(subStep) && bloom && bloom !== 'shrinking') {
			setBloom('shrinking');
			timerRef.current = setTimeout(() => {
				setBloom(null);
				setSubStep(next);
				timerRef.current = null;
			}, bloomOutMs);
		} else {
			setBloom(null);
			setSubStep(next);
		}
	};

	const handleNext = () => {
		if (subStep < lastSubStep) advanceTo(subStep + 1);
		else onNext();
	};

	const handleBack = () => {
		if (subStep > 0) advanceTo(subStep - 1);
		else onBack();
	};

	const moveToSubStep = (index: number) => {
		if (index !== subStep) advanceTo(index);
	};

	const boost = subStep > signalMeta.length ? boostPenaltyMeta[subStep - signalMeta.length - 1]! : null;
	const activeSignal = isSignalSubStep(subStep) ? signalMeta[subStep - 1]! : null;

	const title = subStep === 0
		? i18n.t('stepPowerScore.introTitle')
		: boost ? i18n.t('stepPowerScore.boostsHeading') : i18n.t('stepPowerScore.title');
	const lede = boost ? i18n.t('stepPowerScore.boostsSubtitle') : i18n.t('stepPowerScore.subtitle');

	return (
		<WalkthroughFrame
			step={2}
			stepLabel={i18n.t('stepPowerScore.step', [2, 8])}
			title={title}
			lede={lede}
			backLabel={i18n.t('stepPowerScore.back')}
			onBack={handleBack}
			nextLabel={subStep === 0 ? i18n.t('stepPowerScore.introButton') : i18n.t('stepPowerScore.next')}
			onNext={handleNext}
			className='wt-powerscore'
			scrollerRef={screenRef}
		>
			{boost ? (
				<div className='wt-boost' style={{ '--signal': boost.color } as CSSProperties}>
					<div className='wt-boost-mark'>
						<i className={`bi bi-${boost.icon}`} aria-hidden='true' />
					</div>
					<b>{i18n.t(boost.labelKey)}</b>
					<p>{i18n.t(boost.descriptionKey)}</p>
				</div>
			) : (
				<div className='wt-orbit' aria-hidden='true'>
					<div className={`wt-orbit-ring${subStep === 0 ? ' is-turning' : ''}`}>
						{dots.map((dot, index) => (
							<div
								key={dot.name}
								ref={node => { dotRefs.current[index] = node; }}
								className={`wt-orbit-dot${activeSignal ? (index === subStep - 1 ? ' is-active' : ' is-dimmed') : ''}`}
								style={dot.style}
							/>
						))}
					</div>
					<div className='wt-orbit-center'>
						<span className='wt-orbit-mark' />
					</div>
				</div>
			)}

			{subStep === 0 && <p className='wt-body wt-body-center'>{i18n.t('stepPowerScore.introBody')}</p>}

			{activeSignal && bloom && (
				<BloomOverlay signal={activeSignal} origin={origin} phase={bloom} onClick={handleNext} />
			)}

			<ul className='wt-dots' aria-label={i18n.t('stepPowerScore.progressAriaLabel')}>
				{Array.from({ length: lastSubStep + 1 }, (_, index) => {
					const signal = index >= 1 && index <= signalMeta.length ? signalMeta[index - 1]! : null;
					const entry = index > signalMeta.length ? boostPenaltyMeta[index - signalMeta.length - 1]! : null;
					const label = signal ? i18n.t(signal.labelKey) : entry ? i18n.t(entry.labelKey) : i18n.t('stepPowerScore.introDotLabel');
					const active = index === subStep;
					return (
						<li key={index}>
							<button
								type='button'
								className={`powerscore-progress-dot${active ? ' active' : ''}`}
								style={{ '--signal': signal?.color ?? entry?.color ?? 'var(--as-ink)' } as CSSProperties}
								onClick={() => moveToSubStep(index)}
								title={label}
								aria-label={label}
								aria-current={active ? 'step' : undefined}
							/>
						</li>
					);
				})}
			</ul>
		</WalkthroughFrame>
	);
};

export default walkthroughStepPowerScore;
