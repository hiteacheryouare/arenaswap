import { i18n } from '#i18n';
import { isHomeFirst, leagueConfigMap, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueLogoMap, Team, TeamMonoLogoMap, TeamMonoMarks } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/chromatic';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import { formatDisruption } from '@arenaswap/ui/src/components/gameFormat';
import InningHalfIcon from '@arenaswap/ui/src/components/inningHalfIcon';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import { leagueLabels } from '@arenaswap/ui/src/components/popupChrome';
import { useRef, type CSSProperties } from 'react';
import { resolveStatus } from '@arenaswap/ui/src/components/gameSituation';
import GameStatusText from '@arenaswap/ui/src/components/gameStatusText';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import { formatGuideTime } from './guideFormat';
import type { guideBand, guideBar } from './guideHeat';
import type { teamSide } from '../popup/scoreConfettiHelpers';
import useEdgeClipping from './useEdgeClipping';
import type { ResolvedTheme } from '@arenaswap/core/types';
import { axisBounds, barHeight, fillAxis, groupByLeague, gutterPx, hourMarks, msToPx, rowHeight } from './guideLayout';

const useFormatTime = () => {
	const locale = useDisplayLocale();
	return (ms: number) => formatGuideTime(ms, locale);
};

const railStyle = (game: Game): CSSProperties => {
	const [away, home] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#30363d', '#30363d');
	const [left, right] = isHomeFirst(game) ? [home, away] : [away, home];
	return { '--guide-left': left, '--guide-right': right } as CSSProperties;
};

const bandBox = (band: guideBand, fromMs: number): CSSProperties => {
	const left = msToPx(band.fromMs, fromMs);
	return { left: `${left}px`, width: `${Math.max(msToPx(band.toMs, fromMs) - left, 8)}px` };
};

const guideBarSurface: Record<ResolvedTheme, string> = { dark: '#21262d', light: '#e7ebf0' };

const BarTeam = ({ team, side, mono, score, lost, theme }: { team: Team; side: teamSide; mono?: TeamMonoMarks; score?: number; lost?: boolean; theme: ResolvedTheme }) => (
	<span className={`guide-bar-side is-${side}${lost ? ' is-loser' : ''}`}>
		<TeamCrest
			logo={team.logo}
			monoMarks={mono}
			abbreviation={(team.abbreviation || '?').slice(0, 3)}
			background={guideBarSurface[theme]}
			discClassName='guide-crest-disc'
			crestClassName='guide-crest'
			fallback='blank'
			loading='lazy'
			teamColor={team.color}
		/>
		<span className='guide-bar-team'>{team.abbreviation}</span>
		{score !== undefined && <span className='guide-bar-score'>{score}</span>}
	</span>
);

const BarStatus = ({ game, startMs }: { game: Game; startMs: number }) => {
	const formatTime = useFormatTime();
	if (game.status === 'pre') return <span className='guide-bar-time'>{formatTime(startMs)}</span>;
	if (game.status === 'post') {
		const final = i18n.t('gameCard.final');
		const label = formatDisruption(game, i18n.t) ?? (game.finalPeriodSuffix ? `${final}/${game.finalPeriodSuffix}` : final);
		return <span className='guide-bar-status'>{label}</span>;
	}
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const status = resolveStatus(game, isInningSport, i18n.t);
	return (
		<span className='guide-bar-status'>
			{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}
			<GameStatusText status={status} />
		</span>
	);
};

interface guideBarProps {
	bar: guideBar;
	fromMs: number;
	selected: boolean;
	onOpen: (gameId: string) => void;
	mono?: Record<string, TeamMonoMarks>;
	theme: ResolvedTheme;
}

const GuideBar = ({ bar, fromMs, selected, onOpen, mono, theme }: guideBarProps) => {
	const formatTime = useFormatTime();
	const { game } = bar;
	const left = msToPx(bar.startMs, fromMs);
	const width = Math.max(msToPx(bar.endMs, fromMs) - left, 24);
	const { awayTeam: away, homeTeam: home } = game;
	const scored = game.status !== 'pre' && game.disruption !== 'postponed' && game.disruption !== 'canceled';
	const decided = game.status === 'post' && !game.disruption && away.score !== home.score;
	const network = game.status === 'pre' ? game.broadcasts?.[0] : undefined;
	const homeFirst = isHomeFirst(game);
	const awayTeam = <BarTeam team={away} side='away' mono={mono?.[away.id]} score={scored ? away.score : undefined} lost={decided && away.score < home.score} theme={theme} />;
	const homeTeam = <BarTeam team={home} side='home' mono={mono?.[home.id]} score={scored ? home.score : undefined} lost={decided && home.score < away.score} theme={theme} />;
	return (
		<button
			type='button'
			className='guide-bar'
			data-status={game.status}
			data-game-id={game.id}
			data-selected={selected ? 'true' : undefined}
			style={{ left: `${left}px`, height: `${barHeight}px`, '--guide-bar-width': `${width}px`, ...railStyle(game) } as CSSProperties}
			onClick={() => onOpen(game.id)}
			title={`${away.name} ${i18n.t('guide.at')} ${home.name} \u00b7 ${formatTime(bar.startMs)}`}
		>
			<span className='guide-bar-shape' aria-hidden='true' />
			<span className='guide-bar-content'>
				{game.status === 'in' && <span className='guide-bar-live' aria-label={i18n.t('gameCard.live')} role='img' />}
				{game.status === 'pre' && <BarStatus game={game} startMs={bar.startMs} />}
				{homeFirst ? homeTeam : awayTeam}
				{!scored && <span className='guide-bar-at'>{i18n.t(homeFirst ? 'gameCard.vs' : 'guide.at')}</span>}
				{homeFirst ? awayTeam : homeTeam}
				{bar.isFavorite && <i className='bi bi-star-fill guide-bar-star' aria-label={i18n.t('guide.favoriteGame')} role='img' />}
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
	theme = 'dark',
}: {
	bars: guideBar[];
	band: guideBand | null;
	leagueLogos: LeagueLogoMap;
	monoLogos?: TeamMonoLogoMap;
	now: number | null;
	minPlotPx?: number;
	selectedGameId?: string | null;
	onOpen: (gameId: string) => void;
	theme?: ResolvedTheme;
}) => {
	const formatTime = useFormatTime();
	const canvasRef = useRef<HTMLDivElement | null>(null);
	useEdgeClipping(canvasRef);
	const bounds = axisBounds(bars);
	if (!bounds) return null;
	const { fromMs, toMs } = fillAxis(bounds, minPlotPx);
	const marks = hourMarks(fromMs, toMs);
	const groups = groupByLeague(bars);
	const nowLeft = now !== null && now >= fromMs && now <= toMs ? msToPx(now, fromMs) : null;

	return (
		<div ref={canvasRef} className='guide-canvas' style={{ width: `${gutterPx + msToPx(toMs, fromMs)}px`, '--guide-gutter': `${gutterPx}px` } as CSSProperties}>
			<div className='guide-ruler'>
				<div className='guide-ruler-corner' />
				<div className='guide-ruler-track'>
					{band && <div className='guide-ruler-band' style={bandBox(band, fromMs)} aria-hidden='true' />}
					{marks.map(mark => (
						<span key={mark} className='guide-ruler-mark' style={{ left: `${msToPx(mark, fromMs)}px` }}>
							<span className='guide-ruler-label'>{formatTime(mark)}</span>
						</span>
					))}
				</div>
			</div>

			<div className='guide-body'>
				<div className='guide-underlay' aria-hidden='true'>
					{marks.map(mark => (
						<span key={mark} className='guide-gridline' style={{ left: `${msToPx(mark, fromMs)}px` }} />
					))}
					{band && <div className='guide-band' style={bandBox(band, fromMs)} />}
				</div>

				{groups.map(group => (
					<div key={group.league} className='guide-group'>
						<div className='guide-league'>
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
						<div className='guide-group-rows'>
							{group.bars.map(bar => (
								<div key={bar.game.id} className='guide-row' style={{ height: `${rowHeight}px` }}>
									<GuideBar bar={bar} fromMs={fromMs} selected={bar.game.id === selectedGameId} onOpen={onOpen} mono={monoLogos[group.league]} theme={theme} />
								</div>
							))}
						</div>
					</div>
				))}

				<div className='guide-group guide-group-tail' aria-hidden='true'>
					<div className='guide-gutter-tail' />
				</div>

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
