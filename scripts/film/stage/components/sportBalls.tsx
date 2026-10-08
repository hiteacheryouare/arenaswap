import type { ReactNode } from 'react';
import { dotOrange } from './overlay';

export type BallKind = 'baseball' | 'soccer' | 'hockey' | 'football' | 'basketball';

export const ballOrder: BallKind[] = ['baseball', 'soccer', 'hockey', 'football', 'basketball'];

// Drawn the way Bootstrap Icons draws its filled icons: a 16-unit grid, one flat colour, and the
// details cut out of it in lines one unit wide. The cut-outs are the stage's black showing through.
const cutOut = '#000';

type Point = [number, number];

const point = (radius: number, degrees: number, centre: Point = [8, 8]): Point => {
	const radians = (degrees * Math.PI) / 180;
	return [centre[0] + Math.cos(radians) * radius, centre[1] + Math.sin(radians) * radius];
};

const pentagon = (centre: Point, radius: number, rotate: number) => Array.from({ length: 5 }, (_, index) => point(radius, rotate + index * 72, centre).join(',')).join(' ');

// `detail` fades the cut-outs on their own, so one sport's markings can leave before the next one's arrive.
interface Drawn {
	detail: number;
}

const Cuts = ({ d, detail, width = 1 }: { d: string; detail: number; width?: number }) => (
	<path d={d} fill='none' stroke={cutOut} strokeWidth={width} strokeLinecap='round' strokeLinejoin='round' opacity={detail} />
);

const disc = <circle cx={8} cy={8} r={8} fill={dotOrange} />;

// A point on a cubic curve and the curve's unit normal there, so the stitches sit across their seam.
const along = (curve: Point[], t: number) => {
	const [p0, p1, p2, p3] = curve as [Point, Point, Point, Point];
	const m = 1 - t;
	const at = (axis: 0 | 1) => m ** 3 * p0[axis] + 3 * m ** 2 * t * p1[axis] + 3 * m * t ** 2 * p2[axis] + t ** 3 * p3[axis];
	const slope = (axis: 0 | 1) => 3 * m ** 2 * (p1[axis] - p0[axis]) + 6 * m * t * (p2[axis] - p1[axis]) + 3 * t ** 2 * (p3[axis] - p2[axis]);
	const length = Math.hypot(slope(0), slope(1));
	return { x: at(0), y: at(1), nx: -slope(1) / length, ny: slope(0) / length };
};

const seam = (side: 1 | -1) => {
	const curve: Point[] = [[8 - side * 4.6, 1.45], [8 - side * 1.9, 4.6], [8 - side * 1.9, 11.4], [8 - side * 4.6, 14.55]];
	const stitches = [0.2, 0.35, 0.5, 0.65, 0.8].map(t => {
		const { x, y, nx, ny } = along(curve, t);
		return `M${x + nx * 1.1 * side} ${y + ny * 1.1 * side - 0.35}L${x} ${y + 0.25}L${x - nx * 1.1 * side} ${y - ny * 1.1 * side - 0.35}`;
	});
	return { line: `M${curve[0]}C${curve.slice(1).join(' ')}`, stitches: stitches.join('') };
};

const Baseball = ({ detail }: Drawn) => {
	const [left, right] = [seam(1), seam(-1)];
	return (
		<>
			{disc}
			<Cuts d={left.line + right.line} detail={detail} />
			<Cuts d={left.stitches + right.stitches} detail={detail} width={0.8} />
		</>
	);
};

// A pentagon in the middle, five more cut off by the edge, and the seams between them.
const soccerAngles = Array.from({ length: 5 }, (_, index) => -90 + index * 72);

const Soccer = ({ detail }: Drawn) => (
	<>
		<clipPath id='ball-soccer'><circle cx={8} cy={8} r={8} /></clipPath>
		{disc}
		<g opacity={detail}>
			<polygon points={pentagon([8, 8], 2.9, -90)} fill={cutOut} />
			<g clipPath='url(#ball-soccer)'>
				{soccerAngles.map(angle => <polygon key={angle} points={pentagon(point(8.9, angle), 2.7, angle + 180)} fill={cutOut} />)}
			</g>
		</g>
		<Cuts d={soccerAngles.map(angle => `M${point(2.75, angle)}L${point(6.4, angle)}`).join('')} detail={detail} />
	</>
);

// Three-quarters on: the top face, and the edge that turns away under it.
const Hockey = ({ detail }: Drawn) => (
	<>
		<path d='M0.5 5.5A7.5 3 0 0 1 15.5 5.5V10.5A7.5 3 0 0 1 0.5 10.5Z' fill={dotOrange} />
		<Cuts d='M0.9 6.2A7.2 2.6 0 0 0 15.1 6.2' detail={detail} />
	</>
);

const Football = ({ detail }: Drawn) => (
	<g transform='rotate(-40 8 8)'>
		<path d='M0.4 8C3.4 2.9 12.6 2.9 15.6 8C12.6 13.1 3.4 13.1 0.4 8Z' fill={dotOrange} />
		<Cuts d={`M5.4 8H10.6${[6.2, 7.4, 8.6, 9.8].map(x => `M${x} 6.9V9.1`).join('')}M3.3 5.9Q3.9 8 3.3 10.1M12.7 5.9Q12.1 8 12.7 10.1`} detail={detail} />
	</g>
);

const Basketball = ({ detail }: Drawn) => (
	<>
		{disc}
		<Cuts d='M8 0.5V15.5M0.5 8H15.5M2.7 2.3C5.9 5.4 5.9 10.6 2.7 13.7M13.3 2.3C10.1 5.4 10.1 10.6 13.3 13.7' detail={detail} />
	</>
);

const drawings: Record<BallKind, (props: Drawn) => ReactNode> = { baseball: Baseball, soccer: Soccer, hockey: Hockey, football: Football, basketball: Basketball };

// Centred on (x, y) with radius r, which the 16-unit grid's circle fills.
const SportBall = ({ kind, x, y, r, rotate = 0, opacity = 1, detail = 1 }: { kind: BallKind; x: number; y: number; r: number; rotate?: number; opacity?: number; detail?: number }) => {
	const Drawing = drawings[kind];
	return (
		<g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${r / 8}) translate(-8 -8)`} opacity={opacity}>
			<Drawing detail={detail} />
		</g>
	);
};

export default SportBall;
