import { useRef } from 'react';
import type { Game } from '@arenaswap/core/types';
import { readableInkOn, resolveTeamColorPair } from './colorUtils';
import {
	awayEndZoneX,
	buildHashPath,
	endZoneYards,
	homeEndZoneX,
	numberRowsY,
	resolveFieldFrame,
	resolveHashRows,
	stripHeight,
	stripYards,
	yardNumbers,
	type FieldFrame,
} from './footballField';
import { useT } from './i18nContext';

interface footballFieldStripProps {
	game: Game;
}

// Mown bands run the length of the field in ten-yard blocks, which is the width a triplex mower
// actually lays down. They stop at the goal lines because an end zone is painted, not mown.
const mownBands = [0, 1, 2, 3, 4].map(index => endZoneYards + index * 20);

const midfieldX = stripYards / 2;
const midlineY = stripHeight / 2;
// The industry-standard midfield stencil is 30ft square. The NFL's own cap is 1200 square feet,
// about 13 yards across, and 10 also happens to be what clears both rows of numbers.
const logoYards = 10;
const numberSize = 5;
const ballSize = 6.4;
const firstDownWidth = 0.8;
const scrimmageWidth = 0.7;
const sidelineInset = 0.55;

const footballFieldStrip = ({ game }: footballFieldStripProps) => {
	const t = useT();
	// Written during render rather than in an effect, so a dead ball never paints a frame with the
	// field missing before the hold takes effect. Safe to do because the resolver is idempotent:
	// feeding it its own output for the same game returns that output again.
	const heldFrame = useRef<FieldFrame | null>(null);
	const frame = resolveFieldFrame(game, heldFrame.current);
	heldFrame.current = frame;
	if (frame === null) return null;
	const { diagram } = frame;

	// The teams' real colours, unlifted. What keeps an end zone off the grass is the goal line
	// painted between them, which is how a field does it too.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171');
	const offenseColor = diagram.possession === 'home' ? homeColor : awayColor;
	const offenseTeam = diagram.possession === 'home' ? game.homeTeam : game.awayTeam;

	const hashRows = resolveHashRows(game.league);
	const driveStart = diagram.driveStartX;
	const driveLeft = driveStart === null ? 0 : Math.min(driveStart, diagram.ballX);
	const driveWidth = driveStart === null ? 0 : Math.abs(driveStart - diagram.ballX);

	return (
		<div className='ff-strip'>
			<svg
				className='ff-field'
				viewBox={`0 0 ${stripYards} ${stripHeight}`}
				role='img'
				aria-label={diagram.possession === null
					? t('field.noPossession')
					: t('field.possession', { team: offenseTeam.name })}
			>
				<rect className='ff-turf' x={0} y={0} width={stripYards} height={stripHeight} />
				{mownBands.map(x => (
					<rect key={x} className='ff-mow' x={x} y={0} width={10} height={stripHeight} />
				))}

				{driveStart !== null && (
					<rect className='ff-drive' x={driveLeft} y={0} width={driveWidth} height={stripHeight} fill={offenseColor} />
				)}

				{([[awayEndZoneX, game.awayTeam, awayColor], [homeEndZoneX, game.homeTeam, homeColor]] as const).map(
					([x, team, color], index) => (
						<g key={team.id}>
							<rect className='ff-endzone' x={x} y={0} width={endZoneYards} height={stripHeight} fill={color} />
							<text
								className='ff-endzone-label'
								x={x + endZoneYards / 2}
								y={midlineY}
								fill={readableInkOn(color)}
								transform={`rotate(${index === 0 ? -90 : 90} ${x + endZoneYards / 2} ${midlineY})`}
							>
								{team.abbreviation}
							</text>
						</g>
					),
				)}

				{yardNumbers.map(({ x, isMidfield }) => (
					<line key={x} className={`ff-yard-line${isMidfield ? ' is-midfield' : ''}`} x1={x} x2={x} y1={0} y2={stripHeight} />
				))}
				<path className='ff-hashes' d={buildHashPath(hashRows)} />

				{yardNumbers.map(({ x, label }) => numberRowsY.map(y => (
					<text key={`${x}-${y}`} className='ff-number' x={x} y={y} fontSize={numberSize}>{label}</text>
				)))}

				{game.homeTeam.logo && (
					<image
						className='ff-logo'
						href={game.homeTeam.logo}
						x={midfieldX - logoYards / 2}
						y={midlineY - logoYards / 2}
						width={logoYards}
						height={logoYards}
						preserveAspectRatio='xMidYMid meet'
					/>
				)}

				{[endZoneYards, homeEndZoneX].map(x => (
					<line key={x} className='ff-goal-line' x1={x} x2={x} y1={0} y2={stripHeight} />
				))}
				{[sidelineInset, stripHeight - sidelineInset].map(y => (
					<line key={y} className='ff-sideline' x1={0} x2={stripYards} y1={y} y2={y} />
				))}

				{diagram.firstDownX !== null && (
					<rect
						className='ff-first-down'
						x={diagram.firstDownX - firstDownWidth / 2}
						y={0}
						width={firstDownWidth}
						height={stripHeight}
					/>
				)}

				{/* `x` on a <text> is a coordinate list rather than a CSS geometry property, so the ball
				    cannot ease the way the yellow line does. The marker rides a translated group
				    instead, which takes the line of scrimmage along with it for free. */}
				<g className='ff-marker' style={{ transform: `translateX(${diagram.ballX}px)` }}>
					<rect className='ff-scrimmage' x={-scrimmageWidth / 2} y={0} width={scrimmageWidth} height={stripHeight} />
					<text className='ff-ball' x={0} y={midlineY} fontSize={ballSize}>🏈</text>
				</g>
			</svg>
		</div>
	);
};

export default footballFieldStrip;
