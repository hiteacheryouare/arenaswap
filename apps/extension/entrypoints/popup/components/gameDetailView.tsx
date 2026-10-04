import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { leagueConfigMap, scoreMaxTotal, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, LiveScore, PowerScoreSnapshot, ScoreSnapshot, SignalName, TabRegistration } from '@arenaswap/core/types';
import DetailHero from './detailHero';
import DetailPosterHero from './detailPosterHero';
import DetailStickyBar from './detailStickyBar';
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
import MatchupPanel from './matchupPanel';
import { hasMatchupContent } from './matchupParse';
import PowerScoreBreakdown from './powerScoreBreakdown';
import PregameSetup from './pregameSetup';
import PregameStats from './pregameStats';
import BoxScore from './boxScore';
import ProTip from './proTip';
import { resolveStatus } from './gameSituation';
import {
	buildComponentContributionOption,
	buildLeadTrackerOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
	contributionSignalIds,
	darkChartPalette,
	lightChartPalette,
} from './gameDetailChartOptions';
import { resolveChartLineColors, resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import { matchupSurfaceStyle } from '@arenaswap/ui/src/components/gameCardShared';
import { boostPresentation, isBoostId, isModeSignalId, signalColorOf, signalPresentation } from '@arenaswap/ui/src/components/scoringModeMeta';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import useSwitchCrest from '@arenaswap/ui/src/components/useSwitchCrest';
import useSummaryData from './useSummaryData';
import { chartHistory, coversWholeGame } from './wrapCoverage';
import { resolveDecorations, type holidayDecorationPrefs } from '../../../utils/holidayDecorations';
import { favoriteScoreFlashColors, scorelineOf, type gameScoreline } from '../../../utils/favoriteScoreFlash';
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
	// Demo mode borrows a date so the calendar-gated decorations are reachable in September.
	decorationDate?: Date;
	disabledSignals?: readonly SignalName[];
	// Pre-game only: the setup card and the poster's favourite stars need these. They are
	// optional so the live screen, and anything mounting it, is unaffected.
	favoriteTeamIds?: ReadonlySet<string>;
	openTabs?: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	onToggleFavoriteTeam?: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange?: (updated: TabRegistration[]) => void;
	formatTabLabel?: (tab: Browser.tabs.Tab) => string;
	tabAssignEnabled?: boolean;
	// A panel beside a page closes; a screen in the popup goes back to the list it came from.
	dismiss?: 'back' | 'close';
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
	theme?: ResolvedTheme;
}

const noFavorites: ReadonlySet<string> = new Set();

const favoriteFlashMs = 5000;

// The legend and the chart's tooltip print the same names, so a hover reads in the same language
// as the swatches under it.
const signalLabel = (id: string): string => (isModeSignalId(id) ? i18n.t(signalPresentation[id].labelKey) : id);
const boostLabel = (id: string): string => (isBoostId(id) ? i18n.t(boostPresentation[id].labelKey) : id);
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
	favoriteTeamIds = noFavorites,
	openTabs = [],
	registry = [],
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
	// When stalled this is the pre-stall signals sum stored by the scorer, which may exceed 100.
	const signalsSubtotal = activePowerScore?.signalsSubtotal ?? rawSubtotal;
	const stallPenalty = activePowerScore?.stallPenalty ?? 0;
	// Baseball/softball never accumulate a stall count (background.ts only tracks clock-based
	// sports), so the breakdown hides the row entirely rather than pinning it at zero. Falls back to
	// basketball for an unrecognized sportType, mirroring computePowerScore's own fallback.
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
	// keeps showing the stored value, since the setting survives halftime even though it pays nothing.
	const appliedBoost = activePowerScore?.gameBoost ?? currentBoost;
	const scoringOpportunityBoost = activePowerScore?.scoringOpportunityBoost ?? 0;
	const postseasonBoost = activePowerScore?.postseasonBoost ?? 0;

	const chartPalette = theme === 'light' ? lightChartPalette : darkChartPalette;
	const locale = useDisplayLocale();
	// The scorer writes its reason in English. Another language gets it rebuilt from locale strings,
	// or not at all when a fragment has no translation; until a score arrives there is nothing to say.
	const spokenReason = activePowerScore?.reason ? speakReason(activePowerScore, i18n.t, locale ?? 'en') : undefined;
	const reason = spokenReason ? capitalizeReason(spokenReason, locale ?? 'en') : undefined;
	// Before the charts, and handed to them: a clash that needs a colour read off a crest lands on a
	// render with the same `game`, and a chart memoised on `game` alone would keep the old line.
	useSwitchCrest(game.awayTeam, game.homeTeam);
	const [awayLineColor, homeLineColor] = resolveChartLineColors(game.awayTeam, game.homeTeam, chartPalette.surface);
	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory, chartPalette, locale, boostLabel)
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
	// Only a game Blowouts is scoring gets the lead tracker: the margin is what that mode is about.
	const scoredModeId = excitementResult?.breakdown?.modeId ?? orderedPowerScoreHistory[orderedPowerScoreHistory.length - 1]?.modeId;
	const leadTrackerOption = useMemo(() => (
		scoredModeId === 'blowouts' ? buildLeadTrackerOption(orderedScoreHistory, game, chartPalette, [awayLineColor, homeLineColor], locale, describeLead) : undefined
	), [scoredModeId, orderedScoreHistory, game, chartPalette, awayLineColor, homeLineColor, locale]);
	const { winProbability, seriesInfo, records, monoLogos, boxScore, standings, gameDurationMins, matchup, tickets } = useSummaryData(game);
	const winProbabilityOption = useMemo(() => (
		buildWinProbabilityOption(winProbability, game, chartPalette, [awayLineColor, homeLineColor])
	), [winProbability, game, chartPalette, awayLineColor, homeLineColor]);
	// Read from the scorer, not recomputed from the line fetched above: that would put a different
	// number here than on the card you tapped. Undefined means ESPN gave too little data.
	const winProbabilityVariance = activePowerScore?.winProbabilityVariance;
	const total = activePowerScore?.total ?? 0;

	const teamLegendItems = useMemo(() => ([
		{ label: game.awayTeam.abbreviation, color: awayLineColor },
		{ label: game.homeTeam.abbreviation, color: homeLineColor },
	]), [awayLineColor, game.awayTeam.abbreviation, game.homeTeam.abbreviation, homeLineColor]);

	const isDelayed = game.delayed === true;
	const isPreGame = game.status === 'pre';
	const isFinal = game.status === 'post';
	// A wrap draws a chart only when its line covers the whole game. The win-probability line is
	// exempt because it is not ours: ESPN builds it from the full play-by-play, so it either
	// arrives complete or does not arrive.
	const chartsCoverGame = !isFinal
		|| (coversWholeGame(orderedPowerScoreHistory, game) && coversWholeGame(orderedScoreHistory, game));
	const [awayAccent, homeAccent] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	// One hero surface for all three states, and the same one the list card is painted with: the two
	// teams' colours under a shade, with each side written in whichever ink reads on its colour.
	const heroStyle = matchupSurfaceStyle(awayAccent, homeAccent, isDelayed);
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const status = resolveStatus(game, isInningSport, i18n.t);
	const totalLabel = total > scoreMaxTotal
		? i18n.t('detail.totalLabelBaseMax', { total, max: scoreMaxTotal })
		: i18n.t('detail.totalLabel', { total, max: scoreMaxTotal });

	// Observing the scoreline itself rather than a scroll offset keeps the sticky-bar handoff exact
	// at any hero height — pre-game, inning sports and postseason all differ. It is the scoreline
	// and not the whole hero, and the root is trimmed by the bar, so the compact matchup arrives as
	// the score slides under the bar rather than once the at-bat panel or field strip below it has.
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
	}, [isPreGame]);

	// Everything that is not the box score or the table: the PowerScore and what explains
	// it, what is happening in the game, and where it is being played. Lifted out of the
	// panel below so the tab markup stays legible as tab markup.
	const overviewPanel = (
		<>
		{/* Nothing has happened yet, so there is no PowerScore to break down — every signal
		    would read zero. The screen offers what you can actually decide in advance instead. */}
		{isFinal ? (
			<>
				{/* No PowerScore anywhere on a wrap. The number is a live judgement about what to
				    watch next, and a game that is over is not a candidate — printing its last
				    value would read as a verdict on the game rather than as the switching signal
				    it actually was. The boost input goes for the same reason: it can only ever
				    change a score that will never be computed again. */}
				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} gameDurationMins={gameDurationMins} />
			</>
		) : isPreGame ? (
			<>
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
				<PregameStats game={game} />
				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} tickets={tickets} />
			</>
		) : (
			<>
				{/* First, and deliberately not next to the info panel: what just happened is
				    the most time-sensitive thing on this screen, and putting it beside the
				    venue and the networks is what made it read as venue chrome on the card. */}
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
					postseasonLabel={game?.postseasonLabel}
					totalLabel={totalLabel}
					reason={reason}
					disabledSignals={disabledSignals}
					breakdown={excitementResult?.breakdown}
				/>

				<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />

				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} />
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

	// A tab is offered only once there is something behind it. Both of the optional two arrive
	// with the `/summary` fetch, so the strip grows from nothing to its final shape a moment
	// after the screen opens — and stays absent for the leagues that never fill either one.
	const tabs: DetailTab[] = [
		{ id: 'overview', label: i18n.t('detail.tabOverview') },
		...(isPreGame && hasMatchupContent(matchup)
			? [{ id: 'matchup' as const, label: i18n.t('detail.tabMatchup') }]
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
	// One tab is not a choice, so there is no strip and the overview is simply the screen.
	const tabbed = tabs.length > 1;

	const paneFor = (id: DetailTabId) => (
		id === 'standings' ? <StandingsTable game={game} standings={standings} />
			: id === 'box' ? <BoxScore game={game} boxScore={boxScore} />
				: id === 'matchup' ? <MatchupPanel game={game} matchup={matchup} />
					: overviewPanel
	);

	return (
		<div className='popup-container game-detail-shell' ref={shellRef}>
			{decorations.falling && <HolidayFall kind={decorations.falling} theme={theme} />}
			<DetailStickyBar game={game} status={status} compact={heroScrolledAway} monoLogos={monoLogos} dismiss={dismiss} onBack={onBack} theme={theme} />
			{decorations.lights && <HolidayLights flashColors={scoreFlash} />}

			<div ref={heroRef}>
				{isPreGame ? (
					<DetailPosterHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						statusText={status.text}
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
					/>
				)}
			</div>

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
