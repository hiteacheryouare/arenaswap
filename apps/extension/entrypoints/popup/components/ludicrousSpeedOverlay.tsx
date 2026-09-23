import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import { createPortal } from 'react-dom';
import { buildScript, type DisplayState, type Phase, type View } from './ludicrousScript';
import { preloadLogoImages } from './ludicrousLeagueLogos';
import { cockpitBrakeRect } from './ludicrousCockpit';
import LudicrousStage from './ludicrousStage';

export default ({ onClose }: { onClose: () => void }) => {
	const script = useMemo(buildScript, []);
	const logoImages = useMemo(preloadLogoImages, []);

	const phaseRef = useRef<Phase>('prelaunch');
	const speedRef = useRef(0.08);
	const logosRef = useRef(false);

	const [view, setView] = useState<View>('cockpit');
	const [display, setDisplay] = useState<DisplayState>({ text: '', cls: 'dialogue prelaunch' });
	const [brakeState, setBrakeState] = useState<'hidden' | 'visible' | 'pressed'>('hidden');
	const [closing, setClosing] = useState(false);
	const [size, setSize] = useState<{ w: number; h: number } | null>(null);

	const beatTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const manualTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const finishedRef = useRef(false);

	/* Skipping and braking both stop the ship, and they want different amounts of time for it.
	   Clicking to skip is someone asking to leave, so it leaves. Pulling the brake is a beat in the
	   sequence, so the deceleration gets played out the same way the scripted ending does. */
	const finish = useCallback((fast: boolean) => {
		if (finishedRef.current) return;
		finishedRef.current = true;
		clearTimeout(beatTimerRef.current);
		phaseRef.current = 'stopping';
		speedRef.current = 0;
		logosRef.current = false;
		setView('rear');
		setDisplay({ text: i18n.t('ludicrousSpeed.stop'), cls: 'stop' });
		manualTimersRef.current.push(setTimeout(() => setClosing(true), fast ? 700 : 3800));
	}, []);

	const runBeat = useCallback((index: number) => {
		const beat = script[index];
		if (!beat) return;

		if (beat.end) {
			setClosing(true);
			return;
		}
		if (beat.phase) phaseRef.current = beat.phase;
		if (beat.speed !== undefined) speedRef.current = beat.speed;
		if (beat.view) setView(beat.view);
		if (beat.display) setDisplay(beat.display);
		if (beat.brake) setBrakeState(beat.brake);
		logosRef.current = Boolean(beat.logos);

		beatTimerRef.current = setTimeout(() => runBeat(index + 1), beat.ms);
	}, [script]);

	useEffect(() => {
		runBeat(0);
		return () => clearTimeout(beatTimerRef.current);
	}, [runBeat]);

	// Stops a queued skip / emergency-brake timer setting state after unmount.
	useEffect(() => () => manualTimersRef.current.forEach(clearTimeout), []);

	useEffect(() => {
		if (!closing) return;
		const t = setTimeout(onClose, 450);
		return () => clearTimeout(t);
	}, [closing, onClose]);

	const handleSkip = useCallback(() => finish(true), [finish]);

	const handleEmergencyBrake = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		if (brakeState === 'pressed' || finishedRef.current) return;
		setBrakeState('pressed');
		manualTimersRef.current.push(setTimeout(() => finish(false), 500));
	}, [brakeState, finish]);

	// The overlay is role='button', so these are the click rather than controls of their own.
	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		handleSkip();
	}, [handleSkip]);

	const handleMeasure = useCallback((w: number, h: number) => setSize({ w, h }), []);

	const overlayRef = useRef<HTMLDivElement>(null);
	useEffect(() => overlayRef.current?.focus(), []);

	// The brake is part of the console rather than a floating button, so it is placed onto the rect
	// the canvas drew its placard into instead of being guessed at in CSS.
	const brakeRect = size ? cockpitBrakeRect(size.w, size.h) : null;
	const brakeStyle = brakeRect
		? { left: `${brakeRect.x}px`, top: `${brakeRect.y}px`, width: `${brakeRect.w}px`, height: `${brakeRect.h}px` }
		: undefined;

	return createPortal(
		<div
			ref={overlayRef}
			role='button'
			className={`ls-overlay ls-view-${view}${closing ? ' closing' : ''}`}
			onClick={handleSkip}
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			<LudicrousStage
				view={view}
				phaseRef={phaseRef}
				speedRef={speedRef}
				logosRef={logosRef}
				brakeArmed={brakeState !== 'hidden'}
				brakePulled={brakeState === 'pressed'}
				logoImages={logoImages}
				onMeasure={handleMeasure}
			/>
			<div className={`ls-text ${display.cls}`}>{display.text}</div>
			{brakeState !== 'hidden' && view === 'cockpit' && brakeStyle && (
				<button
					className={`ls-emergency-brake${brakeState === 'pressed' ? ' pressed' : ''}`}
					style={brakeStyle}
					onClick={handleEmergencyBrake}
				>
					{i18n.t('ludicrousSpeed.emergencyBrake')}
				</button>
			)}
			<div className='ls-skip'>{i18n.t('ludicrousSpeed.skip')}</div>
		</div>,
		document.body,
	);
};
