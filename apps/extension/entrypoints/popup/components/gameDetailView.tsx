import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { leagueConfigMap, scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot, SignalName, TabRegistration } from '@arenaswap/core/types';
import DetailHero from './detailHero';
import DetailPosterHero from './detailPosterHero';
import DetailStickyBar from './detailStickyBar';
import GameDetailChart from './gameDetailChart';
import GameBoostInput from './gameBoostInput';
import GameInfoPanel from './gameInfoPanel';
import PowerScoreBreakdown from './powerScoreBreakdown';
import PregameSetup from './pregameSetup';
import ProTip from './proTip';
import { resolveStatusText } from './gameSituation';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from './gameDetailChartOptions';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import useSummaryData from './useSummaryData';
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

const componentLegendItems = [
	{ label: i18n.t('detail.legendCloseness'), color: '#22c55e' },
	{ label: i18n.t('detail.legendLateGame'), color: '#f75c03' },
	{ label: i18n.t('detail.legendMomentum'), color: '#2274a5' },
	{ label: i18n.t('detail.legendLeadChanges'), color: '#f1c40f' },
	{ label: i18n.t('detail.legendComeback'), color: '#d90368' },
];

const withMatchupAlpha = (color: string, fallback: string): string => (
	/^#[\da-fA-F]{6}$/.test(color) ? `${color}28` : fallback
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
		() => scoreHistory.toSorted((a, b) => a.timestamp - b.timestamp),
		[scoreHistory],
	);
	const orderedPowerScoreHistory = useMemo(
		() => powerScoreHistory.toSorted((a, b) => a.timestamp - b.timestamp),
		[powerScoreHistory],
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
	const baseTotal = activePowerScore?.baseTotal ?? rawSubtotal;
	const stallPenalty = activePowerScore?.stallPenalty ?? 0;
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const currentBoost = gameBoosts[game.id] ?? 0;
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
	const { winProbability, seriesInfo, records } = useSummaryData(game);
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
	const [awayAccent, homeAccent] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const matchupCardStyle = isDelayed ? {
		borderLeft: '5px solid #F1C40F',
		borderRight: '5px solid #F1C40F',
		background: 'linear-gradient(to right, rgba(241,196,15,0.12), rgba(241,196,15,0.12)), #ffffff',
	} : {
		borderLeft: `5px solid ${awayAccent}`,
		borderRight: `5px solid ${homeAccent}`,
		background: `linear-gradient(to right, ${withMatchupAlpha(awayAccent, '#dee2e628')}, ${withMatchupAlpha(homeAccent, '#dee2e628')}), #ffffff`,
	};
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const statusText = resolveStatusText(game, isInningSport, i18n.t);
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

	return (
		<div className='popup-container game-detail-shell' ref={shellRef}>
			<DetailStickyBar game={game} statusText={statusText} compact={heroScrolledAway} onBack={onBack} />

			<div ref={heroRef}>
				{isPreGame ? (
					<DetailPosterHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						statusText={statusText}
						favoriteTeamIds={favoriteTeamIds}
						onToggleFavoriteTeam={onToggleFavoriteTeam}
					/>
				) : (
					<DetailHero
						game={game}
						seriesInfo={seriesInfo}
						records={records}
						isDelayed={isDelayed}
						isInningSport={isInningSport}
						statusText={statusText}
						heroStyle={matchupCardStyle}
					/>
				)}
			</div>

			{/* Nothing has happened yet, so there is no PowerScore to break down — every signal
			    would read zero. The screen offers what you can actually decide in advance instead. */}
			{isPreGame ? (
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
						baseTotal={baseTotal}
						stallPenalty={stallPenalty}
						favoriteBonus={favoriteBonus}
						favoriteTeamCount={favoriteTeamCount}
						currentBoost={currentBoost}
						scoringOpportunityBoost={scoringOpportunityBoost}
						postseasonBoost={postseasonBoost}
						totalLabel={totalLabel}
						reason={reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : undefined}
						disabledSignals={disabledSignals}
					/>

					<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />

					<GameInfoPanel game={game} bettingPrefs={bettingPrefs} weatherPrefs={weatherPrefs} />
				</>
			)}

			{proTipsEnabled && <ProTip context='detail' />}

			{orderedPowerScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartPowerScoreTitle')} option={powerScoreOption} />
			)}

			{orderedScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartScoreTitle')} option={scoreTrendOption} legendItems={teamLegendItems} />
			)}

			{winProbability.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartWinProbTitle')} option={winProbabilityOption} legendItems={teamLegendItems} />
			)}

			{orderedPowerScoreHistory.length > 0 && (
				<GameDetailChart title={i18n.t('detail.chartComponentsTitle')} option={componentOption} legendItems={componentLegendItems} />
			)}
		</div>
	);
};

export default gameDetailView;
