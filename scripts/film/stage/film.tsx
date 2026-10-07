import type { Cut, Format } from './cuts/cutTypes';
import { frameSizes } from './cuts/cutTypes';
import type { Slate } from './data/slate';
import type { PopupHostApi } from './popup/popupHost';
import shotModules from './shots';
import type { OverlayState, PopupPlacement, ShotContext } from './shots/shotTypes';
import PopupLayer from './components/popupLayer';
import Overlay from './components/overlay';
import Supers from './components/supers';

export interface FilmProps {
	t: number;
	cut: Cut;
	format: Format;
	slate: Slate;
	host: PopupHostApi;
	copy: (key: string) => string;
	overlay: OverlayState | null;
}

export const activeShots = (cut: Cut, t: number) => cut.shots.filter(shot => t >= shot.from && t < shot.to);

export const contextsAt = ({ t, cut, format, slate, host, copy }: Omit<FilmProps, 'overlay'>): ShotContext[] => {
	const { width, height } = frameSizes[format];
	return activeShots(cut, t).map(shot => ({ t, local: t - shot.from, shot, cut, format, width, height, slate, host, copy }));
};

const Film = (props: FilmProps) => {
	const { t, cut, format, host, copy, overlay } = props;
	const { width, height } = frameSizes[format];
	const contexts = contextsAt(props);
	const placements: PopupPlacement[] = contexts.flatMap(ctx => shotModules[ctx.shot.kind].popups?.(ctx) ?? []);

	return (
		<div className={`stage is-${format}`} style={{ width, height }}>
			<div className='stage-world'>
				{contexts.map(ctx => {
					const { Component } = shotModules[ctx.shot.kind];
					return <Component key={`${ctx.shot.kind}-${ctx.shot.from}`} ctx={ctx} />;
				})}
				<PopupLayer host={host} t={t} placements={placements} />
			</div>
			<Overlay state={overlay} width={width} height={height} />
			<Supers t={t} supers={cut.supers} format={format} copy={copy} />
		</div>
	);
};

export default Film;
