import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { scoreMaxTotal, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreResult, PowerScoreSnapshot, ResolvedTheme, ScoreSnapshot, SignalName, TabRegistration, TeamMonoLogoMap } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import DetailHero from './detailHero';
import DetailStickyBar from './detailStickyBar';
import DetailTabCard from './detailTabCard';
import DetailTabs from './detailTabs';
import type { DetailTab, DetailTabId } from './detailTabs';
import StandingsTable from './standingsTable';
import { hasBoxScoreContent } from './boxScoreColumns';
import GameDetailChart from './gameDetailChart';
import GameBoostInput from './gameBoostInput';
import GameInfoPanel from './gameInfoPanel';
import HolidayDrift from './holidayDrift';
import HolidayFall from './holidayFall';
import HolidayLights from './holidayLights';
import LatestPlayPanel from './latestPlayPanel';
import PowerScoreBreakdown, { signalMeta } from './powerScoreBreakdown';
import PregameSetup from './pregameSetup';
import PregameStats from './pregameStats';
import BoxScore from './boxScore';
import ProTip from './proTip';
import { tabNumberLabel } from './tabAssignSelect';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
	darkChartPalette,
	lightChartPalette,
} from './gameDetailChartOptions';
import useSummaryData from './useSummaryData';
import { chartHistory, coversWholeGame } from './wrapCoverage';
import { resolveDecorations, type holidayDecorationPrefs } from '../../../utils/holidayDecorations';
import { favoriteScoreFlashColors, scorelineOf, type gameScoreline } from '../../../utils/favoriteScoreFlash';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from '@arenaswap/ui/src/components/displayPrefs';

interface gameDetailViewProps {
	game: Game;
	excitementResult: PowerScoreResult | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
	proTipsEnabled: boolean;
	gameBoosts: Record<string, number>;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
	decorationPrefs: holidayDecorationPrefs;
	// Demo mode borrows a date so the calendar-gated decorations are reachable in September.
	decorationDate?: Date;
	disabledSignals?: readonly SignalName[];
	favoriteTeamIds?: ReadonlySet<string>;
	openTabs?: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	// Absent where favourites can't be changed from here, which leaves the stars as marks.
	onToggleFavoriteTeam?: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange?: (updated: TabRegistration[]) => void;
	formatTabLabel?: (tab: Browser.tabs.Tab) => string;
	tabAssignEnabled?: boolean;
	// A panel beside a page closes; a screen in the popup goes back to the list it came from.
	dismiss?: 'back' | 'close';
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
	theme?: ResolvedTheme;
	// The board's cached marks, for a team the game summary didn't send one for.
	boardMonoLogos?: TeamMonoLogoMap;
}

const noFavorites: ReadonlySet<string> = new Set();

const favoriteFlashMs = 5000;

// The compact bar is 48px tall. It takes over a little before the stage's matchup reaches it, which
// is while the stage's own back control is still half on screen, so there is always a way back.
const handoffPx = 48 + 16;

const componentLegendKeys = {
	closeness: 'detail.legendCloseness',
	lateGame: 'detail.legendLateGame',
	momentum: 'detail.legendMomentum',
	leadChanges: 'detail.legendLeadChanges',
	comeback: 'detail.legendComeback',
} as const;

const componentLegendItems = signalMeta.map(signal => ({
	label: i18n.t(componentLegendKeys[signal.name as keyof typeof componentLegendKeys]),
	color: signal.color,
}));

const gameDetailView = ({
	game,
	excitementResult,
	scoreHistory,
	powerScoreHistory,
	proTipsEnabled,
	gameBoosts,
	bettingPrefs,
	weatherPrefs,
	decorationPrefs,
	decorationDate,
	disabledSignals = [],
	favoriteTeamIds = noFavorites,
	openTabs = [],
	registry = [],
	onToggleFavoriteTeam,
	onRegistryChange = () => {},
	formatTabLabel = tab => tab.title ?? '',
	tabAssignEnabled = true,
	dismiss = 'back',
	onSetGameBoost,
	onBack,
	theme = 'dark',
	boardMonoLogos,
}: gameDetailViewProps) => {
	const orderedScoreHistory = useMemo(
		() => chartHistory(scoreHistory.toSorted((a, b) => a.timestamp - b.timestamp), game),
		[scoreHistory, game],
	);
	const orderedPowerScoreHistory = useMemo(
		() => chartHistory(powerScoreHistory.toSorted((a, b) => a.timestamp - b.timestamp), game),
		[powerScoreHistory, game],
	);
	const fallbackPowerScore = orderedPowerScoreHistory[orderedPowerScoreHistory.length - 1];
	const activePowerScore = excitementResult ?? fallbackPowerScore;

	const closeness = activePowerScore?.closeness ?? 0;
	const lateGame = activePowerScore?.lateGame ?? 0;
	const momentum = activePowerScore?.momentum ?? 0;
	const leadChanges = activePowerScore?.leadChanges ?? 0;
	const comeback = activePowerScore?.comeback ?? 0;
	const rawSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
	// When stalled this is the pre-stall signals sum stored by the scorer, which may exceed 100.
	const signalsSubtotal = activePowerScore?.signalsSubtotal ?? rawSubtotal;
	const stallPenalty = activePowerScore?.stallPenalty ?? 0;
	// Only clock sports ever accumulate a stall count, so the row is hidden for the rest rather than
	// pinned at zero. An unknown sport falls back to basketball, as the scorer does.
	const clockBased = (sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball).clockBased;
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const decorations = resolveDecorations(game, decorationDate ?? new Date(), decorationPrefs);

	const [scoreFlash, setScoreFlash] = useState<string[] | null>(null);
	const previousScoreline = useRef<gameScoreline | null>(null);
	const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		const colors = favoriteScoreFlashColors(previousScoreline.current, game, favoriteTeamIds);
		// Seeded on the first pass so opening the screen mid-game does not read as a goal.
		previousScoreline.current = scorelineOf(game);
		if (!colors) return;
		setScoreFlash(colors);
		clearTimeout(flashTimer.current);
		flashTimer.current = setTimeout(() => setScoreFlash(null), favoriteFlashMs);
	}, [game, favoriteTeamIds]);

	useEffect(() => () => clearTimeout(flashTimer.current), []);
	const currentBoost = gameBoosts[game.id] ?? 0;
	// The breakdown mirrors the scorer, which drops every boost while play is frozen. The boost input
	// keeps the stored value, since the setting survives halftime even though it pays nothing.
	const appliedBoost = activePowerScore?.gameBoost ?? currentBoost;
	const scoringOpportunityBoost = activePowerScore?.scoringOpportunityBoost ?? 0;
	const postseasonBoost = activePowerScore?.postseasonBoost ?? 0;
	const reason = activePowerScore?.reason ?? 'Best Available';

	const chartPalette = theme === 'light' ? lightChartPalette : darkChartPalette;
	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory, chartPalette)
	), [orderedPowerScoreHistory, chartPalette]);
	const scoreTrendOption = useMemo(() => (
		buildTeamScoreOption(orderedScoreHistory, game, chartPalette)
	), [orderedScoreHistory, game, chartPalette]);
	const componentOption = useMemo(() => (
		buildComponentContributionOption(orderedPowerScoreHistory, chartPalette)
	), [orderedPowerScoreHistory, chartPalette]);
	const { winProbability, seriesInfo, records, monoLogos: summaryMonoLogos, boxScore, standings, gameDurationMins } = useSummaryData(game);
	const monoLogos = useMemo(() => ({
		away: summaryMonoLogos.away ?? boardMonoLogos?.[game.league]?.[game.awayTeam.id] ?? null,
		home: summaryMonoLogos.home ?? boardMonoLogos?.[game.league]?.[game.homeTeam.id] ?? null,
	}), [summaryMonoLogos, boardMonoLogos, game.league, game.awayTeam.id, game.homeTeam.id]);
	const winProbabilityOption = useMemo(() => (
		buildWinProbabilityOption(winProbability, game, chartPalette)
	), [winProbability, game, chartPalette]);
	// Read from the scorer, not recomputed from the line fetched above, so this screen can never
	// disagree with the game you tapped. Undefined means there was too little data to measure.
	const winProbabilityVariance = activePowerScore?.winProbabilityVariance;
	const total = activePowerScore?.total ?? 0;

	const [awayLineColor, homeLineColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', chartPalette.surface);
	const teamLegendItems = useMemo(() => ([
		{ label: game.awayTeam.abbreviation, color: awayLineColor },
		{ label: game.homeTeam.abbreviation, color: homeLineColor },
	]), [awayLineColor, game.awayTeam.abbreviation, game.homeTeam.abbreviation, homeLineColor]);

	const isPreGame = game.status === 'pre';
	const isLive = game.status === 'in';
	const isFinal = game.status === 'post';
	// A wrap draws a chart only when its line covers the whole game. Win probability is exempt: it
	// arrives complete from our sources' play-by-play or not at all.
	const chartsCoverGame = !isFinal
		|| (coversWholeGame(orderedPowerScoreHistory, game) && coversWholeGame(orderedScoreHistory, game));
	const totalLabel = total > scoreMaxTotal
		? i18n.t('detail.totalLabelBaseMax', { total, max: scoreMaxTotal })
		: i18n.t('detail.totalLabel', { total, max: scoreMaxTotal });

	const tabIdForGame = registry.find(entry => entry.gameId === game.id)?.tabId;
	const gameTab = tabIdForGame === undefined ? undefined : openTabs.find(tab => tab.id === tabIdForGame);
	const watched = gameTab?.active === true;
	const tabLabel = isFinal || tabIdForGame === undefined
		? undefined
		: watched ? i18n.t('board.watching', { tab: tabNumberLabel(gameTab) }) : tabNumberLabel(gameTab);

	const shellRef = useRef<HTMLDivElement>(null);
	const heroRef = useRef<HTMLDivElement>(null);
	const [heroScrolledAway, setHeroScrolledAway] = useState(false);

	useEffect(() => {
		const root = shellRef.current;
		const target = heroRef.current?.querySelector('.as-match') ?? heroRef.current;
		if (!root || !target || typeof IntersectionObserver === 'undefined') return;

		const observer = new IntersectionObserver(
			entries => { for (const entry of entries) setHeroScrolledAway(entry.intersectionRatio < 1); },
			{ root, threshold: [0, 1], rootMargin: `-${handoffPx}px 0px 0px 0px` },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [game.status]);

	const overviewPanel = (
		<>
			{isLive && (
				<>
					<LatestPlayPanel game={game} awayColor={awayLineColor} homeColor={homeLineColor} />
					<PowerScoreBreakdown
						closeness={closeness}
						lateGame={lateGame}
						momentum={momentum}
						leadChanges={leadChanges}
						comeback={comeback}
						winProbabilityVariance={winProbabilityVariance}
						signalsSubtotal={signalsSubtotal}
						stallPenalty={stallPenalty}
						clockBased={clockBased}
						favoriteBonus={favoriteBonus}
						favoriteTeamCount={favoriteTeamCount}
						currentBoost={appliedBoost}
						scoringOpportunityBoost={scoringOpportunityBoost}
						postseasonBoost={postseasonBoost}
						postseasonLabel={game.postseasonLabel}
						totalLabel={totalLabel}
						reason={reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : undefined}
						disabledSignals={disabledSignals}
					/>
					<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />
				</>
			)}

			{/* Nothing has happened yet, so there is no PowerScore to break down. */}
			{isPreGame && <PregameStats game={game} />}

			{/* No PowerScore anywhere on a wrap: the number is a live judgement about what to watch
			    next, and printing its last value would read as a verdict on the game. */}
			<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} gameDurationMins={isFinal ? gameDurationMins : undefined} />

			{proTipsEnabled && <ProTip context='detail' />}

			{chartsCoverGame && orderedPowerScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartPowerScoreTitle')} option={powerScoreOption} />
			)}

			{chartsCoverGame && orderedScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartScoreTitle')} option={scoreTrendOption} legendItems={teamLegendItems} />
			)}

			{winProbability.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartWinProbTitle')} option={winProbabilityOption} legendItems={teamLegendItems} />
			)}

			{chartsCoverGame && orderedPowerScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartComponentsTitle')} option={componentOption} legendItems={componentLegendItems} />
			)}
		</>
	);

	// A tab is offered only once there is something behind it. Both optional ones arrive with the
	// `/summary` fetch, so the strip grows to its final shape a moment after the screen opens.
	const tabs: DetailTab[] = [
		{ id: 'overview', label: i18n.t('detail.tabOverview') },
		...(!isPreGame && hasBoxScoreContent(game.sportType, boxScore)
			? [{ id: 'box' as const, label: i18n.t('box.heading') }]
			: []),
		...(standings.length > 0
			? [{ id: 'standings' as const, label: i18n.t('detail.tabStandings') }]
			: []),
	];
	const tabId = (id: DetailTabId) => `dt-tab-${game.id}-${id}`;
	const paneId = (id: DetailTabId) => `dt-pane-${game.id}-${id}`;
	// One tab is not a choice, so there is no strip and the overview is simply the screen.
	const tabbed = tabs.length > 1;

	const paneFor = (id: DetailTabId) => (
		id === 'standings' ? <StandingsTable game={game} standings={standings} />
			: id === 'box' ? <BoxScore game={game} boxScore={boxScore} />
				: overviewPanel
	);

	return (
		<div className={`popup-container dt${decorations.lights ? ' has-lights' : ''}`} ref={shellRef}>
			{decorations.falling && <HolidayFall kind={decorations.falling} theme={theme} />}
			<div className='dt-bar-dock'>
				<DetailStickyBar game={game} compact={heroScrolledAway} monoLogos={monoLogos} dismiss={dismiss} onBack={onBack} theme={theme} />
				{decorations.lights && <HolidayLights flashColors={scoreFlash} lifted={heroScrolledAway} />}
			</div>

			<div ref={heroRef}>
				<DetailHero
					game={game}
					seriesInfo={seriesInfo}
					records={records}
					monoLogos={monoLogos}
					label={tabLabel}
					favoriteTeamIds={favoriteTeamIds}
					onToggleFavoriteTeam={onToggleFavoriteTeam}
					dismiss={dismiss}
					onBack={onBack}
				/>
			</div>

			<div className='dt-body'>
				{isPreGame && (
					<PregameSetup
						game={game}
						currentBoost={currentBoost}
						openTabs={openTabs}
						registry={registry}
						onSetGameBoost={onSetGameBoost}
						onRegistryChange={onRegistryChange}
						formatTabLabel={formatTabLabel}
						tabAssignEnabled={tabAssignEnabled}
					/>
				)}

				{isLive && tabAssignEnabled && !watched && (
					<DetailTabCard
						gameId={game.id}
						hasTab={tabIdForGame !== undefined}
						openTabs={openTabs}
						registry={registry}
						onRegistryChange={onRegistryChange}
						formatTabLabel={formatTabLabel}
					/>
				)}

				{tabbed ? (
					<>
						<DetailTabs tabs={tabs} tabId={tabId} paneId={paneId} />
						{/* No `fade`: these are one game seen three ways, and a crossfade puts a beat of
						    half-legible scoreline between a tap and the table it asked for. */}
						<div className='tab-content'>
							{tabs.map((tab, index) => (
								<div
									key={tab.id}
									id={paneId(tab.id)}
									className={`tab-pane dt-pane${index === 0 ? ' show active' : ''}`}
									role='tabpanel'
									aria-labelledby={tabId(tab.id)}
									tabIndex={0}
								>
									{paneFor(tab.id)}
								</div>
							))}
						</div>
					</>
				) : (
					<div className='dt-pane'>{overviewPanel}</div>
				)}
			</div>

			{decorations.falling && <HolidayDrift kind={decorations.falling} depth={decorations.depth} theme={theme} />}
		</div>
	);
};

export default gameDetailView;
