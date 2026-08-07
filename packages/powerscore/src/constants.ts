import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

// Sorted descending so the first matching step wins. At a 15s poll interval, 8 polls is roughly
// when a commercial starts and 15 polls an extended break.
export const stallPenaltySteps: { minPolls: number; deduction: number }[] = [
	{ minPolls: 15, deduction: 25 },
	{ minPolls: 8,  deduction: 15 },
];

// Indexed by runner count (0–3).
export const scoringOpportunityBaseRunnerBoosts: [number, number, number, number] = [0, 3, 6, 10];

// Scaled by how close the game is: a drive inside the 20 while up 30 carries no stakes. Tiers key
// off the sport's own closenessMargins so there is one definition of "blowout" per sport.
export const scoringOpportunityRedZoneBoost = 10; // margin ≤ t2
export const scoringOpportunityRedZoneFringeBoost = 5; // t2 < margin ≤ t3; above t3 pays nothing

// One combined lookup rather than separate down and goal-to-go factors multiplied together: the
// two describe the same situation, so stacking them double-counts. Goal-to-go raises the
// likelihood of a score, not the tension — 4th down is what decides possession.
export const redZoneDownMultipliers = {
	fourthDownGoalToGo: 1.5,
	fourthDown: 1.35,
	thirdAndShort: 1.15,
	other: 1,
} as const;

export const thirdAndShortDistance = 3;

// These deliberately sum to more than 100. The headline total is capped at scoreMaxTotal, so a
// genuinely exciting game stacks into the 80s/90s and a classic saturates, which is what lets
// PowerScore use its full range instead of compressing every game into the bottom two-thirds.
export const scoreMaxCloseness = 42;
export const scoreMaxLateGame = 38;
export const scoreMaxMomentum = 38;
export const scoreMaxLeadChanges = 18;
export const scoreMaxComeback = 20;
// Applied on top of the signals, as both a boost and a penalty.
export const scoreWinProbVarianceMax = 5;
export const scoreMaxTotal = 100;

// `baseTotal` is the raw pre-cap sum, so it has to be allowed past scoreMaxTotal — clamping it to
// 100 would make the breakdown's stall arithmetic disagree with the total it explains.
export const scoreMaxSignalsSubtotal =
	scoreMaxCloseness + scoreMaxLateGame + scoreMaxMomentum + scoreMaxLeadChanges + scoreMaxComeback;

// Also anchors otPreBoostMax (scoreMaxLateGame − this), so the symbolic reference keeps them in sync.
const lateGameCloseCeiling = 36;

export const scorerTunables: ScorerTunables = {
	scores: {
		// Ceilings reached at the end of regulation, not the realized score: that is
		// closenessFlatFloor + (tier − floor) * gameProgress^0.55.
		closeness: {
			tied: scoreMaxCloseness,
			tight: 34,
			zeroZero: 22,
			close: 20,
			fringe: 8,
			none: 0,
		},
		// Clamped to the tier ceiling inside applyProgressFloor, so fringe (8) still stays at 8.
		closenessFlatFloor: 12,
		lateGame: {
			overtime: scoreMaxLateGame,
			// Per-closeness-tier ceilings for the final-period regulation ramp.
			closeCeiling: lateGameCloseCeiling,
			fringeCeiling: 22,
			blowoutCeiling: 15,
			// The prior period carries a gentle touch so the period boundary is smooth.
			finalPeriodStart: 3,
			previousPeriodTouch: 3,
			otPreBoostMax: scoreMaxLateGame - lateGameCloseCeiling,
			none: 0,
		},
		// Spike ceilings; sport-scaled decay is applied after.
		momentum: {
			bigRun: scoreMaxMomentum,
			smallRun: 20,
			none: 0,
		},
		leadChanges: {
			multiple: scoreMaxLeadChanges,
			single: 12,
			none: 0,
		},
		// Progress-scaled like closeness, then decayed like the rest of the cluster.
		comeback: {
			big: scoreMaxComeback,
			moderate: 11,
			flatFloor: 2,
			none: 0,
		},
		// Average absolute distance from 50% maps to [−max, +max]: lines that hug 50% earn the
		// boost, a dominated game the penalty. A line held steadily at ~85% saturates maxAvgDist.
		winProbabilityVariance: {
			maxAvgDist: 0.35,
			minDataPoints: 5,
		},
	},
	reasons: {
		tied: "it's tied",
		closenessUnitBySportType: {
			hockey: 'goal',
			soccer: 'goal',
			baseball: 'run',
			softball: 'run',
		},
		defaultClosenessUnit: 'point',
		closenessGameSuffix: 'game',
		overtime: 'overtime',
		extraInnings: 'extra innings',
		inningSuffix: 'inning',
		clockLeftSuffix: 'left',
		underPrefix: 'under',
		minutesLeftSuffix: 'min left',
		overtimeAnticipation: 'tied — overtime looming',
		momentumRunSuffix: 'run',
		momentumRolling: 'on a roll',
		leadChangeMultiple: 'trading leads',
		leadChangeSingle: 'just took the lead',
		fallback: 'best game available',
	},
};

export const sportTypeConfigs: SportTypeConfig[] = [
	{
		id: 'basketball',
		clockBased: true,
		closenessMargins: [5, 10, 18],
		momentumBigRun: 8,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 6,
		comebackThresholdSmall: 3,
		// Basketball scores constantly — short half-lives keep the graph jumpy and reactive.
		decayHalfLifeMs: { momentum: 45_000, leadChange: 60_000, comeback: 60_000 },
		otPreBoostWindowSecs: 60,
		// 4 × 60s (max half-life) = 240s; rounded up to 5 min for headroom.
		historyWindowMs: 300_000,
	},
	{
		id: 'hockey',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1, 2],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		// Goals are rare — long half-lives let a single goal's spike linger across many quiet polls.
		decayHalfLifeMs: { momentum: 180_000, leadChange: 240_000, comeback: 240_000 },
		otPreBoostWindowSecs: 60,
		// 4 × 240s (max half-life) = 960s = 16 min.
		historyWindowMs: 960_000,
	},
	{
		id: 'baseball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		// Baseball has no clock — the near-linear late-game ramp keys off these inning anchors.
		lateGameCurve: {
			model: 'baseball',
			regulationInnings: 9,
			regulationStartInning: 6,
			extraInningsStartInning: 10,
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		// Runs cluster by inning — mid-length half-lives. No game clock, so no OT pre-boost window.
		decayHalfLifeMs: { momentum: 150_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 0,
		// 4 × 180s (max half-life) = 720s = 12 min.
		historyWindowMs: 720_000,
	},
	{
		id: 'football',
		clockBased: true,
		closenessMargins: [3, 9, 14],
		momentumBigRun: 10,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 7,
		comebackThresholdSmall: 3,
		// Scoring drives in bursts with long gaps between possessions — longer half-lives keep the
		// graph alive through those gaps (workshopped ×1.5 vs the other mid-scoring sports).
		decayHalfLifeMs: { momentum: 135_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 60,
		// 4 × 180s (max half-life) = 720s = 12 min.
		historyWindowMs: 720_000,
	},
	{
		// Softball mirrors baseball but has 7 regulation innings — different lateGameCurve thresholds.
		id: 'softball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		lateGameCurve: {
			model: 'baseball',
			regulationInnings: 7,
			regulationStartInning: 5,
			extraInningsStartInning: 8,
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: { momentum: 150_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 0,
		// 4 × 180s (max half-life) = 720s = 12 min.
		historyWindowMs: 720_000,
	},
	{
		id: 'soccer',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: true,
		clockIsFullGameElapsed: true,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		// Goals are the rarest of all — the longest half-lives so a goal carries the graph for minutes.
		decayHalfLifeMs: { momentum: 240_000, leadChange: 300_000, comeback: 300_000 },
		otPreBoostWindowSecs: 60,
		// 4 × 300s (max half-life) = 1200s = 20 min.
		historyWindowMs: 1_200_000,
	},
];

export const sportTypeConfigMap = Object.fromEntries(
	sportTypeConfigs.map(c => [c.id, c])
) as Record<SportType, SportTypeConfig>;

export const leagueConfigs: LeagueConfig[] = [
	{
		id: 'nba',
		label: 'NBA',
		sportType: 'basketball',
		espnPath: 'basketball/nba',
		regularPeriods: 4,
		periodDurationSecs: 720,
		periodFormat: 'quarters',
	},
	{
		id: 'wnba',
		label: 'WNBA',
		sportType: 'basketball',
		espnPath: 'basketball/wnba',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
	},
	{
		id: 'ncaab',
		label: 'NCAA Basketball',
		sportType: 'basketball',
		espnPath: 'basketball/mens-college-basketball',
		regularPeriods: 2,
		periodDurationSecs: 1200,
		periodFormat: 'halves',
		// 20-min halves: the near-linear late-game ramp spans the whole final half automatically,
		// so the tension build starts proportionally earlier with no special-casing needed.
	},
	{
		id: 'nhl',
		label: 'NHL',
		sportType: 'hockey',
		espnPath: 'hockey/nhl',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		id: 'ncaamh',
		label: "NCAA Men's Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/mens-college-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		id: 'mlb',
		label: 'MLB',
		sportType: 'baseball',
		espnPath: 'baseball/mlb',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'nfl',
		label: 'NFL',
		sportType: 'football',
		espnPath: 'football/nfl',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
	},
	{
		id: 'ncaaf',
		label: 'NCAA Football',
		sportType: 'football',
		espnPath: 'football/college-football',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
	},
	{
		id: 'mls',
		label: 'MLS',
		sportType: 'soccer',
		espnPath: 'soccer/usa.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'ncaaw',
		label: "NCAA Women's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/womens-college-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
	},
	{
		id: 'epl',
		label: 'English Premier League',
		sportType: 'soccer',
		espnPath: 'soccer/eng.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'fifawc',
		label: 'FIFA World Cup',
		sportType: 'soccer',
		espnPath: 'soccer/fifa.world',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'cbase',
		label: 'NCAA Baseball',
		sportType: 'baseball',
		espnPath: 'baseball/college-baseball',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'csoft',
		label: 'NCAA Softball',
		sportType: 'softball',
		espnPath: 'baseball/college-softball',
		regularPeriods: 7,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'olybb',
		label: "Olympic Men's Baseball",
		sportType: 'baseball',
		espnPath: 'baseball/olympics-baseball',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'wbbc',
		label: 'World Baseball Classic',
		sportType: 'baseball',
		espnPath: 'baseball/world-baseball-classic',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'ufl',
		label: 'UFL',
		sportType: 'football',
		espnPath: 'football/ufl',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
	},
	{
		id: 'olymih',
		label: "Olympic Men's Ice Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/olympics-mens-ice-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		id: 'olywih',
		label: "Olympic Women's Ice Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/olympics-womens-ice-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		// FIBA uses 10-minute quarters (600s), not the NBA's 12-minute quarters.
		id: 'olybkm',
		label: "Olympic Men's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/mens-olympics-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
	},
	{
		id: 'olybkw',
		label: "Olympic Women's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/womens-olympics-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
	},
	{
		id: 'olysocm',
		label: "Olympic Men's Soccer",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.olympics',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'olysocw',
		label: "Olympic Women's Soccer",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.w.olympics',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'laliga',
		label: 'La Liga',
		sportType: 'soccer',
		espnPath: 'soccer/esp.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'bundesliga',
		label: 'Bundesliga',
		sportType: 'soccer',
		espnPath: 'soccer/ger.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'seriea',
		label: 'Serie A',
		sportType: 'soccer',
		espnPath: 'soccer/ita.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'ligamx',
		label: 'Liga MX',
		sportType: 'soccer',
		espnPath: 'soccer/mex.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'ucl',
		label: 'UEFA Champions League',
		sportType: 'soccer',
		espnPath: 'soccer/uefa.champions',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'uel',
		label: 'UEFA Europa League',
		sportType: 'soccer',
		espnPath: 'soccer/uefa.europa',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'nwsl',
		label: 'NWSL',
		sportType: 'soccer',
		espnPath: 'soccer/usa.nwsl',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'fifawwc',
		label: "FIFA Women's World Cup",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.wwc',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
];

export const allLeagueIds = leagueConfigs.map(c => c.id) as LeagueId[];

export const leagueConfigMap = Object.fromEntries(
	leagueConfigs.map(c => [c.id, c])
) as Record<LeagueId, LeagueConfig>;
