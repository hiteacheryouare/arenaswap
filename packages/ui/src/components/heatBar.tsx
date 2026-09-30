import type { CSSProperties } from 'react';
import { scoreMaxTotal } from '@arenaswap/core/constants';

// v2's PowerScore colour: one solid colour for the whole fill, slate at nothing to orange at the top.
export const powerScoreColor = (score: number, max = scoreMaxTotal): string => {
	const ratio = Math.max(0, Math.min(score / max, 1));
	const channel = (from: number, to: number) => Math.round(from + (to - from) * ratio);
	return `rgb(${channel(139, 247)}, ${channel(148, 92)}, ${channel(158, 3)})`;
};

// The figure beside it is what gets read aloud, so the bar itself stays out of the accessibility tree.
const HeatBar = ({ value }: { value: number }) => (
	<div className='progress as-heat' aria-hidden='true' style={{ '--heat-color': powerScoreColor(value) } as CSSProperties}>
		<div className='progress-bar' style={{ width: `${Math.max(0, Math.min(value / scoreMaxTotal, 1)) * 100}%` }} />
	</div>
);

export default HeatBar;
