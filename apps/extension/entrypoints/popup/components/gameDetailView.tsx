import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { leagueConfigMap, scoreMaxTotal, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot, SignalName, TabRegistration } from '@arenaswap/core/types';
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
import PowerScoreBreakdown from './powerScoreBreakdown';
import PregameSetup from './pregameSetup';
import PregameStats from './pregameStats';
import BoxScore from './boxScore';
import ProTip from './proTip';
import { resolveStatus } from './gameSituation';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from './gameDetailChartOptions';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import useSummaryData from './useSummaryData';
import { chartHistory, coversWholeGame } from './wrapCoverage';
import { resolveDecorations, type holidayDecorationPrefs } from '../../../utils/holidayDecorations';
import { favoriteScoreFlashColors, scorelineOf, type gameScoreline } from '../../../utils/favoriteScoreFlash';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';

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
	// Pre-game only: the setup card and the poster's favourite stars need these. They are
	// optional so the live screen, and anything mounting it, is unaffected.
	favoriteTeamIds?: ReadonlySet<string>;
	openTabs?: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	onToggleFavoriteTeam?: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange?: (updated: TabRegistration[]) => void;
	formatTabLabel?: (tab: Browser.tabs.Tab) => string;
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
}

const noFavorites: ReadonlySet<string> = new Set();

const favoriteFlashMs = 5000;

// The signal palette belongs to the PowerScore breakdown card above this chart, so momentum
// keeps that card's #2274a5 rather than the dark-surface $secondary. Same signal, one colour.
const componentLegendItems = [
	{ label: i18n.t('detail.legendCloseness'), color: '#22c55e' },
	{ label: i18n.t('detail.legendLateGame'), color: '#f75c03' },
	{ label: i18n.t('detail.legendMomentum'), color: '#2274a5' },
	{ label: i18n.t('detail.legendLeadChanges'), color: '#f1c40f' },
	{ label: i18n.t('detail.legendComeback'), color: '#d90368' },
];

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
	onSetGameBoost,
	onBack,
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
	const reason = activePowerScore?.reason ?? 'Best Available';

	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);
	const scoreTrendOption = useMemo(() => (
		buildTeamScoreOption(orderedScoreHistory, game)
	), [orderedScoreHistory, game]);
	const componentOption = useMemo(() => (
		buildComponentContributionOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);
	const { winProbability, seriesInfo, records, monoLogos, boxScore, standings, gameDurationMins } = useSummaryData(game);
	const winProbabilityOption = useMemo(() => (
		buildWinProbabilityOption(winProbability, game)
	), [winProbability, game]);
	// Read from the scorer, not recomputed from the line fetched above: that would put a different
	// number here than on the card you tapped. Undefined means ESPN gave too little data.
	const winProbabilityVariance = activePowerScore?.winProbabilityVariance;
	const total = activePowerScore?.total ?? 0;

	const [awayLineColor, homeLineColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', true);
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
	// One hero surface for all three states: a band of the two teams' colours with a dark scrim over
	// them — over, not under, so white type stays readable against a pale team colour without this
	// having to know which colours those are. A delay tints the scrim yellow rather than draining
	// the hero, which is what the white card used to do with an opacity.
	const heroStyle = {
		backgroundImage: isDelayed
			? 'linear-gradient(180deg, rgba(28, 22, 3, 0.34) 0%, rgba(28, 22, 3, 0.62) 100%), '
				+ `linear-gradient(to right, ${awayAccent} 0%, ${awayAccent} 38%, ${homeAccent} 62%, ${homeAccent} 100%)`
			: 'linear-gradient(180deg, rgba(3, 7, 12, 0.18) 0%, rgba(3, 7, 12, 0.52) 100%), '
				+ `linear-gradient(to right, ${awayAccent} 0%, ${awayAccent} 38%, ${homeAccent} 62%, ${homeAccent} 100%)`,
	};
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const status = resolveStatus(game, isInningSport, i18n.t);
	const totalLabel = total > scoreMaxTotal
		? i18n.t('detail.totalLabelBaseMax', { total, max: scoreMaxTotal })
		: i18n.t('detail.totalLabel', { total, max: scoreMaxTotal });

	// Observing the card itself rather than a scroll offset keeps the sticky-bar handoff exact at
	// any hero height — pre-game, inning sports and postseason all differ.
	const shellRef = useRef<HTMLDivElement>(null);
	const heroRef = useRef<HTMLDivElement>(null);
	const [heroScrolledAway, setHeroScrolledAway] = useState(false);

	useEffect(() => {
		const root = shellRef.current;
		const target = heroRef.current;
		if (!root || !target || typeof IntersectionObserver === 'undefined') return;

		const observer = new IntersectionObserver(
			entries => { for (const entry of entries) setHeroScrolledAway(!entry.isIntersecting); },
			{ root, threshold: 0 },
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, []);

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
				/>
				<PregameStats game={game} />
				<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} />
			</>
		) : (
			<>
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
					reason={reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : undefined}
					disabledSignals={disabledSignals}
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
				: overviewPanel
	);

	return (
		<div className='popup-container game-detail-shell' ref={shellRef}>
			{decorations.falling && <HolidayFall kind={decorations.falling} />}
			<DetailStickyBar game={game} status={status} compact={heroScrolledAway} monoLogos={monoLogos} onBack={onBack} />
			{decorations.lights && <HolidayLights flashColors={scoreFlash} />}

			<div ref={heroRef}>
				{isPreGame ? (
					<DetailPosterHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						monoLogos={monoLogos}
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

			{tabbed ? (
				<>
					<DetailTabs tabs={tabs} tabId={tabId} paneId={paneId} />
					<div className='tab-content'>
						{tabs.map((tab, index) => (
							<div
								key={tab.id}
								id={paneId(tab.id)}
								className={`tab-pane fade${index === 0 ? ' show active' : ''}`}
								role='tabpanel'
								aria-labelledby={tabId(tab.id)}
								tabIndex={0}
							>
								{paneFor(tab.id)}
							</div>
						))}
					</div>
				</>
			) : overviewPanel}

			{decorations.falling && <HolidayDrift kind={decorations.falling} depth={decorations.depth} />}
		</div>
	);
};

export default gameDetailView;
