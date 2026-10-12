import { easeSignature, progress } from '../timing';
import { Desk, soloLayouts } from './desk';
import type { ShotContext, ShotModule } from './shotTypes';

// The five streams, one on screen; then somebody hammering Ctrl+Tab through them.
const BrowserShot = ({ ctx }: { ctx: ShotContext }) => {
	const { window: rect, windowZoom } = soloLayouts[ctx.format];
	const rise = easeSignature(progress(ctx.local, 0, 0.9));
	return <Desk ctx={ctx} rect={{ ...rect, y: rect.y + (1 - rise) * 140 }} zoom={windowZoom} style={{ opacity: rise }} />;
};

const browserShot: ShotModule = {
	Component: BrowserShot,
};

export default browserShot;
