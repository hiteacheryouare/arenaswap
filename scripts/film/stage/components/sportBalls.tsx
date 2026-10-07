import type { ReactNode } from 'react';
import { dotOrange } from './overlay';

export type BallKind = 'baseball' | 'soccer' | 'hockey' | 'football' | 'basketball';

export const ballOrder: BallKind[] = ['baseball', 'soccer', 'hockey', 'football', 'basketball'];

// Every ball is drawn on a unit circle in the dot's own orange, so the dot it grows out of and the
// ball it becomes are the same object. One dark ink for seams, one deeper orange for the side away
// from the light.
const ink = '#170900';
const shade = '#d9590c';
const stitch = '#a3240f';
const lace = '#fff4ea';
const seam = 0.05;

const point = (radius: number, degrees: number) => {
	const radians = (degrees * Math.PI) / 180;
	return { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius };
};

const polygon = (centre: { x: number; y: number }, radius: number, rotate: number) => Array.from({ length: 5 }, (_, index) => {
	const vertex = point(radius, rotate + index * 72);
	return `${centre.x + vertex.x},${centre.y + vertex.y}`;
}).join(' ');

// Each ball is a body (its orange shape and shading) and its details (seams, laces, ridges), which
// `detail` fades on their own so one sport's markings can leave before the next one's arrive.
interface Drawn {
	detail: number;
}

// A sphere's shading: the ball, then a crescent of the deeper orange along its lower right.
const Sphere = ({ id, detail, children }: Drawn & { id: string; children?: ReactNode }) => (
	<>
		<clipPath id={id}><circle r={1} /></clipPath>
		<g clipPath={`url(#${id})`}>
			<circle r={1} fill={shade} />
			<circle cx={-0.1} cy={-0.1} r={1.02} fill={dotOrange} />
			<g opacity={detail}>{children}</g>
		</g>
		<circle r={1} fill='none' stroke={ink} strokeWidth={0.035} />
	</>
);

// Points along a quadratic curve, with the curve's normal, for stitches that sit on their seam.
const along = (from: number[], control: number[], to: number[], t: number) => {
	const [x0, y0] = from as [number, number];
	const [cx, cy] = control as [number, number];
	const [x1, y1] = to as [number, number];
	const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
	const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
	const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
	const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
	const length = Math.hypot(dx, dy);
	return { x, y, tx: dx / length, ty: dy / length, nx: -dy / length, ny: dx / length };
};

const BaseballSeam = ({ side }: { side: 1 | -1 }) => {
	const from = [side * 0.5, -0.86];
	const control = [side * -0.02, 0];
	const to = [side * 0.5, 0.86];
	return (
		<>
			<path d={`M ${from.join(' ')} Q ${control.join(' ')} ${to.join(' ')}`} fill='none' stroke={ink} strokeWidth={0.03} />
			<g fill='none' stroke={stitch} strokeWidth={0.045} strokeLinecap='round' strokeLinejoin='round'>
				{Array.from({ length: 11 }, (_, index) => {
					const at = along(from, control, to, 0.07 + index * 0.086);
					const tip = { x: at.x + at.tx * 0.045, y: at.y + at.ty * 0.045 };
					return (
						<path
							key={index}
							d={`M ${at.x + at.nx * 0.085} ${at.y + at.ny * 0.085} L ${tip.x} ${tip.y} L ${at.x - at.nx * 0.085} ${at.y - at.ny * 0.085}`}
						/>
					);
				})}
			</g>
		</>
	);
};

const Baseball = ({ detail }: Drawn) => (
	<Sphere id='ball-baseball' detail={detail}>
		<BaseballSeam side={-1} />
		<BaseballSeam side={1} />
	</Sphere>
);

// The classic panel pattern seen straight on: a black pentagon in the middle, five more around the
// rim, and the seams of the white hexagons between them.
const Soccer = ({ detail }: Drawn) => {
	const centre = { x: 0, y: 0 };
	const inner = 0.3;
	const rim = Array.from({ length: 5 }, (_, index) => ({ angle: -90 + 36 + index * 72, at: point(0.88, -90 + 36 + index * 72) }));
	return (
		<Sphere id='ball-soccer' detail={detail}>
			<polygon points={polygon(centre, inner, -90)} fill={ink} />
			<g stroke={ink} strokeWidth={seam} strokeLinecap='round' fill='none'>
				{Array.from({ length: 5 }, (_, index) => {
					const vertex = point(inner, -90 + index * 72);
					const knee = point(0.56, -90 + index * 72);
					const left = point(0.68, -90 + index * 72 - 26);
					const right = point(0.68, -90 + index * 72 + 26);
					return (
						<g key={index}>
							<line x1={vertex.x} y1={vertex.y} x2={knee.x} y2={knee.y} />
							<line x1={knee.x} y1={knee.y} x2={left.x} y2={left.y} />
							<line x1={knee.x} y1={knee.y} x2={right.x} y2={right.y} />
						</g>
					);
				})}
			</g>
			{rim.map(({ angle, at }) => <polygon key={angle} points={polygon(at, 0.3, angle + 180)} fill={ink} />)}
		</Sphere>
	);
};

// Three-quarters on, so it reads as a puck: a face, a ridged edge, and the edge in shadow.
const puckTop = -0.18;
const puckDepth = 0.4;
const puckRx = 0.98;
const puckRy = 0.4;

const Hockey = ({ detail }: Drawn) => {
	const ridges = Array.from({ length: 17 }, (_, index) => -0.88 + index * 0.11);
	const lower = (x: number) => puckRy * Math.sqrt(Math.max(0, 1 - (x / puckRx) ** 2));
	return (
		<g strokeLinejoin='round'>
			<path
				d={`M ${-puckRx} ${puckTop} L ${-puckRx} ${puckTop + puckDepth} A ${puckRx} ${puckRy} 0 0 0 ${puckRx} ${puckTop + puckDepth} L ${puckRx} ${puckTop} Z`}
				fill={shade}
				stroke={ink}
				strokeWidth={0.035}
			/>
			<g stroke={ink} strokeWidth={0.025} opacity={0.45 * detail}>
				{ridges.map(x => <line key={x} x1={x} y1={puckTop + lower(x) + 0.06} x2={x} y2={puckTop + puckDepth + lower(x) - 0.06} />)}
			</g>
			<ellipse cy={puckTop} rx={puckRx} ry={puckRy} fill={dotOrange} stroke={ink} strokeWidth={0.035} />
			<ellipse cy={puckTop} rx={puckRx * 0.62} ry={puckRy * 0.62} fill='none' stroke={shade} strokeWidth={0.04} opacity={detail} />
		</g>
	);
};

const footballOutline = 'M -1.18 0 C -0.86 -0.64 0.86 -0.64 1.18 0 C 0.86 0.64 -0.86 0.64 -1.18 0 Z';

const Football = ({ detail }: Drawn) => (
	<g transform='rotate(-32) scale(1.12)'>
		<clipPath id='ball-football'><path d={footballOutline} /></clipPath>
		<g clipPath='url(#ball-football)'>
			<path d={footballOutline} fill={shade} />
			<path d={footballOutline} transform='translate(-0.06 -0.07)' fill={dotOrange} />
			<g fill='none' stroke={lace} strokeWidth={0.075} opacity={detail}>
				<path d='M -0.74 -0.42 Q -0.66 0 -0.74 0.42' />
				<path d='M 0.74 -0.42 Q 0.66 0 0.74 0.42' />
			</g>
			<path d='M -1.1 0.02 Q 0 0.1 1.1 0.02' fill='none' stroke={ink} strokeWidth={0.025} opacity={0.5 * detail} />
		</g>
		<path d={footballOutline} fill='none' stroke={ink} strokeWidth={0.035} />
		<g stroke={lace} strokeLinecap='round' opacity={detail}>
			<line x1={-0.36} y1={-0.18} x2={0.36} y2={-0.18} strokeWidth={0.07} />
			{[-0.27, -0.16, -0.05, 0.06, 0.17, 0.28].map(x => <line key={x} x1={x - 0.01} y1={-0.29} x2={x + 0.01} y2={-0.07} strokeWidth={0.055} />)}
		</g>
	</g>
);

const Basketball = ({ detail }: Drawn) => (
	<Sphere id='ball-basketball' detail={detail}>
		<g fill='none' stroke={ink} strokeWidth={seam} strokeLinecap='round'>
			<path d='M 0 -1 Q 0.14 0 0 1' />
			<path d='M -1 0.02 Q 0 0.16 1 0.02' />
			<path d='M -0.66 -0.75 Q -0.1 0.02 -0.66 0.75' />
			<path d='M 0.66 -0.75 Q 0.1 0.02 0.66 0.75' />
		</g>
	</Sphere>
);

const drawings: Record<BallKind, (props: Drawn) => ReactNode> = { baseball: Baseball, soccer: Soccer, hockey: Hockey, football: Football, basketball: Basketball };

const SportBall = ({ kind, x, y, r, rotate = 0, opacity = 1, detail = 1 }: { kind: BallKind; x: number; y: number; r: number; rotate?: number; opacity?: number; detail?: number }) => {
	const Drawing = drawings[kind];
	return (
		<g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${r})`} opacity={opacity}>
			<Drawing detail={detail} />
		</g>
	);
};

export default SportBall;
