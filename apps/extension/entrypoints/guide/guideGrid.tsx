import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueLogoMap, ResolvedTheme, Team, TeamMonoLogoMap, TeamMonoMarks } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import { resolveBoardClock, trailingSide } from '@arenaswap/ui/src/components/boardClock';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import InningHalfIcon from '@arenaswap/ui/src/components/inningHalfIcon';
import { leagueLabels } from '@arenaswap/ui/src/components/popupChrome';
import { useRef, type CSSProperties } from 'react';
import { formatGuideTime, formatHourMark } from './guideFormat';
import type { guideBand, guideBar } from './guideHeat';
import { axisBounds, blockHeights, fillAxis, groupByLeague, gutterPx, hourMarks, laneHeight, msToPx, resolveHeat, type blockHeat, type guideSlot } from './guideLayout';
import useEdgeClipping from './useEdgeClipping';

// The block is --as-surface, which is what a crest drawn on it has to stand off. Spelled out because
// the legibility check does its arithmetic on a hex, not on a variable.
const blockSurface: Record<ResolvedTheme, string> = { dark: '#1a1d22', light: '#ffffff' };

const noPowers: ReadonlyMap<string, number> = new Map();
const noneWatched: ReadonlyMap<string, string> = new Map();

const bandBox = (band: guideBand, fromMs: number): CSSProperties => {
	const left = Math.round(msToPx(band.fromMs, fromMs));
	return { left: `${left}px`, width: `${Math.max(Math.round(msToPx(band.toMs, fromMs)) - left, 8)}px` };
};

interface blockTeamProps {
	team: Team;
	color: string;
	mono?: TeamMonoMarks;
	scored: boolean;
	behind: boolean;
	theme: ResolvedTheme;
}

const BlockTeam = ({ team, color, mono, scored, behind, theme }: blockTeamProps) => (
	<span className={`guide-bar-side${behind ? ' is-behind' : ''}`}>
		<BoardCrest team={team} size={18} surface={blockSurface[theme]} color={color} monoMarks={mono} />
		<b className='guide-bar-team'>{team.abbreviation}</b>
		{scored && <span className='guide-bar-score num'>{team.score}</span>}
	</span>
);

// The clock slot the popup's rows carry: period and clock while a game is on, the result once it is
// over, and before it the network it is on.
const BlockStatus = ({ game }: { game: Game }) => {
	if (game.status === 'pre') {
		const network = game.broadcasts?.[0];
		return network ? <span className='guide-bar-network'>{network}</span> : null;
	}
	const clock = resolveBoardClock(game, i18n.t);
	return (
		<span className={`guide-bar-status${clock.word ? '' : ' num'}${clock.delayed ? ' is-delayed' : ''}`}>
			{clock.topOfInning !== undefined && <InningHalfIcon topOfInning={clock.topOfInning} />}
			{clock.text}
		</span>
	);
};

interface guideBlockProps {
	slot: guideSlot;
	fromMs: number;
	heat: blockHeat;
	power?: number;
	watching?: string;
	selected: boolean;
	onOpen: (gameId: string) => void;
	mono?: Record<string, TeamMonoMarks>;
	theme: ResolvedTheme;
}

// The button runs from the game's start to the next game in its lane, or to the end of the day, and
// only the block drawn inside it and the label take the pointer. That is what lets the label stay
// pinned beside the league column after the block itself has scrolled away: sticky content cannot
// leave its box.
const GuideBlock = ({ slot, fromMs, heat, power, watching, selected, onOpen, mono, theme }: guideBlockProps) => {
	const { bar, lane, untilMs } = slot;
	const { game } = bar;
	// Whole pixels, so an end cap's edge is a crisp line rather than a smear across two.
	const left = Math.round(msToPx(bar.startMs, fromMs));
	const width = Math.max(Math.round(msToPx(bar.endMs, fromMs)) - left, 24);
	const height = blockHeights[heat];
	const [awayColor, homeColor] = resolveGameColors(game, theme);
	const scored = game.status !== 'pre';
	const behind = trailingSide(game);
	const tall = heat === 'hot';
	const watchingLabel = watching ? <span className='guide-bar-watching'>{i18n.t('board.watching', { tab: watching })}</span> : null;
	const matchup = `${game.awayTeam.name} ${i18n.t('board.at')} ${game.homeTeam.name}`;
	return (
		<button
			type='button'
			className='guide-bar'
			data-status={game.status}
			data-heat={heat}
			data-game-id={game.id}
			data-selected={selected ? 'true' : undefined}
			data-watched={watching ? 'true' : undefined}
			data-scored={power !== undefined ? 'true' : undefined}
			style={{
				left: `${left}px`,
				top: `${lane * laneHeight + (laneHeight - height) / 2}px`,
				height: `${height}px`,
				right: untilMs === null ? 0 : undefined,
				width: untilMs === null ? undefined : `${Math.round(msToPx(untilMs, fromMs)) - left}px`,
				'--guide-bar-width': `${width}px`,
				'--cap-away': awayColor,
				'--cap-home': homeColor,
			} as CSSProperties}
			onClick={() => onOpen(game.id)}
			title={`${matchup}, ${formatGuideTime(bar.startMs)}`}
		>
			<span className='guide-bar-shape' aria-hidden='true' />
			<span className='guide-bar-content'>
				<span className='guide-bar-line'>
					{/* Static rather than the popup's pulse. One dot beating beside a score is a heartbeat;
					    thirty of them down a grid is a flashing screen. */}
					{game.status === 'in' && <span className='guide-bar-live' role='img' aria-label={i18n.t('gameCard.live')} />}
					{game.status === 'pre' && <span className='guide-bar-time num'>{formatGuideTime(bar.startMs)}</span>}
					<BlockTeam team={game.awayTeam} color={awayColor} mono={mono?.[game.awayTeam.id]} scored={scored} behind={behind === 'away'} theme={theme} />
					{!scored && <span className='guide-bar-at'>{i18n.t('board.at')}</span>}
					<BlockTeam team={game.homeTeam} color={homeColor} mono={mono?.[game.homeTeam.id]} scored={scored} behind={behind === 'home'} theme={theme} />
					{bar.isFavorite && <i className='bi bi-star-fill guide-bar-star' role='img' aria-label={i18n.t('guide.favoriteGame')} />}
					{!tall && <BlockStatus game={game} />}
					{!tall && watchingLabel}
				</span>
				{tall && (
					<span className='guide-bar-line guide-bar-sub'>
						<BlockStatus game={game} />
						{watchingLabel}
					</span>
				)}
			</span>
			{/* Live games only. A finished game never shows a PowerScore. */}
			{power !== undefined && (
				<strong className='guide-bar-value num'>
					<span className='visually-hidden'>{`${i18n.t('gameCard.powerScore')} `}</span>
					{power}
				</strong>
			)}
		</button>
	);
};

interface guideGridProps {
	bars: guideBar[];
	band: guideBand | null;
	leagueLogos: LeagueLogoMap;
	// Optional: a slate fetched before the team marks land simply draws the crest as it comes.
	monoLogos?: TeamMonoLogoMap;
	// Null on any day but today, which has no present moment to mark.
	now: number | null;
	// The width the plot has to fill, so a short day does not stop partway across the tab.
	minPlotPx?: number;
	// The popup's own PowerScores, which the slate does not carry.
	powers?: ReadonlyMap<string, number>;
	// Game id to the label of the tab showing it.
	watching?: ReadonlyMap<string, string>;
	selectedGameId?: string | null;
	onOpen: (gameId: string) => void;
	theme?: ResolvedTheme;
}

const GuideGrid = ({
	bars,
	band,
	leagueLogos,
	monoLogos = {},
	now,
	minPlotPx = 0,
	powers = noPowers,
	watching = noneWatched,
	selectedGameId = null,
	onOpen,
	theme = 'dark',
}: guideGridProps) => {
	const canvasRef = useRef<HTMLDivElement | null>(null);
	useEdgeClipping(canvasRef);
	const bounds = axisBounds(bars);
	if (!bounds) return null;
	const { fromMs, toMs } = fillAxis(bounds, minPlotPx);
	// The canvas's own right edge is the end of the day and carries no mark: a label there would hang
	// off the end of the scroll.
	const marks = hourMarks(fromMs, toMs).slice(0, -1);
	const groups = groupByLeague(bars);
	const heat = resolveHeat(bars, powers);
	const nowLeft = now !== null && now >= fromMs && now <= toMs ? Math.round(msToPx(now, fromMs)) : null;

	return (
		// The gutter travels as a custom property rather than as a second copy of the number in the
		// stylesheet: the canvas width, the sticky labels and the two plot layers all have to agree.
		<div ref={canvasRef} className='guide-canvas' style={{ width: `${gutterPx + msToPx(toMs, fromMs)}px`, '--guide-gutter': `${gutterPx}px` } as CSSProperties}>
			<div className='guide-ruler'>
				<div className='guide-ruler-corner' />
				<div className='guide-ruler-track'>
					{band && <div className='guide-ruler-band' style={bandBox(band, fromMs)} aria-hidden='true' />}
					{/* A zero-width anchor on the hour with the label beside it, so the tick is the mark's
					    own edge and cannot drift off the gridline below it. */}
					{marks.map(mark => (
						<span key={mark} className='guide-ruler-mark' style={{ left: `${msToPx(mark, fromMs)}px` }}>
							<span className='guide-ruler-label num'>{formatHourMark(mark)}</span>
						</span>
					))}
					{nowLeft !== null && <span className='guide-ruler-now' style={{ left: `${nowLeft}px` }} aria-hidden='true' />}
				</div>
			</div>

			<div className='guide-body'>
				{/* Behind the blocks, which are opaque: the now line and the band show in the gaps between
				    games and never run through a score. */}
				<div className='guide-underlay' aria-hidden='true'>
					{marks.map(mark => (
						<span key={mark} className='guide-gridline' style={{ left: `${msToPx(mark, fromMs)}px` }} />
					))}
					{band && <div className='guide-band' style={bandBox(band, fromMs)} />}
					{nowLeft !== null && <div className='guide-now' style={{ left: `${nowLeft}px` }} />}
				</div>

				{groups.map(group => (
					<div key={group.league} className='guide-group' style={{ height: `${group.laneCount * laneHeight}px` }}>
						<div className='guide-league'>
							{/* Rides down a league taller than the screen rather than scrolling away from the
							    lanes it names. */}
							<span className='guide-league-inner'>
								<CrestDisc
									logo={resolveLeagueLogoUrl(group.league, leagueLogos[group.league], theme)}
									abbreviation=''
									discClassName='guide-league-disc'
									crestClassName='guide-league-logo'
									fallback='blank'
									loading='lazy'
								/>
								<span className='guide-league-label' title={leagueLabels[group.league]}>{leagueLabels[group.league]}</span>
							</span>
						</div>
						<div className='guide-group-lanes'>
							{group.slots.map(slot => (
								<GuideBlock
									key={slot.bar.game.id}
									slot={slot}
									fromMs={fromMs}
									heat={heat.get(slot.bar.game.id) ?? 'cool'}
									power={slot.bar.game.status === 'in' ? powers.get(slot.bar.game.id) : undefined}
									watching={watching.get(slot.bar.game.id)}
									selected={slot.bar.game.id === selectedGameId}
									onOpen={onOpen}
									mono={monoLogos[group.league]}
									theme={theme}
								/>
							))}
						</div>
					</div>
				))}

				{/* Carries the gutter column past the last league to the bottom of the tab. A sticky cell
				    like the ones above it, since anything placed in canvas coordinates scrolls sideways. */}
				<div className='guide-group guide-group-tail' aria-hidden='true'>
					<div className='guide-gutter-tail' />
				</div>
			</div>
		</div>
	);
};

export default GuideGrid;
