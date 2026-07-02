import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '#i18n';

const NUM_STARS = 155;

interface Star {
	x: number;
	y: number;
	z: number;
	px: number | null;
	py: number | null;
}

// Canvas visual phase — drives star color, speed target, and fade rate
type Phase = 'prelaunch' | 'cockpit' | 'cruising' | 'lightspeed' | 'ridiculous' | 'ludicrous' | 'plaid' | 'panic' | 'stopping';

interface DisplayState {
	text: string;
	cls: string;
}

// ArenaSwap brand colors — 5 distinct lanes for the plaid effect
const BRAND_COLORS: [number, number, number][] = [
	[247, 92, 3],   // #F75C03 orange
	[34, 116, 165], // #2274A5 blue
	[217, 3, 104],  // #D90368 magenta
	[0, 204, 102],  // #00CC66 green
	[241, 196, 15], // #F1C40F gold
];

function makeStar(): Star {
	return {
		x: (Math.random() - 0.5) * 1.5,
		y: (Math.random() - 0.5) * 1.5,
		z: Math.random() * 0.8 + 0.15,
		px: null,
		py: null,
	};
}

function resetStar(s: Star): void {
	s.x = (Math.random() - 0.5) * 1.5;
	s.y = (Math.random() - 0.5) * 1.5;
	s.z = 0.88 + Math.random() * 0.12;
	s.px = null;
	s.py = null;
}

function getStarColor(z: number, phase: Phase, frame: number, starIdx: number): string {
	// Closer stars (lower z) are brighter
	const bri = Math.round(195 + (1 - z) * 60);
	const f = 0.38 + (1 - z) * 0.62;

	switch (phase) {
		case 'prelaunch':
		case 'cockpit':
			// Faint cool-blue ambient starfield — looks like normal space
			return `rgb(${Math.round(bri * 0.35 * f)},${Math.round(bri * 0.5 * f)},${Math.round(bri * f)})`;
		case 'cruising':
			// Warm white-amber post-launch
			return `rgb(${Math.round(bri * f)},${Math.round(bri * 0.8 * f)},${Math.round(bri * 0.45 * f)})`;
		case 'lightspeed':
			// Green-cyan to match the green dashboard sign
			return `rgb(${Math.round(bri * 0.15 * f)},${Math.round(bri * f)},${Math.round(bri * 0.82 * f)})`;
		case 'ridiculous':
			// Deep amber-orange to match the orange sign
			return `rgb(${Math.round(bri * f)},${Math.round(bri * 0.55 * f)},${Math.round(bri * 0.07 * f)})`;
		case 'ludicrous':
			// Saturated red to match the blinking red sign
			return `rgb(${Math.round(bri * f)},${Math.round(bri * 0.15 * f)},${Math.round(bri * 0.04 * f)})`;
		case 'plaid': {
			// Each star has a fixed color lane (stable by index) → distinct colored streaks
			// Slowly rotates every ~40 frames so it stays dynamic
			const laneIdx = (starIdx + Math.floor(frame / 40)) % BRAND_COLORS.length;
			const c = BRAND_COLORS[laneIdx]!;
			return `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`;
		}
		case 'panic':
			// Cooling red-orange
			return `rgb(${Math.round(bri * 0.9 * f)},${Math.round(bri * 0.25 * f)},${Math.round(bri * 0.06 * f)})`;
		case 'stopping':
			// Desaturating to white as momentum bleeds off
			return `rgb(${Math.round(bri * f)},${Math.round(bri * 0.84 * f)},${Math.round(bri * 0.7 * f)})`;
		default:
			return `rgb(${Math.round(bri * f)},${Math.round(bri * f)},${Math.round(bri * f)})`;
	}
}

export default function LudicrousSpeedOverlay({ onClose }: { onClose: () => void }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const starsRef = useRef<Star[]>(Array.from({ length: NUM_STARS }, makeStar));
	const rafRef = useRef<number>(0);

	// Lerp-driven speed: set targetSpeed from the sequence; canvas smoothly follows
	const phaseRef = useRef<Phase>('prelaunch');
	const targetSpeedRef = useRef(0.08);
	const currentSpeedRef = useRef(0.08);
	const frameRef = useRef(0);

	const [display, setDisplay] = useState<DisplayState>({
		text: i18n.t('ludicrousSpeed.intro.l1'),
		cls: 'dialogue prelaunch',
	});
	const [closing, setClosing] = useState(false);
	const [brakeState, setBrakeState] = useState<'hidden' | 'visible' | 'pressed'>('hidden');

	// Canvas warp tunnel
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const draw = () => {
			const phase = phaseRef.current;
			const frame = frameRef.current++;

			// Smooth speed lerp — stopping snaps harder for the emergency-brake drama
			const lerpFactor = phase === 'stopping' ? 0.16 : 0.04;
			currentSpeedRef.current += (targetSpeedRef.current - currentSpeedRef.current) * lerpFactor;
			const speed = currentSpeedRef.current;

			const { width, height } = canvas;
			const cx = width / 2;
			const cy = height / 2;

			// Slower fade → longer, more visible star trails
			const fadeAlpha = (phase === 'prelaunch' || phase === 'cockpit') ? 0.16 : phase === 'plaid' ? 0.09 : 0.11;
			ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
			ctx.fillRect(0, 0, width, height);

			starsRef.current.forEach((star, starIdx) => {
				const ppx = star.px;
				const ppy = star.py;

				star.z -= speed * 0.007;
				if (star.z <= 0.01) { resetStar(star); return; }

				const sx = cx + (star.x / star.z) * cx * 0.80;
				const sy = cy + (star.y / star.z) * cy * 0.80;

				if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
					resetStar(star); return;
				}

				// During plaid, skip every 3rd star's line to thin out density without slowing anything down
				if (ppx !== null && ppy !== null && !(phase === 'plaid' && starIdx % 3 === 0)) {
					ctx.beginPath();
					ctx.moveTo(ppx, ppy);
					ctx.lineTo(sx, sy);
					ctx.strokeStyle = getStarColor(star.z, phase, frame, starIdx);
					// Thick lines: closeness + speed bonus so high-speed streaks are fat and vivid
					ctx.lineWidth = Math.max(1.5, (1 - star.z) * 7 + speed * 0.18);
					ctx.stroke();
				}

				star.px = sx;
				star.py = sy;
			});

			if (phase === 'stopping' && speed < 0.04) {
				setClosing(true);
				return;
			}

			rafRef.current = requestAnimationFrame(draw);
		};

		rafRef.current = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	useEffect(() => {
		if (!closing) return;
		const t = setTimeout(onClose, 450);
		return () => clearTimeout(t);
	}, [closing, onClose]);

	// Sequence — movie order
	useEffect(() => {
		const timers: ReturnType<typeof setTimeout>[] = [];
		let delay = 0;

		const at = (ms: number, fn: () => void) => {
			timers.push(setTimeout(fn, ms));
		};

		// ── Intro: the light-speed negotiation before Helmet takes over ─────────────
		const introLines: { key: string; ms: number }[] = [
			{ key: 'ludicrousSpeed.intro.l1', ms: 1500 },
			{ key: 'ludicrousSpeed.intro.l2', ms: 1500 },
			{ key: 'ludicrousSpeed.intro.l3', ms: 1200 },
			{ key: 'ludicrousSpeed.intro.l4', ms: 1600 },
			{ key: 'ludicrousSpeed.intro.l5', ms: 1200 },
			{ key: 'ludicrousSpeed.intro.l6', ms: 1200 },
			{ key: 'ludicrousSpeed.intro.l7', ms: 1500 },
			{ key: 'ludicrousSpeed.intro.l8', ms: 1500 },
		];

		for (const line of introLines) {
			const d = delay;
			at(d, () => setDisplay({ text: i18n.t(line.key), cls: 'dialogue prelaunch' }));
			delay += line.ms;
		}

		// ── Pre-launch: slow ambient starfield while all setup dialogue plays ──────
		const prelaunchLines: { key: string; ms: number }[] = [
			{ key: 'ludicrousSpeed.prelaunch.l1', ms: 1500 },
			{ key: 'ludicrousSpeed.prelaunch.l2', ms: 1100 },
			{ key: 'ludicrousSpeed.prelaunch.l3', ms: 1600 },
			{ key: 'ludicrousSpeed.prelaunch.l4', ms: 1300 },
			{ key: 'ludicrousSpeed.prelaunch.l5', ms: 1300 },
			{ key: 'ludicrousSpeed.prelaunch.l6', ms: 1300 },
			{ key: 'ludicrousSpeed.prelaunch.l7', ms: 1300 },
			{ key: 'ludicrousSpeed.prelaunch.l8', ms: 1200 },
			{ key: 'ludicrousSpeed.prelaunch.l9', ms: 1400 },
			{ key: 'ludicrousSpeed.prelaunch.l10', ms: 1500 },
			{ key: 'ludicrousSpeed.prelaunch.l11', ms: 1100 },
			{ key: 'ludicrousSpeed.prelaunch.l12', ms: 900 },
		];

		for (const line of prelaunchLines) {
			const d = delay;
			at(d, () => setDisplay({ text: i18n.t(line.key), cls: 'dialogue prelaunch' }));
			delay += line.ms;
		}

		// ── "LUDICROUS SPEED..." — big text, stars still slow ─────────────────────
		at(delay, () => setDisplay({ text: i18n.t('ludicrousSpeed.announce'), cls: 'announce' }));
		delay += 1600;

		// ── "GO!" — stars explode at exactly this moment ──────────────────────────
		at(delay, () => {
			phaseRef.current = 'cruising';
			targetSpeedRef.current = 5.5;
			setDisplay({ text: i18n.t('ludicrousSpeed.go'), cls: 'go' });
		});
		delay += 1300;

		// ── G-force chaos ─────────────────────────────────────────────────────────
		at(delay, () => setDisplay({ text: i18n.t('ludicrousSpeed.gforce.l1'), cls: 'dialogue postlaunch' }));
		delay += 1200;
		at(delay, () => {
			targetSpeedRef.current = 6.5;
			setDisplay({ text: i18n.t('ludicrousSpeed.gforce.l2'), cls: 'dialogue postlaunch' });
		});
		delay += 1600;

		// ── Dashboard speed signs: green → orange → red flashing ─────────────────
		at(delay, () => {
			phaseRef.current = 'lightspeed';
			targetSpeedRef.current = 7.5;
			setDisplay({ text: i18n.t('ludicrousSpeed.signs.light'), cls: 'speedsign lightspeed' });
		});
		delay += 2000;

		at(delay, () => {
			phaseRef.current = 'ridiculous';
			targetSpeedRef.current = 9.5;
			setDisplay({ text: i18n.t('ludicrousSpeed.signs.ridiculous'), cls: 'speedsign ridiculous' });
		});
		delay += 2000;

		at(delay, () => {
			phaseRef.current = 'ludicrous';
			targetSpeedRef.current = 12.5;
			setDisplay({ text: i18n.t('ludicrousSpeed.signs.ludicrous'), cls: 'speedsign ludicrous' });
		});
		delay += 2200;

		// ── Cockpit POV: speed drops back to normal — Lone Starr & Barf observe ──
		at(delay, () => {
			phaseRef.current = 'cockpit';
			targetSpeedRef.current = 0.08;
			setDisplay({ text: i18n.t('ludicrousSpeed.cockpit.l1'), cls: 'dialogue external' });
		});
		delay += 1200;
		at(delay, () => setDisplay({ text: i18n.t('ludicrousSpeed.cockpit.l2'), cls: 'dialogue external' }));
		delay += 1100;

		// ── THEY'VE GONE TO PLAID — warp explodes back with brand colors ─────────
		at(delay, () => {
			phaseRef.current = 'plaid';
			targetSpeedRef.current = 14;
			setDisplay({ text: i18n.t('ludicrousSpeed.plaid'), cls: 'plaid' });
		});
		delay += 2200;

		// ── Panic on the bridge ───────────────────────────────────────────────────
		at(delay, () => {
			phaseRef.current = 'panic';
			targetSpeedRef.current = 10;
			setBrakeState('visible');
		});

		const panicLines: { key: string; ms: number }[] = [
			{ key: 'ludicrousSpeed.panic.l1', ms: 1400 },
			{ key: 'ludicrousSpeed.panic.l2', ms: 1400 },
			{ key: 'ludicrousSpeed.panic.l3', ms: 1400 },
			{ key: 'ludicrousSpeed.panic.l4', ms: 1400 },
		];
		for (const line of panicLines) {
			const d = delay;
			at(d, () => setDisplay({ text: i18n.t(line.key), cls: 'dialogue panic' }));
			delay += line.ms;
		}

		// ── EMERGENCY STOP — NEVER USE ────────────────────────────────────────────
		at(delay, () => setBrakeState('pressed'));
		delay += 700;

		at(delay, () => {
			phaseRef.current = 'stopping';
			targetSpeedRef.current = 0;
			setDisplay({ text: i18n.t('ludicrousSpeed.stop'), cls: 'stop' });
		});
		delay += 1800;

		at(delay, () => setClosing(true));
		return () => timers.forEach(clearTimeout);
	}, []);

	const handleSkip = useCallback(() => {
		if (phaseRef.current === 'stopping') return;
		phaseRef.current = 'stopping';
		targetSpeedRef.current = 0;
		setDisplay({ text: i18n.t('ludicrousSpeed.stop'), cls: 'stop' });
		setTimeout(() => setClosing(true), 750);
	}, []);

	const handleEmergencyBrake = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		if (brakeState === 'pressed' || phaseRef.current === 'stopping') return;
		setBrakeState('pressed');
		setTimeout(() => {
			if (phaseRef.current === 'stopping') return;
			phaseRef.current = 'stopping';
			targetSpeedRef.current = 0;
			setDisplay({ text: i18n.t('ludicrousSpeed.stop'), cls: 'stop' });
			setTimeout(() => setClosing(true), 750);
		}, 500);
	}, [brakeState]);

	return createPortal(
		<div className={`ls-overlay${closing ? ' closing' : ''}`} onClick={handleSkip}>
			<canvas ref={canvasRef} className="ls-canvas" />
			<div className={`ls-text ${display.cls}`}>{display.text}</div>
			{brakeState !== 'hidden' && (
				<button
					className={`ls-emergency-brake${brakeState === 'pressed' ? ' pressed' : ''}`}
					onClick={handleEmergencyBrake}
				>
					{i18n.t('ludicrousSpeed.emergencyBrake')}
				</button>
			)}
			<div className="ls-skip">{i18n.t('ludicrousSpeed.skip')}</div>
		</div>,
		document.body,
	);
}
