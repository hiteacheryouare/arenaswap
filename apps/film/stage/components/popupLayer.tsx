import type { CSSProperties } from 'react';
import type { PopupHostApi } from '../popup/popupHost';
import type { PopupPlacement } from '../shots/shotTypes';

// Every popup the cut uses, mounted from its load time to the end of the film. An iframe that left
// the DOM between shots would reload, so shots only ever move them, scale them and fade them.
const PopupLayer = ({ host, t, placements }: { host: PopupHostApi; t: number; placements: PopupPlacement[] }) => (
	<div className='popup-layer'>
		{[...host.runtimes.values()].filter(runtime => t >= runtime.plan.loadAt).map(runtime => {
			const { plan } = runtime;
			const placement = placements.find(candidate => candidate.id === plan.id);
			const width = plan.width ?? 320;
			const height = plan.height ?? 560;
			const visible = placement !== undefined && placement.opacity > 0;
			const crop = placement?.crop ?? { top: 0, right: 0, bottom: 0, left: 0 };
			const style: CSSProperties = {
				width,
				height,
				transform: placement
					? `translate(${placement.x - crop.left * placement.scale}px, ${placement.y - crop.top * placement.scale}px) scale(${placement.scale})${placement.rotate ? ` rotate(${placement.rotate}deg)` : ''}`
					: 'translate(0px, 0px)',
				opacity: visible ? placement.opacity : 0,
				clipPath: `inset(${crop.top}px ${crop.right}px ${crop.bottom}px ${crop.left}px round ${placement?.chrome === false ? 0 : 12}px)`,
			};
			return (
				<div key={plan.id} className={`popup-slot${placement?.chrome === false ? '' : ' has-chrome'}`} style={style}>
					{/* oxlint-disable-next-line react/iframe-missing-sandbox -- the stage scripts these pages by design */}
					<iframe
						data-popup-id={plan.id}
						src={plan.page === 'guide' ? '/guide.html' : '/popup.html'}
						width={width}
						height={height}
						title={plan.id}
						ref={element => {
							runtime.frame = element;
							runtime.loaded = element !== null;
						}}
					/>
				</div>
			);
		})}
	</div>
);

export default PopupLayer;
