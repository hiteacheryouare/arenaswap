import type { ArrowState, OverlayState } from '../shots/shotTypes';

export const dotOrange = '#ff751f';

// The wordmark's own proportions: a 30-unit shaft, dashes of 56.9 with gaps of 63.1 on a 31.8-unit
// stroke, and heads a little over three strokes long.
const dashRatio = 56.9 / 31.8;
const gapRatio = 63.1 / 31.8;

const Arrow = ({ arrow }: { arrow: ArrowState }) => {
	const dx = arrow.to.x - arrow.from.x;
	const dy = arrow.to.y - arrow.from.y;
	const length = Math.hypot(dx, dy);
	if (length < 1 || arrow.drawn <= 0 || arrow.opacity <= 0) return null;
	const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
	const shown = length * Math.min(1, arrow.drawn);
	const weight = arrow.weight;
	const head = weight * 3.2;
	const dashed = arrow.kind === 'dashed';

	return (
		<g transform={`translate(${arrow.from.x} ${arrow.from.y}) rotate(${angle})`} opacity={arrow.opacity}>
			<line
				x1={0}
				y1={0}
				x2={Math.max(0, shown - (dashed ? weight * 0.6 : head * 0.55))}
				y2={0}
				stroke='#ffffff'
				strokeWidth={weight}
				strokeLinecap='round'
				strokeDasharray={dashed ? `${weight * dashRatio} ${weight * gapRatio}` : undefined}
			/>
			{dashed ? (
				<path
					d={`M ${shown - head * 0.9} ${-head * 0.72} L ${shown} 0 L ${shown - head * 0.9} ${head * 0.72}`}
					fill='none'
					stroke='#ffffff'
					strokeWidth={weight}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			) : (
				<path
					d={`M ${shown} 0 L ${shown - head} ${-head * 0.62} L ${shown - head} ${head * 0.62} Z`}
					fill='#ffffff'
					stroke='#ffffff'
					strokeWidth={weight * 0.55}
					strokeLinejoin='round'
				/>
			)}
		</g>
	);
};

const Overlay = ({ state, width, height }: { state: OverlayState | null; width: number; height: number }) => (
	<svg className='stage-overlay' width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
		{state?.arrows?.map((arrow, index) => <Arrow key={index} arrow={arrow} />)}
		{state?.dot && state.dot.opacity > 0 && state.dot.radius > 0 && (
			<circle cx={state.dot.x} cy={state.dot.y} r={state.dot.radius} fill={dotOrange} opacity={state.dot.opacity} />
		)}
	</svg>
);

export default Overlay;
