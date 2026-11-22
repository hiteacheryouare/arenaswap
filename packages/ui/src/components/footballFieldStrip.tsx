import { useRef, useState } from 'react';
import type { Game, GameConference, TeamMonoMarks } from '@arenaswap/core/types';
import { resolveConferenceCrest } from '@arenaswap/core/constants';
import { readableInkOn, resolveTeamColorPair } from '@arenaswap/chromatic';
import Crest from './crest';
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
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
}

const mownBands = [0, 1, 2, 3, 4].map(index => endZoneYards + index * 20);

const midfieldX = stripYards / 2;
const midlineY = stripHeight / 2;
const logoYards = 13;
const numberSize = 5;
const ballSize = 6.4;
const firstDownWidth = 0.8;
const scrimmageWidth = 0.7;
const driveBarHeight = 2.2;
const sidelineInset = 0.55;
const conferenceCrestSize = { width: 7, height: 7 };
const conferencePanelSize = { width: 8.5, height: 6 };
const conferenceYardLines = [endZoneYards + 25, homeEndZoneX - 25] as const;

const FieldConferenceCrest = ({ conference, x, y }: { conference: GameConference; x: number; y: number }) => {
	const crest = resolveConferenceCrest(conference.crestSlug, 'dark');
	const [failedSrcs, setFailedSrcs] = useState<string[]>([]);
	const src = [crest.src, crest.fallbackSrc].find(candidate => candidate && !failedSrcs.includes(candidate));
	if (!src) return null;
	const onPanel = !crest.drawnForDark || src !== crest.src;
	const { width, height } = onPanel ? conferencePanelSize : conferenceCrestSize;

	return (
		<foreignObject
			className='ff-conference'
			x={x - width / 2}
			y={y - height / 2}
			width={width}
			height={height}
		>
			<span className={`ff-conference-shell${onPanel ? ' is-panel' : ''}`}>
				<Crest
					key={src}
					logo={src}
					abbreviation=''
					className='ff-conference-art'
					fallback='none'
					onFailed={() => setFailedSrcs(failed => [...failed, src])}
				/>
			</span>
		</foreignObject>
	);
};

const footballFieldStrip = ({ game, monoMarks }: footballFieldStripProps) => {
	const t = useT();
	const heldFrame = useRef<FieldFrame | null>(null);
	const frame = resolveFieldFrame(game, heldFrame.current);
	heldFrame.current = frame;
	if (frame === null) return null;
	const { diagram } = frame;

	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171');
	const offenseColor = diagram.possession === 'home' ? homeColor : awayColor;
	const offenseTeam = diagram.possession === 'home' ? game.homeTeam : game.awayTeam;

	const endZones = [
		{ side: 'away', x: awayEndZoneX, team: game.awayTeam, color: awayColor, marks: monoMarks?.away },
		{ side: 'home', x: homeEndZoneX, team: game.homeTeam, color: homeColor, marks: monoMarks?.home },
	] as const;

	const hashRows = resolveHashRows(game.league);
	const conference = game.conference;
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
							teamColor={game.homeTeam.color}
						/>
					</foreignObject>
				)}

				{conference && conferenceYardLines.map((x, index) => (
					<FieldConferenceCrest key={x} conference={conference} x={x} y={hashRows[index]!} />
				))}

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

			{endZones.map(({ side, team, color, marks }) => (
				<div
					key={side}
					className={`ff-endzone-mark ff-endzone-${side}`}
					style={{ color: readableInkOn(color) }}
					aria-hidden='true'
				>
					{team.logo && (
						<TeamCrest
							logo={team.logo}
							monoMarks={marks ?? undefined}
							abbreviation={team.abbreviation}
							background={color}
							discClassName='ff-endzone-crest'
							crestClassName='ff-endzone-crest-art'
							fallback='blank'
							teamColor={color}
						/>
					)}
					<span className='ff-endzone-name'>{team.nickname || team.abbreviation}</span>
				</div>
			))}
		</div>
	);
};

export default footballFieldStrip;
