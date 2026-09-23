import { i18n } from '#i18n';
import { leagueConfigMap, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueLogoMap, Team, TeamMonoLogoMap, TeamMonoMarks } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import InningHalfIcon from '@arenaswap/ui/src/components/inningHalfIcon';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import { leagueLabels } from '@arenaswap/ui/src/components/popupChrome';
import { useRef, type CSSProperties } from 'react';
import { resolveStatus } from '../popup/components/gameSituation';
import { formatGuideTime } from './guideFormat';
import type { guideBand, guideBar } from './guideHeat';
import useEdgeClipping from './useEdgeClipping';
import { axisBounds, barHeight, fillAxis, groupByLeague, gutterPx, hourMarks, msToPx, rowHeight } from './guideLayout';

const formatTime = formatGuideTime;

// Lightened, unlike the game card's pair, because these sit on #0d1117 rather than on a white card.
// Half the league's primaries are navies that reach nothing like 3:1 against it, and the climb
// scales the channels rather than mixing toward white, so a blue stays a blue.
const railStyle = (game: Game): CSSProperties => {
	const [away, home] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#30363d', '#30363d', true);
	return { '--guide-away': away, '--guide-home': home } as CSSProperties;
};

const bandBox = (band: guideBand, fromMs: number): CSSProperties => {
	const left = msToPx(band.fromMs, fromMs);
	return { left: `${left}px`, width: `${Math.max(msToPx(band.toMs, fromMs) - left, 8)}px` };
};

// The bar is #21262d, which is what a crest drawn on it has to stand off.
const guideBarSurface = '#21262d';

const BarTeam = ({ team, mono, score, lost }: { team: Team; mono?: TeamMonoMarks; score?: number; lost?: boolean }) => (
	<span className={`guide-bar-side${lost ? ' is-loser' : ''}`}>
		<TeamCrest
			logo={team.logo}
			monoMarks={mono}
			abbreviation={(team.abbreviation || '?').slice(0, 3)}
			background={guideBarSurface}
			discClassName='guide-crest-disc'
			crestClassName='guide-crest'
			fallback='blank'
			loading='lazy'
		/>
		<span className='guide-bar-team'>{team.abbreviation}</span>
		{score !== undefined && <span className='guide-bar-score'>{score}</span>}
	</span>
);

// What a card says in its status row, at bar size: the period and clock while a game is on, the
// result once it is over, and before it the kickoff and the network it is on.
const BarStatus = ({ game, startMs }: { game: Game; startMs: number }) => {
	if (game.status === 'pre') return <span className='guide-bar-time'>{formatTime(startMs)}</span>;
	if (game.status === 'post') {
		const final = i18n.t('gameCard.final');
		return <span className='guide-bar-status'>{game.finalPeriodSuffix ? `${final}/${game.finalPeriodSuffix}` : final}</span>;
	}
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const status = resolveStatus(game, isInningSport, i18n.t);
	return (
		<span className={`guide-bar-status${status.tabular ? ' is-tabular' : ''}`}>
			{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}
			{status.text}
		</span>
	);
};

interface guideBarProps {
	bar: guideBar;
	fromMs: number;
	selected: boolean;
	onOpen: (gameId: string) => void;
	mono?: Record<string, TeamMonoMarks>;
}

// The button runs from the game's start to the end of the day, and only the bar drawn inside it and
// the label take the pointer. That is what lets the label stay pinned beside the league column after
// the bar itself has scrolled away: sticky content cannot leave its box, and when that box was the
// bar, a game that ended an hour ago was an empty row or a scrap like 'F @ MIA' under the gutter.
const GuideBar = ({ bar, fromMs, selected, onOpen, mono }: guideBarProps) => {
	const { game } = bar;
	const left = msToPx(bar.startMs, fromMs);
	const width = Math.max(msToPx(bar.endMs, fromMs) - left, 24);
	const { awayTeam: away, homeTeam: home } = game;
	const scored = game.status !== 'pre';
	// A shootout leaves the scoreline level, so neither side is dimmed; the suffix says how it ended.
	const decided = game.status === 'post' && away.score !== home.score;
	const network = game.status === 'pre' ? game.broadcasts?.[0] : undefined;
	return (
		<button
			type='button'
			className='guide-bar'
			data-status={game.status}
			data-game-id={game.id}
			data-selected={selected ? 'true' : undefined}
			style={{ left: `${left}px`, height: `${barHeight}px`, '--guide-bar-width': `${width}px`, ...railStyle(game) } as CSSProperties}
			onClick={() => onOpen(game.id)}
			title={`${away.name} @ ${home.name} \u00b7 ${formatTime(bar.startMs)}`}
		>
			<span className='guide-bar-shape' aria-hidden='true' />
			<span className='guide-bar-content'>
				{/* Static rather than the popup's pulsing dot. One dot pulsing beside a score is a
				    heartbeat; thirty of them down a grid is a flashing screen. */}
				{game.status === 'in' && <span className='guide-bar-live' aria-label={i18n.t('gameCard.live')} role='img' />}
				{game.status === 'pre' && <BarStatus game={game} startMs={bar.startMs} />}
				<BarTeam team={away} mono={mono?.[away.id]} score={scored ? away.score : undefined} lost={decided && away.score < home.score} />
				{!scored && <span className='guide-bar-at'>{i18n.t('guide.at')}</span>}
				<BarTeam team={home} mono={mono?.[home.id]} score={scored ? home.score : undefined} lost={decided && home.score < away.score} />
				{bar.isFavorite && <i className='bi bi-star-fill guide-bar-star' aria-label={i18n.t('guide.favoriteGame')} />}
				{scored && <BarStatus game={game} startMs={bar.startMs} />}
				{network && <span className='guide-bar-network'>{network}</span>}
			</span>
		</button>
	);
};

const GuideGrid = ({
	bars,
	band,
	leagueLogos,
	monoLogos = {},
	now,
	minPlotPx = 0,
	selectedGameId = null,
	onOpen,
}: {
	bars: guideBar[];
	band: guideBand | null;
	leagueLogos: LeagueLogoMap;
	// Optional: a slate fetched before the team marks land, or a demo slate, simply draws the disc.
	monoLogos?: TeamMonoLogoMap;
	// Null on any day but today, which has no present moment to mark.
	now: number | null;
	// The width the plot has to fill, so a short day does not stop partway across the tab.
	minPlotPx?: number;
	selectedGameId?: string | null;
	onOpen: (gameId: string) => void;
}) => {
	const canvasRef = useRef<HTMLDivElement | null>(null);
	useEdgeClipping(canvasRef);
	const bounds = axisBounds(bars);
	if (!bounds) return null;
	const { fromMs, toMs } = fillAxis(bounds, minPlotPx);
	const marks = hourMarks(fromMs, toMs);
	const groups = groupByLeague(bars);
	const nowLeft = now !== null && now >= fromMs && now <= toMs ? msToPx(now, fromMs) : null;

	return (
		// The gutter travels as a custom property rather than as a second copy of the number in the
		// stylesheet: the canvas width, the sticky bar content and the two plot overlays all have to
		// agree with it, and a pair that can disagree is how the grid slides out from under its axis.
		<div ref={canvasRef} className='guide-canvas' style={{ width: `${gutterPx + msToPx(toMs, fromMs)}px`, '--guide-gutter': `${gutterPx}px` } as CSSProperties}>
			<div className='guide-ruler'>
				<div className='guide-ruler-corner' />
				<div className='guide-ruler-track'>
					{/* Marked on the axis and not labelled on it: the header's own sentence carries the times,
					    and printing them twice in one viewport is the thing this pass was for. */}
					{band && <div className='guide-ruler-band' style={bandBox(band, fromMs)} aria-hidden='true' />}
					{/* A zero-width anchor sitting exactly on the hour, with the label shifted off it. The
					    tick is the mark's own edge, so it cannot drift away from the gridline below it the
					    way a tick centred on the label does. */}
					{marks.map(mark => (
						<span key={mark} className='guide-ruler-mark' style={{ left: `${msToPx(mark, fromMs)}px` }}>
							<span className='guide-ruler-label'>{formatTime(mark)}</span>
						</span>
					))}
				</div>
			</div>

			<div className='guide-body'>
				{/* Behind the bars. Both plot layers start where the gutter ends, which is what keeps every
				    x on this screen measured from the start of the day rather than from the page. */}
				<div className='guide-underlay' aria-hidden='true'>
					{marks.map(mark => (
						<span key={mark} className='guide-gridline' style={{ left: `${msToPx(mark, fromMs)}px` }} />
					))}
					{band && <div className='guide-band' style={bandBox(band, fromMs)} />}
				</div>

				{groups.map(group => (
					<div key={group.league} className='guide-group'>
						<div className='guide-league'>
							{/* Rides down a group taller than the screen rather than scrolling away from the
							    rows it names. Offset by the ruler, which is stuck across the top of the same
							    scroller. */}
							<span className='guide-league-inner'>
								<CrestDisc
									logo={resolveLeagueLogoUrl(group.league, leagueLogos[group.league])}
									abbreviation=''
									discClassName='guide-league-disc'
									crestClassName='guide-league-logo'
									fallback='blank'
									loading='lazy'
								/>
								<span className='guide-league-label' title={leagueLabels[group.league]}>{leagueLabels[group.league]}</span>
							</span>
						</div>
						<div className='guide-group-rows'>
							{group.bars.map(bar => (
								<div key={bar.game.id} className='guide-row' style={{ height: `${rowHeight}px` }}>
									<GuideBar bar={bar} fromMs={fromMs} selected={bar.game.id === selectedGameId} onOpen={onOpen} mono={monoLogos[group.league]} />
								</div>
							))}
						</div>
					</div>
				))}

				{/* Carries the gutter column past the last group to the bottom of the tab. It has to be a
				    sticky cell like the ones above it rather than a rule positioned on the body: anything
				    placed in canvas coordinates scrolls sideways, and the column it is continuing does not. */}
				<div className='guide-group guide-group-tail' aria-hidden='true'>
					<div className='guide-gutter-tail' />
				</div>

				{/* Over the bars rather than under them, which is the one thing on the grid that has to be
				    findable without looking for it. */}
				{nowLeft !== null && (
					<div className='guide-overlay' aria-hidden='true'>
						<div className='guide-now' style={{ left: `${nowLeft}px` }} />
					</div>
				)}
			</div>
		</div>
	);
};

export default GuideGrid;
