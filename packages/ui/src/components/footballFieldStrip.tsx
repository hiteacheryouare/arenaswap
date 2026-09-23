import { useRef } from 'react';
import type { Game, TeamMonoMarks } from '@arenaswap/core/types';
import { readableInkOn, resolveTeamColorPair } from './colorUtils';
import TeamCrest from './teamCrest';
import {
	awayEndZoneX,
	buildHashPath,
	endZoneYards,
	homeEndZoneX,
	mownColor,
	numberRowsY,
	resolveFieldFrame,
	resolveHashRows,
	stripHeight,
	stripYards,
	turfColor,
	yardNumbers,
	type FieldFrame,
} from './footballField';
import { useT } from './i18nContext';

interface footballFieldStripProps {
	game: Game;
	// ESPN's monochrome marks for the two teams, where the detail screen has already fetched them.
	// The end zone crests take the same three-way treatment the hero does, and without these the
	// worst case falls back to a tinted disc rather than to a white mark.
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
}

// Mown bands run the length of the field in ten-yard blocks, which is the width a triplex mower
// actually lays down. They stop at the goal lines because an end zone is painted, not mown.
const mownBands = [0, 1, 2, 3, 4].map(index => endZoneYards + index * 20);

const midfieldX = stripYards / 2;
const midlineY = stripHeight / 2;
// The industry-standard midfield stencil is 30ft square, and the NFL's own cap is 1200 square feet
// — about 13 yards across, which is what a real one looks like from above and also the largest
// that clears the painted numbers. Measured off the rendered strip, their ink runs to 8.30 and
// 22.84 across it; a 13-yard box centred on the midline reaches 9.55 and 22.45 even for the
// tallest crest in either league, Central Connecticut's, which fills 99% of its own box.
const logoYards = 13;
const numberSize = 5;
const ballSize = 6.4;
const firstDownWidth = 0.8;
const scrimmageWidth = 0.7;
// The bar runs along the ball's own line, so it reads as the ground that ball has covered rather
// than as a separate gauge. 2.2 keeps it inside the professional hash rows, which are the closest
// pair of markings it has to sit between.
const driveBarHeight = 2.2;
const sidelineInset = 0.55;

const footballFieldStrip = ({ game, monoMarks }: footballFieldStripProps) => {
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

	const endZones = [
		{ side: 'away', x: awayEndZoneX, team: game.awayTeam, color: awayColor, marks: monoMarks?.away },
		{ side: 'home', x: homeEndZoneX, team: game.homeTeam, color: homeColor, marks: monoMarks?.home },
	] as const;

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
				<rect className='ff-turf' x={0} y={0} width={stripYards} height={stripHeight} fill={turfColor} />
				{mownBands.map(x => (
					<rect key={x} className='ff-mow' x={x} y={0} width={10} height={stripHeight} fill={mownColor} />
				))}

				{endZones.map(({ side, x, color }) => (
					<rect key={side} className='ff-endzone' x={x} y={0} width={endZoneYards} height={stripHeight} fill={color} />
				))}

				{yardNumbers.map(({ x, isMidfield }) => (
					<line key={x} className={`ff-yard-line${isMidfield ? ' is-midfield' : ''}`} x1={x} x2={x} y1={0} y2={stripHeight} />
				))}
				<path className='ff-hashes' d={buildHashPath(hashRows)} />

				{yardNumbers.map(({ x, label }) => numberRowsY.map(y => (
					<text key={`${x}-${y}`} className='ff-number' x={x} y={y} fontSize={numberSize}>{label}</text>
				)))}

				{/* A `foreignObject` rather than the overlay the end zones use, because the crest has to
				    keep its place in the paint order: the ball, the line of scrimmage and the line to
				    gain all cross the 50 and all belong on top of it, the way they do on a broadcast.
				    The viewBox scales uniformly, so the 10-yard box inside is 10 CSS px and every
				    length in `.ff-logo-shell` can be a percentage of it.

				    The verdict is taken against the base turf. The band beside it is a shade lighter,
				    and of the two this is the one a dark crest reads worse on — which is the direction
				    to be wrong in, since erring here substitutes a mark that is legible either way. */}
				{game.homeTeam.logo && (
					<foreignObject
						className='ff-logo'
						x={midfieldX - logoYards / 2}
						y={midlineY - logoYards / 2}
						width={logoYards}
						height={logoYards}
					>
						<TeamCrest
							logo={game.homeTeam.logo}
							monoMarks={monoMarks?.home ?? undefined}
							abbreviation={game.homeTeam.abbreviation}
							background={turfColor}
							discClassName='ff-logo-shell'
							crestClassName='ff-logo-art'
							fallback='blank'
						/>
					</foreignObject>
				)}

				{[endZoneYards, homeEndZoneX].map(x => (
					<line key={x} className='ff-goal-line' x1={x} x2={x} y1={0} y2={stripHeight} />
				))}
				{[sidelineInset, stripHeight - sidelineInset].map(y => (
					<line key={y} className='ff-sideline' x1={0} x2={stripYards} y1={y} y2={y} />
				))}

				{driveStart !== null && (
					<rect
						className='ff-drive'
						x={driveLeft}
						y={midlineY - driveBarHeight / 2}
						width={driveWidth}
						height={driveBarHeight}
						rx={driveBarHeight / 2}
						fill={offenseColor}
					/>
				)}

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

			{/* The end zone marks are HTML over the SVG rather than more of it, because the crest is
			    the same three-treatment `TeamCrest` the hero draws and that is a DOM element that
			    measures its own pixels. Positioned in percentages of the strip, which is the same
			    120 yards the viewBox divides, so the two stay in register at any width.

			    Hidden from screen readers: both team names are already read out by the hero above
			    this strip, and a second copy of them is noise. */}
			{endZones.map(({ side, team, color, marks }) => (
				<div
					key={side}
					className={`ff-endzone-mark ff-endzone-${side}`}
					style={{ color: readableInkOn(color) }}
					aria-hidden='true'
				>
					{/* Nothing rather than a placeholder disc: at 13px an empty grey circle beside the
					    nickname reads as a fault, and the nickname alone is already the label. */}
					{team.logo && (
						<TeamCrest
							logo={team.logo}
							monoMarks={marks ?? undefined}
							abbreviation={team.abbreviation}
							background={color}
							discClassName='ff-endzone-crest'
							crestClassName='ff-endzone-crest-art'
							fallback='blank'
						/>
					)}
					<span className='ff-endzone-name'>{team.nickname || team.abbreviation}</span>
				</div>
			))}
		</div>
	);
};

export default footballFieldStrip;
