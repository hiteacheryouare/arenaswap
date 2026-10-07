import { allLeagueIds } from '../../../../packages/powerscore/src/constants';
import { resolveLeagueLogoUrl } from '../../../../packages/core/src/constants';
import { easeIn, easeSignature, progress, spring } from '../timing';
import type { PopupPlacement, ShotContext, ShotModule } from './shotTypes';

const Empty = () => null;

// A popup on its own, large, on the right in landscape (the super takes the left) and centred
// under the super in portrait. It slides a short way in as the cut lands.
const featured = (ctx: ShotContext, id: string): PopupPlacement => {
	const arrive = easeSignature(progress(ctx.local, 0, 0.45));
	if (ctx.format === 'portrait') {
		const scale = 2.3;
		return { id, x: (ctx.width - 320 * scale) / 2, y: 470 + (1 - arrive) * 50, scale, opacity: arrive };
	}
	const scale = 1.72;
	return { id, x: 1150 + (1 - arrive) * 60, y: (ctx.height - 560 * scale) / 2, scale, opacity: arrive };
};

const popupShot = (id: string): ShotModule => ({
	Component: Empty,
	popups: ctx => [featured(ctx, id)],
});

// The night ahead, still, so it can be read.
const guide: ShotModule = {
	Component: Empty,
	popups: ctx => {
		const arrive = easeSignature(progress(ctx.local, 0, 0.5));
		if (ctx.format === 'portrait') {
			return [{ id: 'guide', x: 40, y: 560, scale: 1.42, opacity: arrive, crop: { top: 0, right: 520, bottom: 0, left: 0 } }];
		}
		// Below the line of copy at the top of the frame.
		const scale = 1.2;
		return [{ id: 'guide', x: (ctx.width - 1280 * scale) / 2, y: 190, scale, opacity: arrive }];
	},
};

// Every league ArenaSwap follows, one square per mark (the college leagues share the NCAA's and the
// Olympic events share the rings), filling a grid in one bar with the dot taking the last square.
const markUrls = (ctx: ShotContext) => [...new Set(allLeagueIds.map(league => resolveLeagueLogoUrl(league, ctx.slate.raw.leagueLogos[league])))];
const leagueGrid = {
	landscape: { columns: 8, cell: 132, gap: 54 },
	portrait: { columns: 4, cell: 150, gap: 56 },
};

const leagueCell = (ctx: ShotContext, index: number) => {
	const grid = leagueGrid[ctx.format];
	const rows = Math.ceil((markUrls(ctx).length + 1) / grid.columns);
	const width = grid.columns * grid.cell + (grid.columns - 1) * grid.gap;
	const height = rows * grid.cell + (rows - 1) * grid.gap;
	return {
		x: (ctx.width - width) / 2 + (index % grid.columns) * (grid.cell + grid.gap),
		y: (ctx.height - height) / 2 + Math.floor(index / grid.columns) * (grid.cell + grid.gap),
		size: grid.cell,
	};
};

const popInSeconds = 0.95;

// The square the dot takes, where an orange card that follows the grid grows from.
export const leagueDotPoint = (ctx: ShotContext) => {
	const cell = leagueCell(ctx, markUrls(ctx).length);
	return { point: { x: cell.x + cell.size / 2, y: cell.y + cell.size / 2 }, radius: cell.size * 0.2 };
};

const Leagues = ({ ctx }: { ctx: ShotContext }) => {
	const length = ctx.shot.to - ctx.shot.from;
	const exit = easeIn(progress(ctx.local, length - 0.22, length));
	return (
		<div className='leagues' style={{ opacity: 1 - exit }}>
			{markUrls(ctx).map((url, index, urls) => {
				const cell = leagueCell(ctx, index);
				const pop = spring(ctx.local - (index / urls.length) * popInSeconds, 0.35);
				return (
					<img
						key={url}
						className='league-mark'
						src={url}
						alt=''
						style={{ left: cell.x, top: cell.y, width: cell.size, height: cell.size, opacity: Math.min(1, pop), transform: `scale(${0.6 + 0.4 * Math.min(1, pop)})` }}
					/>
				);
			})}
		</div>
	);
};

const leagues: ShotModule = {
	Component: Leagues,
	overlay: ctx => {
		const cell = leagueCell(ctx, markUrls(ctx).length);
		const length = ctx.shot.to - ctx.shot.from;
		const pop = spring(ctx.local - popInSeconds - 0.05, 0.35) * (1 - easeIn(progress(ctx.local, length - 0.22, length)));
		return { dot: { x: cell.x + cell.size / 2, y: cell.y + cell.size / 2, radius: cell.size * 0.2 * Math.min(1.1, pop), opacity: 1 } };
	},
};

export const detail = popupShot('detail');
export const settings = popupShot('settings');
export const pregame = popupShot('pregame');
export { guide, leagues };
