import type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	LeagueConfig,
	LeagueRunMinutes,
	BuiltInModeId,
	FantasySport,
	ReasonFragment,
	ScoredBoost,
	ScoredSignal,
	BlendResult,
	RivalryResult,
} from 'powerscore';
import type { PlayBreakSport } from './playBreaks';
import type { PollMode } from './pollModeTracker';
import type { CommercialBreakEntry } from './commercialBreaks';

export type ScoringModeChoice = BuiltInModeId | 'custom';

export type SignalName = 'closeness' | 'lateGame' | 'momentum' | 'leadChanges' | 'comeback';
export type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	LeagueConfig,
	LeagueRunMinutes,
	BuiltInModeId,
	FantasySport,
	ReasonFragment,
	ScoredBoost,
	ScoredSignal,
	BlendResult,
};

export interface ProbableStarter {
	name: string;
	headshot?: string;
	winLoss?: string;
	era?: string;
	line?: string;
	status?: 'expected' | 'confirmed';
}

export interface AtBatPlayer {
	id?: string;
	name: string;
	headshot?: string;
	jersey?: string;
	position?: string;
	summary?: string;
}

export interface AtBat {
	pitcher: AtBatPlayer;
	batter: AtBatPlayer;
}

export interface TeamLeader {
	category: string;
	fallbackLabel: string;
	player: string;
	value: string;
	headshot?: string;
}

export interface Team {
	id: string;
	name: string;
	nickname?: string;
	shortName?: string;
	abbreviation: string;
	score: number;
	shootoutScore?: number;
	logo?: string;
	color?: string;
	alternateColor?: string;
	record?: string;
	homeRecord?: string;
	probableStarter?: ProbableStarter;
	leaders?: TeamLeader[];
	rank?: number;
	conferenceId?: string;
	timeouts?: number;
	hits?: number;
	errors?: number;
}

export interface SeriesState {
	kind: 'playoff' | 'season';
	homeWins: number;
	awayWins: number;
	bestOf: number;
}

export interface RedCardEvent {
	teamId: string;
	minute: number;
	addedMinutes?: number;
	player?: string;
}

export interface GoalEvent {
	teamId: string;
	minute: number;
	addedMinutes?: number;
	player?: string;
	ownGoal?: boolean;
	penalty?: boolean;
}

export interface BroadcastLogo {
	logo?: string;
	darkLogo?: string;
}

export interface GameConference {
	id: string;
	shortName: string;
	crestSlug?: string;
}

export interface GameCondition {
	temperatureF: number;
	conditionLabel: string;
	conditionCode?: number;
}

export interface GameOddsProvider {
	name: string;
	logoUrl?: string;
	darkLogoUrl?: string;
}

export interface GameOdds {
	details?: string;
	overUnder?: number;
	provider?: GameOddsProvider;
}

export interface Game {
	id: string;
	league: LeagueId;
	sportType: SportType;
	homeTeam: Team;
	awayTeam: Team;
	venueName?: string;
	venueLocation?: string;
	attendance?: number;
	finalPeriodSuffix?: string;
	period: number;
	clockSeconds: number;
	clockStoppageMinutes?: number;
	clockTenths?: number;
	status: 'pre' | 'in' | 'post';
	startTime?: string;
	broadcasts?: string[];
	odds?: GameOdds;
	intermission?: boolean;
	topOfInning?: boolean;
	inningEnded?: boolean;
	inningBreak?: boolean;
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	bso?: { balls: number; strikes: number; outs: number };
	atBat?: AtBat;
	dueUp?: AtBatPlayer[];
	lastPlay?: string;
	lastPlayDrive?: string;
	homeWinProbability?: number;
	lastPlayId?: string;
	lastPlayType?: string;
	lastPlayTeamId?: string;
	downDistance?: string;
	fieldPosition?: string;
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	isGoalToGo?: boolean;
	yardLine?: number;
	possessionTeamId?: string;
	possessionSide?: 'home' | 'away';
	driveStartYardLine?: number;
	weather?: GameCondition;
	isPostseason?: boolean;
	postseasonRound?: 0 | 1 | 2 | 3;
	postseasonLabel?: string;
	isPreseason?: boolean;
	delayed?: boolean;
	delayDescription?: string;
	delayKind?: 'rain' | 'weather' | 'other';
	disruption?: 'postponed' | 'suspended' | 'forfeit';
	postponedReason?: 'rain' | 'weather' | 'airQuality' | 'travel';
	makeupDate?: string;
	forfeitWinnerId?: string;
	doubleheaderGame?: 1 | 2;
	isMakeup?: boolean;
	collegeGroups?: string[];
	collegeTitleRound?: boolean;
	collegeSeeded?: boolean;
	series?: SeriesState;
	redCardEvents?: RedCardEvent[];
	goalEvents?: GoalEvent[];
	broadcastLogos?: Record<string, BroadcastLogo>;
	neutralSite?: boolean;
	conference?: GameConference;
}

export type FinishedTabAction = 'keep' | 'free' | 'close';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	cooldownSeconds: number;
	switchDelaySeconds: number;
	contentAwareSwitching: boolean;
	enabled: boolean;
	enabledLeagues: LeagueId[];
	favoriteTeamIds: string[];
	favoriteTeamBonusPoints: number;
	rivalTeamIds: string[];
	showUpcomingGames: boolean;
	groupByLeague: boolean;
	keepFinalGames: boolean;
	finishedTabAction: FinishedTabAction;
	proTipsEnabled: boolean;
	notificationsEnabled: boolean;
	bossDecoyUrl: string;
	standbyStreamEnabled: boolean;
	standbyStreamThreshold: number;
	multiviewEnabled: boolean;
	multiviewThreshold: number;
	multiviewGames: 'hot' | 'all';
	multiviewMaxBoxes: number;
	bettingEnabled: boolean;
	temperatureUnit: 'F' | 'C' | 'Ro';
	romerUnlocked: boolean;
	openRevealEnabled: boolean;
	theme: ThemePreference;
	holidayDecorationsEnabled: boolean;
	holidaySnowEnabled: boolean;
	holidayLightsEnabled: boolean;
	holidayLeavesEnabled: boolean;
	holidayChristmasEnabled: boolean;
	holidayBuntingEnabled: boolean;
	holidayFireworksEnabled: boolean;
	postseasonBoostPoints: number;
	upcomingGamesDays: number;
	disabledSignals: SignalName[];
	scoringMode: ScoringModeChoice;
	leagueModes: Partial<Record<LeagueId, BuiltInModeId>>;
	modeDisabledSignals: Partial<Record<Exclude<BuiltInModeId, 'classic'>, string[]>>;
	fantasyBlend: number;
	fantasyScoring: Partial<Record<FantasySport, Partial<Record<string, number>>>>;
	collegeFilters: CollegeFilterMap;
}

export type CollegeLeagueId = Extract<LeagueId, 'ncaaf' | 'ncaab' | 'ncaaw' | 'ncaamh' | 'cbase' | 'csoft'>;

export interface CollegeFilter {
	divisions: string[];
	conferences: string[];
	ranked: boolean;
	titleRounds: boolean;
}

export type CollegeFilterMap = Partial<Record<CollegeLeagueId, CollegeFilter>>;

export interface ConferenceEntry {
	id: string;
	name: string;
	shortName: string;
	divisionKey: string;
	crestSlug?: string;
}

export interface ConferenceDirectory {
	leagueId: CollegeLeagueId;
	seasonYear: number;
	conferences: ConferenceEntry[];
	teamConference: Record<string, string>;
	teamDivision: Record<string, string>;
	fetchedAt: number;
}

export interface TabRegistration {
	tabId: number;
	gameId: string;
}

export type LeagueLogoMap = Partial<Record<LeagueId, string>>;

export interface LeagueSchedule {
	startsAt?: number;
	endsAt?: number;
}

export type LeagueScheduleMap = Partial<Record<LeagueId, LeagueSchedule>>;

export interface TeamMonoMarks {
	white?: string;
	black?: string;
}

export type TeamMonoLogoMap = Partial<Record<LeagueId, Record<string, TeamMonoMarks>>>;
export type ScoreHistoryMap = Record<string, ScoreSnapshot[]>;

export interface PowerScoreSnapshot {
	gameId: string;
	timestamp: number;
	total: number;
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	winProbabilityVariance?: number;
	signalsSubtotal: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	gameBoost?: number;
	scoringOpportunityBoost?: number;
	postseasonBoost?: number;
	onBreak?: boolean;
	breakPenalty?: number;
	reason: string;
	modeId?: string;
	signals?: Record<string, number>;
	boosts?: Record<string, number>;
	reasons?: ReasonFragment[];
}

export interface ScoreBreakdown {
	modeId: string;
	signals: ScoredSignal[];
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	frozen: boolean;
	scaledSubtotal: number;
	signalCeiling: number;
	classicTotal?: number;
	blend?: BlendResult;
	rivalry?: RivalryResult;
}

export interface LiveScore extends PowerScoreResult {
	breakdown?: ScoreBreakdown;
}

export type PowerScoreHistoryMap = Record<string, PowerScoreSnapshot[]>;

export type LeagueLastGoodAt = Partial<Record<LeagueId, number>>;

export interface BackgroundState {
	games: Game[];
	scores: PowerScoreResult[];
	leagueLogos: LeagueLogoMap;
	scoreHistory: ScoreHistoryMap;
	powerScoreHistory: PowerScoreHistoryMap;
	gameBoosts: Record<string, number>;
	onStandbyStream: boolean;
	standbyStreamTabId: number | null;
	slateShedLeagues: LeagueId[];
	leagueLastGoodAt: LeagueLastGoodAt;
	heldSwitch: { gameId: string; sport: PlayBreakSport } | null;
}

export interface ScoresUpdatedMessage extends BackgroundState {
	type: 'SCORES_UPDATED';
}

export interface UpdatePrefsMessage {
	type: 'UPDATE_PREFS';
	prefs: UserPreferences;
}

export interface UpdateRegistryMessage {
	type: 'UPDATE_REGISTRY';
	tabRegistry: TabRegistration[];
}

export interface SetGameBoostMessage {
	type: 'SET_GAME_BOOST';
	gameId: string;
	boost: number;
}

export interface GetStateMessage {
	type: 'GET_STATE';
	forceRefresh?: boolean;
}

export interface SetDemoModeMessage {
	type: 'SET_DEMO_MODE';
	enabled: boolean;
}

export interface SetStandbyStreamTabMessage {
	type: 'SET_STANDBY_STREAM_TAB';
	tabId: number | null;
}

export interface MultiviewBox {
	gameId: string;
	url: string;
}

export interface MultiviewLineup {
	boxes: MultiviewBox[];
	featuredGameId: string | null;
	solo: boolean;
	games: Game[];
}

export interface GetMultiviewMessage {
	type: 'GET_MULTIVIEW';
}

export interface MultiviewUpdatedMessage extends MultiviewLineup {
	type: 'MULTIVIEW_UPDATED';
	tabId: number;
}

export interface MultiviewReadyMessage {
	type: 'MULTIVIEW_READY';
	gameIds: string[];
}

export interface MultiviewFrameStatusMessage {
	type: 'MULTIVIEW_FRAME_STATUS';
	name: string;
	firstLevel: boolean;
	href: string;
	playing: boolean;
	paused: boolean;
	time: number;
}

export interface MultiviewMuteMessage {
	type: 'MULTIVIEW_MUTE';
	muted: boolean;
}

export interface BossButtonMessage {
	type: 'BOSS_BUTTON';
}

export interface GetDebugStateMessage {
	type: 'GET_DEBUG_STATE';
}

export interface GetGuideSlateMessage {
	type: 'GET_GUIDE_SLATE';
	force?: boolean;
}

export interface GuideSlate {
	games: Game[];
	refused?: boolean;
	leagueLogos: LeagueLogoMap;
	monoLogos: TeamMonoLogoMap;
	gameBoosts: Record<string, number>;
	endTimes: Record<string, number>;
}

export interface GuideSlateUpdatedMessage {
	type: 'GUIDE_SLATE_UPDATED';
}

export interface DebugState {
	pollModes: Record<string, PollMode>;
	leagueIntervals: Record<string, number>;
	demoMode: boolean;
	lastSwitchTime: number;
	pendingSwitch: { gameId: string; tabId: number; reason?: string } | null;
	heldSwitch: { gameId: string; tabId: number; leavingGameId: string; holdUntil: number } | null;
	liveGameCount: number;
	upcomingGameCount: number;
	totalGameCount: number;
	tabRegistry: TabRegistration[];
	onStandbyStream: boolean;
	standbyStreamTabId: number | null;
	commercialBreaks: Record<string, CommercialBreakEntry>;
	scores: PowerScoreResult[];
	gameLabels: Record<string, string>;
	enabledLeagues: string[];
	sensitivity: number;
	cooldownSeconds: number;
	switchDelaySeconds: number;
	contentAwareSwitching: boolean;
}

export type ExtensionMessage =
	| ScoresUpdatedMessage
	| UpdatePrefsMessage
	| UpdateRegistryMessage
	| SetGameBoostMessage
	| GetStateMessage
	| SetDemoModeMessage
	| SetStandbyStreamTabMessage
	| BossButtonMessage
	| GetDebugStateMessage
	| GetGuideSlateMessage
	| GuideSlateUpdatedMessage
	| GetMultiviewMessage
	| MultiviewUpdatedMessage
	| MultiviewReadyMessage
	| MultiviewFrameStatusMessage
	| MultiviewMuteMessage;
