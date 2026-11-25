import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import { createPortal } from 'react-dom';
import { buildScript, type DisplayState, type Phase, type View } from './ludicrousScript';
import { preloadLogoImages } from './ludicrousLeagueLogos';
import { cockpitBrakeRect } from './ludicrousCockpit';
import LudicrousStage from './ludicrousStage';

const trailingEllipsis = /(…+|\.{3})$/;

const stopHoldMs = 2600;

const renderDisplayText = ({ text, cls }: DisplayState) => {
	const dots = cls.includes('announce') ? text.match(trailingEllipsis)?.[0] : undefined;
	if (!dots) return text;
	return <>{text.slice(0, -dots.length)}<span className='ls-dots'>{dots}</span></>;
};

export default ({ onClose }: { onClose: () => void }) => {
	const script = useMemo(buildScript, []);
	const logoImages = useMemo(preloadLogoImages, []);

	const phaseRef = useRef<Phase>('prelaunch');
	const speedRef = useRef(0.08);
	const logosRef = useRef(false);
	const viewRef = useRef<View>('cockpit');

	const [view, setView] = useState<View>('cockpit');
	const [display, setDisplay] = useState<DisplayState>({ text: '', cls: 'dialogue' });
	const [displayKey, setDisplayKey] = useState(0);
	const [beatIndex, setBeatIndex] = useState(0);
	const [stopped, setStopped] = useState(false);
	const [brakeState, setBrakeState] = useState<'hidden' | 'visible' | 'pressed'>('hidden');
	const [closing, setClosing] = useState(false);
	const [size, setSize] = useState<{ w: number; h: number } | null>(null);

	const beatTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const manualTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const finishedRef = useRef(false);

	const finish = useCallback((fast: boolean) => {
		if (finishedRef.current) return;
		finishedRef.current = true;
		clearTimeout(beatTimerRef.current);
		setStopped(true);
		setView('rear');
		setDisplay({ text: i18n.t('ludicrousSpeed.stop'), cls: 'shout stop' });
		setDisplayKey(key => key + 1);
		manualTimersRef.current.push(setTimeout(() => setClosing(true), fast ? 700 : stopHoldMs));
	}, []);

	const runBeat = useCallback((index: number) => {
		const beat = script[index];
		if (!beat) return;

		if (beat.end) {
			setClosing(true);
			return;
		}
		setBeatIndex(index);
		if (beat.view) setView(beat.view);
		if (beat.display) {
			setDisplay(beat.display);
			setDisplayKey(index);
		}
		if (beat.brake) setBrakeState(beat.brake);

		beatTimerRef.current = setTimeout(() => runBeat(index + 1), beat.ms);
	}, [script]);

	// The canvas reads these refs every frame, so they change in the same commit as the DOM layers.
	useLayoutEffect(() => {
		if (stopped) {
			phaseRef.current = 'stopping';
			speedRef.current = 0;
			logosRef.current = false;
			viewRef.current = 'rear';
			return;
		}
		const beat = script[beatIndex];
		if (!beat || beat.end) return;
		if (beat.phase) phaseRef.current = beat.phase;
		if (beat.speed !== undefined) speedRef.current = beat.speed;
		if (beat.view) viewRef.current = beat.view;
		logosRef.current = Boolean(beat.logos);
	}, [beatIndex, stopped, script]);

	useEffect(() => {
		runBeat(0);
		return () => clearTimeout(beatTimerRef.current);
	}, [runBeat]);

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

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		handleSkip();
	}, [handleSkip]);

	const handleMeasure = useCallback((w: number, h: number) => setSize({ w, h }), []);

	const overlayRef = useRef<HTMLDivElement>(null);
	useEffect(() => overlayRef.current?.focus(), []);

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
				viewRef={viewRef}
				phaseRef={phaseRef}
				speedRef={speedRef}
				logosRef={logosRef}
				brakeArmed={brakeState !== 'hidden'}
				brakePulled={brakeState === 'pressed'}
				logoImages={logoImages}
				onMeasure={handleMeasure}
			/>
			<div key={displayKey} className={`ls-text ${display.cls}`}>{renderDisplayText(display)}</div>
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
