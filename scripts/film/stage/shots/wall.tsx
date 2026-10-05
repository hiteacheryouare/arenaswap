import type { CSSProperties } from 'react';
import OnColorCrest from '../../../../packages/ui/src/components/onColorCrest';
import { resolveTeamColorPair, matchupSurface } from '../../../../packages/ui/src/components/colorUtils';
import type { Team } from '../../../../packages/core/src/types';
import { dotOrange } from '../components/overlay';
import type { Format } from '../cuts/cutTypes';
import type { WallGame, WallTeam } from '../data/slateTypes';
import { bar, clamp, easeIn, easeInOut, easeSignature, lerp, progress, spring } from '../timing';
import type { ShotContext, ShotModule } from './shotTypes';

interface Grid {
	columns: number;
	tileWidth: number;
	tileHeight: number;
	gap: number;
}

const grids: Record<Format, Grid> = {
	landscape: { columns: 8, tileWidth: 204, tileHeight: 120, gap: 18 },
	portrait: { columns: 6, tileWidth: 160, tileHeight: 104, gap: 14 },
};

const toTeam = (team: WallTeam, id: string): Team => ({ id, name: team.abbreviation, abbreviation: team.abbreviation, score: team.score, logo: team.logo, color: team.color });

const cellOf = (index: number, count: number, format: Format, width: number, height: number) => {
	const grid = grids[format];
	const rows = Math.ceil(count / grid.columns);
	const gridWidth = grid.columns * grid.tileWidth + (grid.columns - 1) * grid.gap;
	const gridHeight = rows * grid.tileHeight + (rows - 1) * grid.gap;
	const column = index % grid.columns;
	const row = Math.floor(index / grid.columns);
	return {
		x: (width - gridWidth) / 2 + column * (grid.tileWidth + grid.gap) + grid.tileWidth / 2,
		y: (height - gridHeight) / 2 + row * (grid.tileHeight + grid.gap) + grid.tileHeight / 2,
	};
};

// Timed for a two-bar opening and squeezed proportionally into a shorter one.
const fullLength = bar(3) + 0.7;
const splitAt = 0.62;
const bloomAt = 1.25;
const fallAt = 3.05;

const pace = (ctx: ShotContext) => Math.min(1, (ctx.shot.to - ctx.shot.from) / fullLength);

const Tile = ({ game, index, count, ctx }: { game: WallGame; index: number; count: number; ctx: ShotContext }) => {
	const { format, width, height } = ctx;
	const local = ctx.local / pace(ctx);
	const grid = grids[format];
	const cell = cellOf(index, count, format, width, height);
	const distance = Math.hypot(cell.x - width / 2, cell.y - height / 2) / Math.hypot(width / 2, height / 2);
	const travel = easeSignature(progress(local, splitAt + distance * 0.28, splitAt + distance * 0.28 + 0.62));
	const bloom = spring(local - (bloomAt + distance * 0.22), 0.7);
	const fall = easeIn(progress(local, fallAt + (1 - distance) * 0.25, fallAt + (1 - distance) * 0.25 + 0.55));
	if (local < splitAt) return null;

	const x = lerp(width / 2, cell.x, travel);
	const y = lerp(height / 2, cell.y, travel) + fall * 40;
	const tileWidth = lerp(16, grid.tileWidth, clamp(bloom));
	const tileHeight = lerp(16, grid.tileHeight, clamp(bloom));
	const away = toTeam(game.away, `${game.id}-a`);
	const home = toTeam(game.home, `${game.id}-h`);
	const [awayColor, homeColor] = resolveTeamColorPair(away, home, '#30363d', '#30363d');
	const surface = matchupSurface(awayColor, homeColor);
	const detail = easeInOut(progress(bloom, 0.55, 1));

	const style: CSSProperties = {
		left: x - tileWidth / 2,
		top: y - tileHeight / 2,
		width: tileWidth,
		height: tileHeight,
		borderRadius: lerp(8, 16, clamp(bloom)),
		backgroundColor: dotOrange,
		opacity: 1 - fall,
		transform: `scale(${1 - fall * 0.35})`,
	};

	return (
		<div className='wall-tile' style={style}>
			<div className='wall-tile-surface' style={{ backgroundImage: surface.backgroundImage, opacity: easeInOut(progress(bloom, 0.15, 0.6)) }} />
			<div className='wall-tile-body' style={{ opacity: detail }}>
				<OnColorCrest team={away} surface={awayColor} className='wall-tile-crest' fallback='blank' loading='eager' />
				<span className='wall-tile-score' style={{ color: surface.inks.center }}>{game.away.score}<i>{game.home.score}</i></span>
				<OnColorCrest team={home} surface={homeColor} className='wall-tile-crest' fallback='blank' loading='eager' />
			</div>
		</div>
	);
};

const Wall = ({ ctx }: { ctx: ShotContext }) => {
	const games = ctx.slate.raw.wall;
	return (
		<div className='wall'>
			{games.map((game, index) => <Tile key={game.id} game={game} index={index} count={games.length} ctx={ctx} />)}
		</div>
	);
};

const wall: ShotModule = {
	Component: Wall,
	camera: ctx => ({ scale: 1 + 0.05 * easeInOut(progress(ctx.local / pace(ctx), 0.6, 4.4)), originX: ctx.width / 2, originY: ctx.height / 2 }),
	overlay: ctx => {
		const local = ctx.local / pace(ctx);
		const { width, height } = ctx;
		return {
			dot: {
				x: width / 2,
				y: height / 2,
				radius: 14 * clamp(spring(local - 0.12, 0.45), 0, 1.2) * (1 - progress(local, splitAt, splitAt + 0.1)),
				opacity: 1,
			},
		};
	},
};

export default wall;
