import { aPath, arenPath, chevronFrom, chevronTo, headFrom, headTo, sPath, wapPath } from '../../../../packages/ui/src/components/wordmarkShapes';
import { ringPath } from '../../../../packages/ui/src/components/wordmarkPose';
import { barCentreRest, barJoint, barRest, barStrokeRest, dashCentreRest, dashFirstCapRest, dashLastCapRest, dashStrokeRest, restBox } from '../../../../packages/ui/src/components/wordmarkFrame';
import { dotOrange } from '../components/overlay';
import SportBall, { ballOrder, type BallKind } from '../components/sportBalls';
import { liveBadgeSelector, liveDotSelector } from '../cuts/shared';
import { beats, easeIn, easeInOut, easeSignature, lerp, progress, spring } from '../timing';
import { Desk, deskLayouts } from './desk';
import type { ShotContext, ShotModule } from './shotTypes';

// The dot's rest position in the wordmark's own units.
const dotRest = { cx: 1761.1208, cy: 368.38882, r: 27.6 };
const barStart = barRest + barStrokeRest / 2;
const barLength = barJoint - barStart;

// The badge lifts off in the card's first beats, the balls change and the dot lands when the cut's
// schedule says (on the soundtrack's beats), and the wordmark builds around the landing. Beats are
// squeezed by the schedule's pace in the 15.
const scheduleOf = (ctx: ShotContext) => ctx.shot.ending!;
const lift = (ctx: ShotContext, from: number, to: number) => {
	const { pace } = scheduleOf(ctx);
	return progress(ctx.t, ctx.shot.from + beats(from * pace), ctx.shot.from + beats(to * pace));
};
const afterLanding = (ctx: ShotContext, beatsAfter: number) => scheduleOf(ctx).landsAt + beats(beatsAfter * scheduleOf(ctx).pace);

// The dot, then each ball, then the dot again. Each change happens in three clean steps: the old
// markings fade, the orange shape becomes the next one's, then the new markings come in as it settles.
type Face = BallKind | 'plain';
const faces: Face[] = ['plain', ...ballOrder, 'plain'];
const changeSeconds = 0.36;

const FaceView = ({ face, x, y, r, rotate = 0, opacity = 1, detail = 1 }: { face: Face; x: number; y: number; r: number; rotate?: number; opacity?: number; detail?: number }) => (face === 'plain'
	? <circle cx={x} cy={y} r={r} fill={dotOrange} opacity={opacity} />
	: <SportBall kind={face} x={x} y={y} r={r} rotate={rotate} opacity={opacity} detail={detail} />);

const layoutFor = (ctx: ShotContext) => (ctx.format === 'portrait'
	? { markWidth: 900, markY: 720, taglineY: 1010, ctaY: 1130, finePrintY: 1800, liveSize: 150, ballRadius: 136 }
	: { markWidth: 860, markY: 330, taglineY: 610, ctaY: 720, finePrintY: 1010, liveSize: 132, ballRadius: 116 });

// The badge's proportions on the card: a 6px dot and a 4px gap beside 0.65rem of text.
const badgeDot = 0.58;
const badgeGap = 0.38;
const badgeTracking = 0.08;

const channels = (hex: string) => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));

const mixHex = (from: string, to: string, amount: number) => {
	const [a, b] = [channels(from), channels(to)];
	return `rgb(${a.map((value, index) => Math.round(lerp(value, b[index]!, amount))).join(',')})`;
};

const measureCanvas = new OffscreenCanvas(1, 1).getContext('2d')!;

const textWidth = (text: string, size: number) => {
	measureCanvas.font = `700 ${size}px "DM Sans"`;
	return measureCanvas.measureText(text).width + text.length * badgeTracking * size;
};

interface Badge {
	x: number;
	y: number;
	diameter: number;
	label: string;
}

// Kentucky's badge as it sat on the card before the card started to fall.
const badges = new Map<number, Badge>();

const fallOf = (ctx: ShotContext) => easeIn(lift(ctx, 0.4, 1.6));

const EndCard = ({ ctx }: { ctx: ShotContext }) => {
	const { t, width, height } = ctx;
	const layout = layoutFor(ctx);
	const scale = layout.markWidth / restBox.width;
	const markHeight = restBox.height * scale;
	const markLeft = (width - layout.markWidth) / 2;
	const period = { x: markLeft + dotRest.cx * scale, y: layout.markY + dotRest.cy * scale, r: dotRest.r * scale };
	const at = (beatsAfter: number) => afterLanding(ctx, beatsAfter);
	const fall = fallOf(ctx);
	const desk = deskLayouts[ctx.format];
	const badge = badges.get(ctx.shot.from);

	// The badge travels to centre stage, the word steps aside, and the dot becomes every ball.
	const size = layout.liveSize;
	const dotNatural = badgeDot * size;
	const label = badge?.label ?? 'LIVE';
	const groupWidth = dotNatural + badgeGap * size + textWidth(label, size);
	const travel = easeInOut(lift(ctx, 0.1, 1.1));
	const startScale = badge ? badge.diameter / dotNatural : 1;
	const badgeScale = lerp(startScale, 1, travel);
	const groupX = lerp(badge ? badge.x - (dotNatural / 2) * startScale : width / 2, (width - groupWidth) / 2, travel);
	const groupY = lerp(badge ? badge.y - (size / 2) * startScale : height / 2, (height - size) / 2, travel);
	const turnOrange = easeInOut(lift(ctx, 0, 0.4));
	// The word leaves first; only then does the dot take the middle of the frame.
	const stepAside = easeInOut(lift(ctx, 2.1, 2.4));
	const takeCentre = easeInOut(lift(ctx, 2.3, 2.8));
	const centre = { x: width / 2, y: height / 2 };
	const groupDot = { x: groupX + (dotNatural / 2) * badgeScale, y: groupY + (size / 2) * badgeScale };
	const schedule = scheduleOf(ctx);
	const changes = [...schedule.balls, schedule.plainAgain];
	const passed = changes.filter(change => t >= change).length;
	const change = passed > 0 ? progress(t - changes[passed - 1]!, 0, changeSeconds * schedule.pace) : 1;
	const markingsOut = easeInOut(progress(change, 0, 0.4));
	const shapeSwap = easeInOut(progress(change, 0.3, 0.6));
	const markingsIn = easeInOut(progress(change, 0.55, 1));
	const arrive = easeSignature(progress(change, 0.3, 1));
	const settle = easeInOut(progress(t, schedule.plainAgain, schedule.landsAt));
	const ballRadius = lerp(dotNatural / 2, layout.ballRadius, easeSignature(takeCentre));

	const arena = easeSignature(progress(t, at(-0.7), at(0.1)));
	const bar = easeInOut(progress(t, at(-0.3), at(0.5)));
	const head = spring(t - at(0.4), 0.35);
	const swap = easeSignature(progress(t, at(-0.1), at(0.7)));
	const dashes = easeInOut(progress(t, at(0.2), at(1)));
	const chevron = spring(t - at(0.9), 0.35);
	const tagline = easeSignature(progress(t, at(1), at(1.7)));
	const cta = easeSignature(progress(t, at(1.5), at(2.2)));
	const finePrint = easeSignature(progress(t, at(1.9), at(2.6)));
	const dashReveal = lerp(dashLastCapRest + dashStrokeRest, dashFirstCapRest - dashStrokeRest, dashes);

	const dotX = settle > 0 ? lerp(centre.x, period.x, settle) : lerp(groupDot.x, centre.x, takeCentre);
	const dotY = settle > 0 ? lerp(centre.y, period.y, settle) - Math.sin(Math.PI * settle) * 60 : lerp(groupDot.y, centre.y, takeCentre);
	const dotR = settle > 0 ? lerp(layout.ballRadius, period.r, settle) : ballRadius;

	return (
		<div className='end-card'>
			{fall < 1 && <Desk ctx={ctx} rect={desk.window} zoom={desk.windowZoom} style={{ opacity: 1 - fall, transform: `translateY(${(fall * 260) / desk.windowZoom}px)` }} />}
			{badge && takeCentre === 0 && (
				<div className='end-live' style={{ left: groupX, top: groupY, fontSize: size, transform: `scale(${badgeScale})` }}>
					<span className='end-live-dot' style={{ width: dotNatural, height: dotNatural, marginRight: badgeGap * size, background: mixHex('#ffffff', dotOrange, turnOrange) }} />
					<span className='end-live-word' style={{ opacity: 1 - stepAside, transform: `translateX(${stepAside * 0.3}em)` }}>{label}</span>
				</div>
			)}
			{badge && takeCentre > 0 && (
				<svg className='end-stage' width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
					{change >= 0.3 && <FaceView face={faces[passed]!} x={dotX} y={dotY} r={dotR * lerp(0.94, 1, arrive)} rotate={lerp(-12, 0, arrive)} detail={markingsIn} />}
					{shapeSwap < 1 && <FaceView face={faces[passed - 1]!} x={dotX} y={dotY} r={dotR} opacity={1 - shapeSwap} detail={1 - markingsOut} />}
				</svg>
			)}
			<svg
				className='end-mark'
				viewBox={`${restBox.x} ${restBox.y} ${restBox.width} ${restBox.height}`}
				style={{ left: markLeft, top: layout.markY, width: layout.markWidth, height: markHeight }}
			>
				<defs>
					<clipPath id='end-dashes'>
						<rect x={dashReveal} y={0} width={restBox.width} height={restBox.height} />
					</clipPath>
				</defs>
				<g style={{ opacity: arena, transform: `translateY(${(1 - arena) * 40}px)` }}>
					<path d={arenPath} fill='#ffffff' />
					<path d={aPath} fill='#ffffff' />
				</g>
				<line
					x1={barStart}
					x2={barJoint}
					y1={barCentreRest}
					y2={barCentreRest}
					stroke='#ffffff'
					strokeWidth={barStrokeRest}
					strokeLinecap='round'
					strokeDasharray={`${barLength} ${barLength}`}
					strokeDashoffset={barLength * (1 - bar)}
					opacity={bar > 0 ? 1 : 0}
				/>
				<path d={ringPath(headFrom, headTo, 0)} fill='#ffffff' style={{ transformOrigin: `${barJoint + 40}px ${barCentreRest}px`, transform: `scale(${head})` }} />
				<g style={{ opacity: swap, transform: `translateY(${(1 - swap) * 40}px)` }}>
					<path d={sPath} fill='#ffffff' />
					<path d={wapPath} fill='#ffffff' />
				</g>
				<line
					x1={dashFirstCapRest}
					x2={dashLastCapRest}
					y1={dashCentreRest}
					y2={dashCentreRest}
					stroke='#ffffff'
					strokeWidth={dashStrokeRest}
					strokeLinecap='round'
					strokeDasharray='56.9 63.1'
					clipPath='url(#end-dashes)'
				/>
				<path d={ringPath(chevronFrom, chevronTo, 0)} fill='#ffffff' style={{ transformOrigin: `${dashFirstCapRest - 40}px ${dashCentreRest}px`, transform: `scale(${chevron})` }} />
			</svg>
			<p className='end-tagline' style={{ top: layout.taglineY, opacity: tagline, transform: `translateY(${(1 - tagline) * 24}px)` }}>{ctx.copy('tagline')}</p>
			<p className='end-cta' style={{ top: layout.ctaY, opacity: cta }}>{ctx.copy('cta')}</p>
			<p className='end-fine-print' style={{ top: layout.finePrintY, opacity: finePrint }}>{ctx.copy('finePrint')}</p>
		</div>
	);
};

const endCard: ShotModule = {
	Component: EndCard,
	popups: ctx => {
		const fall = fallOf(ctx);
		const { popup } = deskLayouts[ctx.format];
		return fall < 1 ? [{ id: 'main', x: popup.x, y: popup.y + fall * 260, scale: popup.scale, opacity: 1 - fall }] : [];
	},
	// Measures the badge off Kentucky's card while the card is still in place; the end card draws it
	// from there.
	overlay: (ctx, measure) => {
		const dot = measure.inPopup('main', liveDotSelector);
		const label = ctx.host.runtimes.get('main')?.frame?.contentDocument?.querySelector(liveBadgeSelector)?.textContent?.trim();
		if (dot && fallOf(ctx) === 0) badges.set(ctx.shot.from, { x: dot.cx, y: dot.cy, diameter: dot.width, label: label || 'LIVE' });
		if (!badges.has(ctx.shot.from)) console.error('End card found no LIVE badge on Kentucky\'s card');
		return {};
	},
};

export default endCard;
