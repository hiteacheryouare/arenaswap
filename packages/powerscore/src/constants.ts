import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

// Clock stall detection — graduated penalty based on how long the clock has been frozen.
// Sorted descending so the first matching step wins.
// At 15s poll interval: 8 polls ≈ 120s (commercial starts), 15 polls ≈ 225s (extended break / halftime).
export const stallPenaltySteps: { minPolls: number; multiplier: number }[] = [
	{ minPolls: 15, multiplier: 0.70 },
	{ minPolls: 8,  multiplier: 0.85 },
];

// PowerScore signal maxes (per-signal ceilings, sport-agnostic).
// The per-signal ceilings deliberately sum to MORE than 100 ("overcomplete"): the headline total is
// capped at scoreMaxTotal, so a genuinely exciting game — close + a run + lead changes, even mid-game
// before late-game pressure exists — can stack into the 80s/90s and a true classic saturates at 100,
// while a dull game still scores low. This is what lets PowerScore use its full 0–100 range instead of
// compressing every game into the bottom two-thirds.
export const scoreMaxCloseness = 30;
export const scoreMaxLateGame = 28;
export const scoreMaxMomentum = 28;
export const scoreMaxLeadChanges = 18;
export const scoreMaxComeback = 14;
// Headline cap. Intentionally lower than the sum of the per-signal ceilings above.
export const scoreMaxTotal = 100;

export const scorerTunables: ScorerTunables = {
	scores: {
		// Closeness tiers are now the CEILINGS reached at the end of regulation (progress = 1).
		// Realized closeness = closenessFlatFloor + (tier - floor) * gameProgress, so early games sit low.
		closeness: {
			tied: scoreMaxCloseness,
			tight: 25,
			zeroZero: 16,
			close: 15,
			fringe: 6,
			none: 0,
		},
		// Always-paid closeness minimum for any active (non-blowout) tier, before progress scaling.
		closenessFlatFloor: 6,
		lateGame: {
			overtime: scoreMaxLateGame,
			otEdgeMax: 26,
			// Final period ramps 3 → 26 near-linearly; the prior period ramps 0 → 3 so the boundary is
			// smooth and there is no final-seconds cliff (matches the chosen "near-linear" curve).
			finalPeriodStart: 3,
			previousPeriodTouch: 3,
			otPreBoostMax: scoreMaxLateGame - 26,
			none: 0,
		},
		// Momentum / lead-change tier values are the spike CEILINGS; sport-scaled decay is applied after.
		momentum: {
			bigRun: scoreMaxMomentum,
			smallRun: 15,
			none: 0,
		},
		leadChanges: {
			multiple: scoreMaxLeadChanges,
			single: 12,
			none: 0,
		},
		// Comeback ceilings (progress-scaled like closeness, then decayed like the rest of the cluster).
		comeback: {
			big: scoreMaxComeback,
			moderate: 8,
			flatFloor: 2,
			none: 0,
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
		momentumRunPrefix: 'on a',
		momentumRunSuffix: 'run',
		momentumRolling: 'on a roll',
		leadChangeMultiple: 'trading leads',
		leadChangeSingle: 'just took the lead',
		comebackBig: 'big comeback',
		comebackModerate: 'making a run at it',
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
		maxHistorySnapshots: 32,
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
		maxHistorySnapshots: 30,
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
		maxHistorySnapshots: 36,
	},
	{
		id: 'football',
		clockBased: true,
		closenessMargins: [3, 8, 14],
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
		maxHistorySnapshots: 32,
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
		maxHistorySnapshots: 36,
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
		maxHistorySnapshots: 40,
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
