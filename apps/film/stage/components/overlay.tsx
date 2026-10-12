import type { OverlayState } from '../shots/shotTypes';

export const dotOrange = '#ff751f';

const Overlay = ({ state, width, height }: { state: OverlayState | null; width: number; height: number }) => (
	<svg className='stage-overlay' width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
		{state?.dot && state.dot.opacity > 0 && state.dot.radius > 0 && (
			<circle cx={state.dot.x} cy={state.dot.y} r={state.dot.radius} fill={state.dot.color ?? dotOrange} opacity={state.dot.opacity} />
		)}
	</svg>
);

export default Overlay;
