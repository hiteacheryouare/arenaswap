import type { CSSProperties } from 'react';
import { scoreMaxTotal } from '@arenaswap/core/constants';

// The number beside it is what's read aloud, so the bar is decoration. Its gradient spans the whole
// scale, slate at nothing to orange at the top, so the tip is the colour of the score it stops at.
const HeatBar = ({ value }: { value: number }) => (
	<span className='as-heat' style={{ '--heat': Math.max(0, Math.min(value / scoreMaxTotal, 1)) } as CSSProperties} aria-hidden='true'>
		<span className='as-heat-fill' />
	</span>
);

export default HeatBar;
