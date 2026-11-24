import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { createFavoriteTeamKey, isHomeFirst, leagueConfigMap, scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, LeagueId, LiveScore, PowerScoreSnapshot, ScoreSnapshot, SignalName, TabRegistration } from '@arenaswap/core/types';
import { hasCommercialBreaks, type FantasyRosterEntry } from '@arenaswap/core';
import DetailHero from '@arenaswap/ui/src/components/detailHero';
import DetailPosterHero from './detailPosterHero';
import DetailStickyBar from './detailStickyBar';
import DetailTabs from './detailTabs';
import DueUpPanel from './dueUpPanel';
import FantasyPlayersPanel from './fantasyPlayersPanel';
import type { DetailTab, DetailTabId } from './detailTabs';
import StandingsTable from './standingsTable';
import { hasBoxScoreContent } from './boxScoreColumns';
import GameDetailChart from './gameDetailChart';
import GameBoostInput from './gameBoostInput';
import GameInfoPanel from './gameInfoPanel';
import HolidayBunting from './holiday/holidayBunting';
import HolidayDrift from './holiday/holidayDrift';
import HolidayFall from './holiday/holidayFall';
import HolidayFireworks, { type fireworkVolley } from './holiday/holidayFireworks';
import HolidayLights from './holiday/holidayLights';
import HolidayStockings from '@arenaswap/ui/src/components/holidayStockings';
import LatestPlayPanel from './latestPlayPanel';
import LineupsPanel from './lineupsPanel';
import MatchupPanel from './matchupPanel';
import { hasLineups, hasMatchupContent } from '@arenaswap/sideline';
import PowerScoreBreakdown from './powerScoreBreakdown';
import PregameSetup from './pregameSetup';
import PregameStats from './pregameStats';
import BoxScore from './boxScore';
import ProTip from './proTip';
import { resolveStatus } from '@arenaswap/ui/src/components/gameSituation';
import {
	buildComponentContributionOption,
	buildLeadTrackerOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
	contributionSignalIds,
	darkChartPalette,
	lightChartPalette,
} from '@arenaswap/ui/src/components/gameDetailChartOptions';
import { resolveChartLineColors, resolveTeamColorPair } from '@arenaswap/chromatic';
import { formatCalendarDay, matchupSurfaceStyle } from '@arenaswap/ui/src/components/gameCardShared';
import { signalColorOf } from '@arenaswap/ui/src/components/scoringModeMeta';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import useSwitchCrest from '@arenaswap/ui/src/components/useSwitchCrest';
import useBasketballPossession from './useBasketballPossession';
import { signalLabel } from './factorLabels';
import useBasketballSituation from './useBasketballSituation';
import useSummaryData from './useSummaryData';
import { chartHistory, coversWholeGame } from './wrapCoverage';
import { resolveDecorations, type holidayDecorationPrefs } from '../../../utils/holidayDecorations';
import { favoriteScoreFlashColors, scoringBursts, scorelineOf, type gameScoreline } from '../../../utils/favoriteScoreFlash';
import { capitalizeReason, speakReason } from '../../../utils/powerScoreReason';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';
import type { ResolvedTheme } from '@arenaswap/core/types';

interface gameDetailViewProps {
	game: Game;
	excitementResult: LiveScore | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
	proTipsEnabled: boolean;
	gameBoosts: Record<string, number>;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
	decorationPrefs: holidayDecorationPrefs;
	decorationDate?: Date;
	disabledSignals?: readonly SignalName[];
	fantasyRoster?: readonly FantasyRosterEntry[];
	favoriteTeamIds?: ReadonlySet<string>;
	openTabs?: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	standbyStreamTabId?: number | null;
	onToggleFavoriteTeam?: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange?: (updated: TabRegistration[]) => void;
	formatTabLabel?: (tab: Browser.tabs.Tab) => string;
	tabAssignEnabled?: boolean;
	dismiss?: 'back' | 'close';
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
	theme?: ResolvedTheme;
}

const noFavorites: ReadonlySet<string> = new Set();
const noRoster: readonly FantasyRosterEntry[] = [];

const favoriteFlashMs = 5000;

const describeLead = (team: string | undefined, margin: number): string => (
	team === undefined || margin === 0 ? i18n.t('detail.leadTied') : i18n.t('detail.leadBy', { team, margin })
);

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
	fantasyRoster = noRoster,
	favoriteTeamIds = noFavorites,
	openTabs = [],
	registry = [],
	standbyStreamTabId = null,
	onToggleFavoriteTeam = () => {},
	onRegistryChange = () => {},
	formatTabLabel = tab => tab.title ?? '',
	tabAssignEnabled = true,
	dismiss = 'back',
	onSetGameBoost,
	onBack,
	theme = 'dark',
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
	const signalsSubtotal = activePowerScore?.signalsSubtotal ?? rawSubtotal;
	const breakPenalty = activePowerScore?.breakPenalty ?? 0;
	const hasBreaks = hasCommercialBreaks(game);
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeams = [game.awayTeam, game.homeTeam]
		.filter(team => favoriteTeamIds.has(createFavoriteTeamKey(game.league, team.id)))
		.map(team => team.abbreviation);
	const decorations = resolveDecorations(game, decorationDate ?? new Date(), decorationPrefs);

	const [scoreFlash, setScoreFlash] = useState<string[] | null>(null);
	const [fireworkVolley, setFireworkVolley] = useState<fireworkVolley | null>(null);
	const previousScoreline = useRef<gameScoreline | null>(null);
	const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const fireworksArmed = decorations.fireworks;
	const heroClassName = [
		decorations.fireworks && 'holiday-fireworks-stage',
		(decorations.christmas || decorations.bunting) && 'holiday-hang-from',
	].filter(Boolean).join(' ') || undefined;

	useEffect(() => {
		const colors = favoriteScoreFlashColors(previousScoreline.current, game, favoriteTeamIds);
		const bursts = fireworksArmed ? scoringBursts(previousScoreline.current, game) : [];
		previousScoreline.current = scorelineOf(game);
		if (bursts.length > 0) setFireworkVolley(volley => ({ id: (volley?.id ?? 0) + 1, bursts }));
		if (!colors) return;
		setScoreFlash(colors);
		clearTimeout(flashTimer.current);
		flashTimer.current = setTimeout(() => setScoreFlash(null), favoriteFlashMs);
	}, [game, favoriteTeamIds, fireworksArmed]);

	useEffect(() => () => clearTimeout(flashTimer.current), []);
	const currentBoost = gameBoosts[game.id] ?? 0;
	const appliedBoost = activePowerScore?.gameBoost ?? currentBoost;
	const scoringOpportunityBoost = activePowerScore?.scoringOpportunityBoost ?? 0;
	const postseasonBoost = activePowerScore?.postseasonBoost ?? 0;

	const chartPalette = theme === 'light' ? lightChartPalette : darkChartPalette;
	const locale = useDisplayLocale();
	const spokenReason = activePowerScore?.reason ? speakReason(activePowerScore, i18n.t, locale ?? 'en') : undefined;
	const reason = spokenReason ? capitalizeReason(spokenReason, locale ?? 'en') : undefined;
	useSwitchCrest(game.awayTeam, game.homeTeam);
	const [awayLineColor, homeLineColor] = resolveChartLineColors(game.awayTeam, game.homeTeam, chartPalette.surface);
	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory, chartPalette, locale)
	), [orderedPowerScoreHistory, chartPalette, locale]);
	const scoreTrendOption = useMemo(() => (
		buildTeamScoreOption(orderedScoreHistory, game, chartPalette, [awayLineColor, homeLineColor], locale)
	), [orderedScoreHistory, game, chartPalette, awayLineColor, homeLineColor, locale]);
	const componentOption = useMemo(() => (
		buildComponentContributionOption(orderedPowerScoreHistory, chartPalette, signalLabel, locale)
	), [orderedPowerScoreHistory, chartPalette, locale]);
	const componentLegendItems = useMemo(() => (
		contributionSignalIds(orderedPowerScoreHistory).map(id => ({ label: signalLabel(id), color: signalColorOf(id) }))
	), [orderedPowerScoreHistory]);
	const scoredModeId = excitementResult?.breakdown?.modeId ?? orderedPowerScoreHistory[orderedPowerScoreHistory.length - 1]?.modeId;
	const leadTrackerOption = useMemo(() => (
		scoredModeId === 'blowouts' ? buildLeadTrackerOption(orderedScoreHistory, game, chartPalette, [awayLineColor, homeLineColor], locale, describeLead) : undefined
	), [scoredModeId, orderedScoreHistory, game, chartPalette, awayLineColor, homeLineColor, locale]);
	const { winProbability, seriesInfo, records, monoLogos, boxScore, standings, gameDurationMins, matchup, tickets, venue, lineups } = useSummaryData(game);
	const basketballSituation = useBasketballSituation(game);
	const possession = useBasketballPossession(game);
	const winProbabilityOption = useMemo(() => (
		buildWinProbabilityOption(winProbability, game, chartPalette, [awayLineColor, homeLineColor])
	), [winProbability, game, chartPalette, awayLineColor, homeLineColor]);
	const winProbabilityVariance = activePowerScore?.winProbabilityVariance;
	const total = activePowerScore?.total ?? 0;

	const teamLegendItems = useMemo(() => ([
		{ label: game.awayTeam.abbreviation, color: awayLineColor },
		{ label: game.homeTeam.abbreviation, color: homeLineColor },
	]), [awayLineColor, game.awayTeam.abbreviation, game.homeTeam.abbreviation, homeLineColor]);

	const isDelayed = game.delayed === true;
	const isPreGame = game.status === 'pre';
	const isFinal = game.status === 'post';
	const showsPoster = isPreGame || game.disruption === 'postponed' || game.disruption === 'canceled';
	const chartsCoverGame = !isFinal
		|| (coversWholeGame(orderedPowerScoreHistory, game) && coversWholeGame(orderedScoreHistory, game));
	const [awayAccent, homeAccent] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const heroStyle = isHomeFirst(game)
		? matchupSurfaceStyle(homeAccent, awayAccent, isDelayed)
		: matchupSurfaceStyle(awayAccent, homeAccent, isDelayed);
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const status = resolveStatus(game, isInningSport, i18n.t);
	const totalLabel = total > scoreMaxTotal
		? i18n.t('detail.totalLabelBaseMax', { total, max: scoreMaxTotal })
		: i18n.t('detail.totalLabel', { total, max: scoreMaxTotal });

	const shellRef = useRef<HTMLDivElement>(null);
	const heroRef = useRef<HTMLDivElement>(null);
	const [heroScrolledAway, setHeroScrolledAway] = useState(false);

	useEffect(() => {
		const root = shellRef.current;
		const hero = heroRef.current;
		if (!root || !hero || typeof IntersectionObserver === 'undefined') return;
		const target = hero.querySelector('.game-detail-center, .gd-poster-teams') ?? hero;
		const barHeight = root.querySelector<HTMLElement>('.game-detail-header')?.offsetHeight ?? 0;

		const observer = new IntersectionObserver(
			entries => { for (const entry of entries) setHeroScrolledAway(!entry.isIntersecting); },
			{ root, threshold: 0, rootMargin: `-${barHeight}px 0px 0px 0px` },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [showsPoster]);

	const overviewPanel = (
		<>
		{isFinal ? (
			<>
				<FantasyPlayersPanel game={game} roster={fantasyRoster} boxScore={boxScore} />
				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} gameDurationMins={gameDurationMins} venue={venue} />
			</>
		) : isPreGame ? (
			<>
				<PregameSetup
					game={game}
					currentBoost={currentBoost}
					openTabs={openTabs}
					registry={registry}
					standbyStreamTabId={standbyStreamTabId}
					onSetGameBoost={onSetGameBoost}
					onRegistryChange={onRegistryChange}
					formatTabLabel={formatTabLabel}
					tabAssignEnabled={tabAssignEnabled}
				/>
				<PregameStats game={game} />
				<FantasyPlayersPanel game={game} roster={fantasyRoster} boxScore={boxScore} />
				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} tickets={tickets} venue={venue} />
			</>
		) : (
			<>
				<DueUpPanel game={game} awayColor={awayLineColor} homeColor={homeLineColor} />
				<LatestPlayPanel game={game} awayColor={awayLineColor} homeColor={homeLineColor} />
				<FantasyPlayersPanel game={game} roster={fantasyRoster} boxScore={boxScore} />

				<PowerScoreBreakdown
					closeness={closeness}
					lateGame={lateGame}
					momentum={momentum}
					leadChanges={leadChanges}
					comeback={comeback}
					winProbabilityVariance={winProbabilityVariance}
					signalsSubtotal={signalsSubtotal}
					breakPenalty={breakPenalty}
					hasBreaks={hasBreaks}
					favoriteBonus={favoriteBonus}
					favoriteTeams={favoriteTeams}
					currentBoost={appliedBoost}
					scoringOpportunityBoost={scoringOpportunityBoost}
					postseasonBoost={postseasonBoost}
					postseasonLabel={game?.postseasonLabel}
					totalLabel={totalLabel}
					reason={reason}
					disabledSignals={disabledSignals}
					breakdown={excitementResult?.breakdown}
					sportType={game.sportType}
				/>

				<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />

				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} venue={venue} />
			</>
		)}

		{proTipsEnabled && <ProTip context='detail' />}

		{chartsCoverGame && orderedPowerScoreHistory.length > 0 && (
			<GameDetailChart title={i18n.t('detail.chartPowerScoreTitle')} option={powerScoreOption} />
		)}

		{chartsCoverGame && orderedScoreHistory.length > 0 && (
			<GameDetailChart title={i18n.t('detail.chartScoreTitle')} option={scoreTrendOption} legendItems={teamLegendItems} />
		)}

		{chartsCoverGame && leadTrackerOption && orderedScoreHistory.length > 0 && (
			<GameDetailChart title={i18n.t('detail.chartLeadTitle')} option={leadTrackerOption} legendItems={teamLegendItems} />
		)}

		{winProbability.length > 0 && (
			<GameDetailChart title={i18n.t('detail.chartWinProbTitle')} option={winProbabilityOption} legendItems={teamLegendItems} />
		)}

		{chartsCoverGame && orderedPowerScoreHistory.length > 0 && (
			<GameDetailChart title={i18n.t('detail.chartComponentsTitle')} option={componentOption} legendItems={componentLegendItems} />
		)}
		</>
	);

	const tabs: DetailTab[] = [
		{ id: 'overview', label: i18n.t('detail.tabOverview') },
		...(isPreGame && hasMatchupContent(matchup)
			? [{ id: 'matchup' as const, label: i18n.t('detail.tabMatchup') }]
			: []),
		...(hasLineups(lineups)
			? [{ id: 'lineups' as const, label: i18n.t('detail.tabLineups') }]
			: []),
		...(!isPreGame && hasBoxScoreContent(game.sportType, boxScore)
			? [{ id: 'box' as const, label: i18n.t('box.heading') }]
			: []),
		...(standings.length > 0
			? [{ id: 'standings' as const, label: i18n.t('detail.tabStandings') }]
			: []),
	];
	const tabId = (id: DetailTabId) => `gd-tab-${game.id}-${id}`;
	const paneId = (id: DetailTabId) => `gd-pane-${game.id}-${id}`;
	const tabbed = tabs.length > 1;

	const paneFor = (id: DetailTabId) => (
		id === 'standings' ? <StandingsTable game={game} standings={standings} />
			: id === 'lineups' ? <LineupsPanel game={game} lineups={lineups} awayColor={awayAccent} homeColor={homeAccent} />
			: id === 'box' ? <BoxScore game={game} boxScore={boxScore} />
				: id === 'matchup' ? <MatchupPanel game={game} matchup={matchup} />
					: overviewPanel
	);

	return (
		<div className='popup-container game-detail-shell' ref={shellRef}>
			{decorations.falling && <HolidayFall kind={decorations.falling} theme={theme} />}
			<DetailStickyBar game={game} status={status} compact={heroScrolledAway} monoLogos={monoLogos} dismiss={dismiss} onBack={onBack} theme={theme} />
			{decorations.lights && <HolidayLights flashColors={scoreFlash} />}

			<div ref={heroRef} className={heroClassName}>
				{showsPoster ? (
					<DetailPosterHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						statusText={game.makeupDate
							? `${status.text} · ${i18n.t('gameCard.makeupDate', { date: formatCalendarDay(game.makeupDate, locale) })}`
							: status.text}
						heroStyle={heroStyle}
						awayColor={awayAccent}
						homeColor={homeAccent}
						favoriteTeamIds={favoriteTeamIds}
						onToggleFavoriteTeam={onToggleFavoriteTeam}
					/>
				) : (
					<DetailHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						monoLogos={monoLogos}
						isDelayed={isDelayed}
						isInningSport={isInningSport}
						status={status}
						heroStyle={heroStyle}
						awayColor={awayAccent}
						homeColor={homeAccent}
						basketballSituation={basketballSituation}
						possession={possession}
					/>
				)}
				{decorations.fireworks && <HolidayFireworks volley={fireworkVolley} />}
			</div>
			{decorations.christmas && <HolidayStockings game={game} awayColor={awayAccent} homeColor={homeAccent} />}
			{decorations.bunting && <HolidayBunting />}

			{tabbed && <DetailTabs tabs={tabs} tabId={tabId} paneId={paneId} />}
			{/* No `fade`. These three are one screen's worth of the same game seen three ways, not
			    three places to travel between, and crossfading them puts a beat of half-legible
			    scoreline between a tap and the table it asked for. Bootstrap reads the class to
			    decide whether to wait on a transition before revealing the pane, so dropping it is
			    what makes the swap synchronous — `show` is inert without it and is left on to match
			    what the plugin adds to every pane it activates.

			    The wrapper and the overview pane render even with one tab, so the summary arriving
			    and growing the strip does not remount the overview and replay its charts. Untabbed,
			    the pane drops its classes: a pane Bootstrap had deactivated would otherwise stay
			    hidden, since React leaves a className alone that did not change between renders. */}
			<div className='tab-content'>
				{tabs.map((tab, index) => (
					<div
						key={tab.id}
						id={paneId(tab.id)}
						className={tabbed ? `tab-pane${index === 0 ? ' show active' : ''}` : undefined}
						role={tabbed ? 'tabpanel' : undefined}
						aria-labelledby={tabbed ? tabId(tab.id) : undefined}
						tabIndex={tabbed ? 0 : undefined}
					>
						{paneFor(tab.id)}
					</div>
				))}
			</div>

			{decorations.falling && <HolidayDrift kind={decorations.falling} depth={decorations.depth} theme={theme} />}
		</div>
	);
};

export default gameDetailView;
