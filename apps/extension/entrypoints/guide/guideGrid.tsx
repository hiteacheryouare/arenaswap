import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueLogoMap } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import { leagueLabels } from '@arenaswap/ui/src/components/popupChrome';
import type { CSSProperties } from 'react';
import { formatGuideTime } from './guideFormat';
import type { guideBand, guideBar } from './guideHeat';
import { axisBounds, barHeight, groupByLeague, gutterPx, hourMarks, msToPx, rowHeight } from './guideLayout';

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

const GuideBar = ({ bar, fromMs, onOpen }: { bar: guideBar; fromMs: number; onOpen: (gameId: string) => void }) => {
	const { game } = bar;
	const left = msToPx(bar.startMs, fromMs);
	const width = Math.max(msToPx(bar.endMs, fromMs) - left, 24);
	return (
		<button
			type='button'
			className='guide-bar'
			data-status={game.status}
			style={{ left: `${left}px`, width: `${width}px`, height: `${barHeight}px`, ...railStyle(game) }}
			onClick={() => onOpen(game.id)}
			title={`${game.awayTeam.name} @ ${game.homeTeam.name} \u00b7 ${formatTime(bar.startMs)}`}
		>
			{/* Pinned to the left edge of whatever part of the bar is on screen, clearing the league
			    gutter. A game that started before the viewport is the ordinary case on a guide scrolled
			    to now, and without this those rows show the tail end of a bar with the matchup scrolled
			    off — a row reading 'PHI' and nothing else. */}
			<span className='guide-bar-content'>
				{/* Static rather than the popup's pulsing dot. One dot pulsing beside a score is a
				    heartbeat; thirty of them down a grid is a flashing screen. */}
				{game.status === 'in' && <span className='guide-bar-live' aria-label={i18n.t('gameCard.live')} role='img' />}
				<span className='guide-bar-time'>{formatTime(bar.startMs)}</span>
				<CrestDisc logo={game.awayTeam.logo} abbreviation={(game.awayTeam.abbreviation || '?').slice(0, 3)} discClassName='guide-crest-disc' crestClassName='guide-crest' fallback='blank' loading='lazy' />
				<span className='guide-bar-team'>{game.awayTeam.abbreviation}</span>
				<span className='guide-bar-at'>{i18n.t('guide.at')}</span>
				<CrestDisc logo={game.homeTeam.logo} abbreviation={(game.homeTeam.abbreviation || '?').slice(0, 3)} discClassName='guide-crest-disc' crestClassName='guide-crest' fallback='blank' loading='lazy' />
				<span className='guide-bar-team'>{game.homeTeam.abbreviation}</span>
				{bar.isFavorite && <i className='bi bi-star-fill guide-bar-star' aria-label={i18n.t('guide.favoriteGame')} />}
			</span>
		</button>
	);
};

const GuideGrid = ({
	bars,
	band,
	leagueLogos,
	now,
	onOpen,
}: {
	bars: guideBar[];
	band: guideBand | null;
	leagueLogos: LeagueLogoMap;
	// Null on any day but today, which has no present moment to mark.
	now: number | null;
	onOpen: (gameId: string) => void;
}) => {
	const bounds = axisBounds(bars);
	if (!bounds) return null;
	const { fromMs, toMs } = bounds;
	const marks = hourMarks(fromMs, toMs);
	const groups = groupByLeague(bars);
	const nowLeft = now !== null && now >= fromMs && now <= toMs ? msToPx(now, fromMs) : null;

	return (
		// The gutter travels as a custom property rather than as a second copy of the number in the
		// stylesheet: the canvas width, the sticky bar content and the two plot overlays all have to
		// agree with it, and a pair that can disagree is how the grid slides out from under its axis.
		<div className='guide-canvas' style={{ width: `${gutterPx + msToPx(toMs, fromMs)}px`, '--guide-gutter': `${gutterPx}px` } as CSSProperties}>
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
									<GuideBar bar={bar} fromMs={fromMs} onOpen={onOpen} />
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
