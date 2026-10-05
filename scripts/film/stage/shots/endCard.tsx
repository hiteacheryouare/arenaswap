import { aPath, arenPath, chevronFrom, chevronTo, headFrom, headTo, sPath, wapPath } from '../../../../packages/ui/src/components/wordmarkShapes';
import { ringPath } from '../../../../packages/ui/src/components/wordmarkPose';
import { barCentreRest, barJoint, barRest, barStrokeRest, dashCentreRest, dashFirstCapRest, dashLastCapRest, dashStrokeRest, restBox } from '../../../../packages/ui/src/components/wordmarkFrame';
import { splitEnding } from '../components/supers';
import { beats, easeIn, easeInOut, easeSignature, lerp, progress, spring } from '../timing';
import { deskLayouts } from './desk';
import type { ShotContext, ShotModule } from './shotTypes';

// The dot's rest position in the wordmark's own units.
const dotRest = { cx: 1761.1208, cy: 368.38882, r: 27.6 };
const barStart = barRest + barStrokeRest / 2;
const barLength = barJoint - barStart;

// Everything is timed back from the end of the cut, so the last eight beats are the same frames in
// the 15, the 30 and the 60. Longer cuts get the dot's flight in from the scene before as a pre-roll.
const fromEnd = (ctx: ShotContext, beatsBeforeEnd: number) => ctx.shot.to - beats(beatsBeforeEnd);

const layoutFor = (ctx: ShotContext) => (ctx.format === 'portrait'
	? { markWidth: 900, markY: 700, taglineY: 1040, ctaY: 1150, finePrintY: 1800 }
	: { markWidth: 860, markY: 300, taglineY: 660, ctaY: 760, finePrintY: 1010 });

const EndCard = ({ ctx }: { ctx: ShotContext }) => {
	const { t } = ctx;
	const layout = layoutFor(ctx);
	const scale = layout.markWidth / restBox.width;
	const markHeight = restBox.height * scale;
	const at = (beatsBeforeEnd: number) => fromEnd(ctx, beatsBeforeEnd);

	const arena = easeSignature(progress(t, at(8), at(7)));
	const bar = easeInOut(progress(t, at(7.4), at(6.4)));
	const head = spring(t - at(6.5), 0.35);
	const swap = easeSignature(progress(t, at(7), at(6)));
	const dashes = easeInOut(progress(t, at(6.6), at(5.6)));
	const chevron = spring(t - at(5.7), 0.35);
	const [taglineBody, taglineStop] = splitEnding(ctx.copy('tagline'));
	const tagline = easeSignature(progress(t, at(4), at(3)));
	const cta = easeSignature(progress(t, at(3.2), at(2.2)));
	const finePrint = easeSignature(progress(t, at(2.6), at(1.6)));
	const dashReveal = lerp(dashLastCapRest + dashStrokeRest, dashFirstCapRest - dashStrokeRest, dashes);

	return (
		<div className='end-card'>
			<svg
				className='end-mark'
				viewBox={`${restBox.x} ${restBox.y} ${restBox.width} ${restBox.height}`}
				style={{ left: (ctx.width - layout.markWidth) / 2, top: layout.markY, width: layout.markWidth, height: markHeight }}
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
				<ellipse data-end-dot cx={dotRest.cx} cy={dotRest.cy} rx={dotRest.r} ry={dotRest.r} fill='none' />
			</svg>
			<p className='end-tagline' style={{ top: layout.taglineY, opacity: tagline, transform: `translateY(${(1 - tagline) * 24}px)` }}>
				{taglineBody}<span className='super-stop'>{taglineStop}</span>
			</p>
			<p className='end-cta' style={{ top: layout.ctaY, opacity: cta }}>{ctx.copy('cta')}</p>
			<p className='end-fine-print' style={{ top: layout.finePrintY, opacity: finePrint }}>{ctx.copy('finePrint')}</p>
		</div>
	);
};

const endCard: ShotModule = {
	Component: EndCard,
	// The scene before hands its popup over still in place for the dot to leave from.
	popups: ctx => {
		const plan = ctx.cut.popups.find(candidate => candidate.id === 'main');
		if (!plan) return [];
		const fade = 1 - easeIn(progress(ctx.local, 0, 0.5));
		const { popup } = deskLayouts[ctx.format];
		return fade > 0 ? [{ id: 'main', x: popup.x, y: popup.y, scale: popup.scale, opacity: fade }] : [];
	},
	overlay: (ctx, measure) => {
		const landing = measure.inStage('[data-end-dot]');
		if (!landing) return {};
		const centre = { x: ctx.width / 2, y: ctx.height / 2 };
		const radius = landing.width / 2;
		const card = measure.inPopup('main', '[data-glide-key="401856709"] .game-card');
		const start = card ? { x: card.cx, y: card.cy } : centre;
		const fly = easeInOut(progress(ctx.t, ctx.shot.from, fromEnd(ctx, 8)));
		const settle = easeSignature(progress(ctx.t, fromEnd(ctx, 6), fromEnd(ctx, 5)));
		const arrive = ctx.shot.to - ctx.shot.from > beats(8.5) ? 1 : spring(ctx.t - fromEnd(ctx, 8), 0.4);
		const flight = ctx.t < fromEnd(ctx, 8) ? { x: lerp(start.x, centre.x, fly), y: lerp(start.y, centre.y, fly) - Math.sin(Math.PI * fly) * 120 } : centre;
		const hop = Math.sin(Math.PI * settle) * 90;
		return {
			dot: {
				x: lerp(flight.x, landing.cx, settle),
				y: lerp(flight.y, landing.cy, settle) - hop,
				radius: lerp(10, radius, settle) * arrive,
				opacity: 1,
			},
		};
	},
};

export default endCard;
