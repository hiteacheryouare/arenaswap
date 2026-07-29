Object.fromEntries([
	{
		id: "basketball",
		clockBased: true,
		closenessMargins: [
			5,
			10,
			18
		],
		momentumBigRun: 8,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 6,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: {
			momentum: 45e3,
			leadChange: 6e4,
			comeback: 6e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 3e5
	},
	{
		id: "hockey",
		clockBased: true,
		closenessMargins: [
			1,
			2,
			3
		],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1, 2],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 18e4,
			leadChange: 24e4,
			comeback: 24e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 96e4
	},
	{
		id: "baseball",
		clockBased: false,
		closenessMargins: [
			1,
			3,
			5
		],
		lateGameCurve: {
			model: "baseball",
			regulationInnings: 9,
			regulationStartInning: 6,
			extraInningsStartInning: 10
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 15e4,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 0,
		historyWindowMs: 72e4
	},
	{
		id: "football",
		clockBased: true,
		closenessMargins: [
			3,
			9,
			14
		],
		momentumBigRun: 10,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 7,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: {
			momentum: 135e3,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 72e4
	},
	{
		id: "softball",
		clockBased: false,
		closenessMargins: [
			1,
			3,
			5
		],
		lateGameCurve: {
			model: "baseball",
			regulationInnings: 7,
			regulationStartInning: 5,
			extraInningsStartInning: 8
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 15e4,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 0,
		historyWindowMs: 72e4
	},
	{
		id: "soccer",
		clockBased: true,
		closenessMargins: [
			1,
			2,
			3
		],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: true,
		clockIsFullGameElapsed: true,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 24e4,
			leadChange: 3e5,
			comeback: 3e5
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 12e5
	}
].map((c) => [c.id, c]));
const leagueConfigs$1 = [
	{
		id: "nba",
		label: "NBA",
		sportType: "basketball",
		espnPath: "basketball/nba",
		regularPeriods: 4,
		periodDurationSecs: 720,
		periodFormat: "quarters"
	},
	{
		id: "wnba",
		label: "WNBA",
		sportType: "basketball",
		espnPath: "basketball/wnba",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "ncaab",
		label: "NCAA Basketball",
		sportType: "basketball",
		espnPath: "basketball/mens-college-basketball",
		regularPeriods: 2,
		periodDurationSecs: 1200,
		periodFormat: "halves"
	},
	{
		id: "nhl",
		label: "NHL",
		sportType: "hockey",
		espnPath: "hockey/nhl",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "ncaamh",
		label: "NCAA Men's Hockey",
		sportType: "hockey",
		espnPath: "hockey/mens-college-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "mlb",
		label: "MLB",
		sportType: "baseball",
		espnPath: "baseball/mlb",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "nfl",
		label: "NFL",
		sportType: "football",
		espnPath: "football/nfl",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "ncaaf",
		label: "NCAA Football",
		sportType: "football",
		espnPath: "football/college-football",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "mls",
		label: "MLS",
		sportType: "soccer",
		espnPath: "soccer/usa.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ncaaw",
		label: "NCAA Women's Basketball",
		sportType: "basketball",
		espnPath: "basketball/womens-college-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "epl",
		label: "English Premier League",
		sportType: "soccer",
		espnPath: "soccer/eng.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "fifawc",
		label: "FIFA World Cup",
		sportType: "soccer",
		espnPath: "soccer/fifa.world",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "cbase",
		label: "NCAA Baseball",
		sportType: "baseball",
		espnPath: "baseball/college-baseball",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "csoft",
		label: "NCAA Softball",
		sportType: "softball",
		espnPath: "baseball/college-softball",
		regularPeriods: 7,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "olybb",
		label: "Olympic Men's Baseball",
		sportType: "baseball",
		espnPath: "baseball/olympics-baseball",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "wbbc",
		label: "World Baseball Classic",
		sportType: "baseball",
		espnPath: "baseball/world-baseball-classic",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "ufl",
		label: "UFL",
		sportType: "football",
		espnPath: "football/ufl",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "olymih",
		label: "Olympic Men's Ice Hockey",
		sportType: "hockey",
		espnPath: "hockey/olympics-mens-ice-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "olywih",
		label: "Olympic Women's Ice Hockey",
		sportType: "hockey",
		espnPath: "hockey/olympics-womens-ice-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "olybkm",
		label: "Olympic Men's Basketball",
		sportType: "basketball",
		espnPath: "basketball/mens-olympics-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "olybkw",
		label: "Olympic Women's Basketball",
		sportType: "basketball",
		espnPath: "basketball/womens-olympics-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "olysocm",
		label: "Olympic Men's Soccer",
		sportType: "soccer",
		espnPath: "soccer/fifa.olympics",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "olysocw",
		label: "Olympic Women's Soccer",
		sportType: "soccer",
		espnPath: "soccer/fifa.w.olympics",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "laliga",
		label: "La Liga",
		sportType: "soccer",
		espnPath: "soccer/esp.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "bundesliga",
		label: "Bundesliga",
		sportType: "soccer",
		espnPath: "soccer/ger.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "seriea",
		label: "Serie A",
		sportType: "soccer",
		espnPath: "soccer/ita.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ligamx",
		label: "Liga MX",
		sportType: "soccer",
		espnPath: "soccer/mex.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ucl",
		label: "UEFA Champions League",
		sportType: "soccer",
		espnPath: "soccer/uefa.champions",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "uel",
		label: "UEFA Europa League",
		sportType: "soccer",
		espnPath: "soccer/uefa.europa",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "nwsl",
		label: "NWSL",
		sportType: "soccer",
		espnPath: "soccer/usa.nwsl",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "fifawwc",
		label: "FIFA Women's World Cup",
		sportType: "soccer",
		espnPath: "soccer/fifa.wwc",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	}
];
leagueConfigs$1.map((c) => c.id);
const leagueConfigMap$1 = Object.fromEntries(leagueConfigs$1.map((c) => [c.id, c]));
//#endregion
//#region packages/core/src/mockGames.ts
const espnCdn = "https://a.espncdn.com/i/teamlogos";
const clockTick = 15;
const preGameTicksBeforeStart = 5;
const resetPostGameAfterTicks = 4;
const overtimePeriodSeconds = 300;
const baseballInningAdvanceChance = .15;
const baseballLateInningThreshold = 7;
const streakMaxTicks = 5;
const streakEndChance = .2;
const streakStartChance = .12;
const streakHomeChance = .5;
const rareScoreChance = .3;
const lateGameThresholdSeconds = 300;
const lateGameComebackChance = .4;
/** Sport-family simulation params (local to mock simulator only).
*
* Per-tick scoring probabilities are tuned to realistic per-game TOTALS at the 15s tick rate, so each
* sport's demo cadence matches reality: basketball scores almost every possession (graph always moving),
* while hockey/soccer go long stretches without a goal. The continuous "pulse" for low-scoring sports
* comes from the PowerScore v2 progress ramp + decay tails — NOT from unrealistically frequent scoring.
*
* Rough sanity check (regulation ticks × normalScoreProb × avg points ≈ points/team/game):
*   basketball ~192 ticks → ~110 pts   football ~240 → ~26   hockey ~240 → ~3.5
*   soccer ~360 → ~2      baseball ~60 half-inning ticks → ~4.5 runs
*/
const sportParams = {
	basketball: {
		normalScoreProb: .25,
		streakScoreProb: .55,
		offScoreProb: .1,
		scoreValues: [2, 3]
	},
	football: {
		normalScoreProb: .02,
		streakScoreProb: .1,
		offScoreProb: .01,
		scoreValues: [7, 3]
	},
	baseball: {
		normalScoreProb: .06,
		streakScoreProb: .22,
		offScoreProb: .03,
		scoreValues: [1, 2]
	},
	softball: {
		normalScoreProb: .07,
		streakScoreProb: .25,
		offScoreProb: .03,
		scoreValues: [1, 2]
	},
	hockey: {
		normalScoreProb: .014,
		streakScoreProb: .05,
		offScoreProb: .006,
		scoreValues: [1, 1]
	},
	soccer: {
		normalScoreProb: .006,
		streakScoreProb: .022,
		offScoreProb: .003,
		scoreValues: [1, 1]
	}
};
const getStreakAdjustedProb = (streak, side, params) => {
	if (streak === side) return params.streakScoreProb;
	if (streak) return params.offScoreProb;
	return params.normalScoreProb;
};
const getLateGameMarginThreshold = (sportType) => {
	if (sportType === "hockey" || sportType === "soccer") return 2;
	if (sportType === "baseball") return 3;
	return 10;
};
/**
* Simulates evolving game state for demo/testing across multiple sports.
* Each call to tick() advances all games by one poll interval.
*/
var MockGameSimulator = class {
	games;
	state;
	constructor() {
		this.games = [
			{
				id: "mock-1",
				league: "ncaab",
				sportType: "basketball",
				homeTeam: {
					id: "111",
					name: "Northeastern Huskies",
					abbreviation: "NU",
					score: 45,
					logo: `${espnCdn}/ncaa/500/111.png`,
					color: "#CC0000"
				},
				awayTeam: {
					id: "104",
					name: "Boston University Terriers",
					abbreviation: "BU",
					score: 42,
					logo: `${espnCdn}/ncaa/500/104.png`,
					color: "#CC0000"
				},
				venueName: "Matthews Arena",
				period: 4,
				clockSeconds: 162,
				status: "in",
				broadcasts: ["TNT", "truTV"],
				odds: {
					details: "NU -2.5",
					overUnder: 142.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-2",
				league: "nba",
				sportType: "basketball",
				homeTeam: {
					id: "20",
					name: "Philadelphia 76ers",
					abbreviation: "PHI",
					score: 68,
					logo: `${espnCdn}/nba/500/phi.png`,
					color: "#006BB6"
				},
				awayTeam: {
					id: "4",
					name: "Chicago Bulls",
					abbreviation: "CHI",
					score: 65,
					logo: `${espnCdn}/nba/500/chi.png`,
					color: "#CE1141"
				},
				venueName: "Xfinity Mobile Arena",
				period: 3,
				clockSeconds: 284,
				status: "in",
				broadcasts: ["ESPN", "NBCSN"],
				odds: {
					details: "PHI -1.5",
					overUnder: 226.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-3",
				league: "nhl",
				sportType: "hockey",
				homeTeam: {
					id: "15",
					name: "Philadelphia Flyers",
					abbreviation: "PHI",
					score: 2,
					logo: `${espnCdn}/nhl/500/phi.png`,
					color: "#F74902"
				},
				awayTeam: {
					id: "16",
					name: "Pittsburgh Penguins",
					abbreviation: "PIT",
					score: 1,
					logo: `${espnCdn}/nhl/500/pit.png`,
					color: "#CFC493"
				},
				venueName: "Xfinity Mobile Arena",
				period: 3,
				clockSeconds: 412,
				status: "in",
				broadcasts: ["NHL Net"],
				odds: {
					details: "PHI -122",
					overUnder: 6.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-4",
				league: "mlb",
				sportType: "baseball",
				homeTeam: {
					id: "22",
					name: "Philadelphia Phillies",
					abbreviation: "PHI",
					score: 3,
					logo: `${espnCdn}/mlb/500/phi.png`,
					color: "#E81828"
				},
				awayTeam: {
					id: "21",
					name: "New York Mets",
					abbreviation: "NYM",
					score: 2,
					logo: `${espnCdn}/mlb/500/nym.png`,
					color: "#002D72"
				},
				venueName: "Citizens Bank Park",
				period: 8,
				clockSeconds: 0,
				status: "in",
				topOfInning: false,
				baseRunners: {
					first: true,
					second: false,
					third: true
				},
				bso: {
					balls: 1,
					strikes: 0,
					outs: 1
				},
				broadcasts: ["MLB.TV"]
			},
			{
				id: "mock-5",
				league: "nfl",
				sportType: "football",
				homeTeam: {
					id: "21",
					name: "Philadelphia Eagles",
					abbreviation: "PHI",
					score: 17,
					logo: `${espnCdn}/nfl/500/phi.png`,
					color: "#004C54"
				},
				awayTeam: {
					id: "6",
					name: "Dallas Cowboys",
					abbreviation: "DAL",
					score: 14,
					logo: `${espnCdn}/nfl/500/dal.png`,
					color: "#003594"
				},
				venueName: "Lincoln Financial Field",
				period: 4,
				clockSeconds: 480,
				status: "in",
				downDistance: "3rd & 7",
				broadcasts: ["NBC", "Peacock"]
			},
			{
				id: "mock-6",
				league: "ncaaf",
				sportType: "football",
				homeTeam: {
					id: "218",
					name: "Temple Owls",
					abbreviation: "TEM",
					score: 0,
					logo: `${espnCdn}/ncaa/500/218.png`,
					color: "#9D2235"
				},
				awayTeam: {
					id: "213",
					name: "Penn State Nittany Lions",
					abbreviation: "PSU",
					score: 0,
					logo: `${espnCdn}/ncaa/500/213.png`,
					color: "#041E42"
				},
				venueName: "Lincoln Financial Field",
				period: 1,
				clockSeconds: 900,
				status: "pre",
				startTime: new Date(Date.now() + 2160 * 60 * 1e3).toISOString(),
				broadcasts: ["ESPN"],
				odds: {
					details: "PSU -6.5",
					overUnder: 48.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-9",
				league: "mls",
				sportType: "soccer",
				homeTeam: {
					id: "190",
					name: "Philadelphia Union",
					abbreviation: "PHI",
					score: 2,
					logo: `${espnCdn}/soccer/500/10739.png`,
					color: "#051c2c"
				},
				awayTeam: {
					id: "183",
					name: "New York Red Bull",
					abbreviation: "NYR",
					score: 1,
					logo: `${espnCdn}/soccer/500/190.png`,
					color: "#b91f31"
				},
				venueName: "Subaru Park",
				period: 2,
				clockSeconds: 742,
				status: "in",
				broadcasts: ["Apple TV"]
			},
			{
				id: "mock-10",
				league: "ncaamh",
				sportType: "hockey",
				homeTeam: {
					id: "111",
					name: "Northeastern Huskies",
					abbreviation: "NU",
					score: 5,
					logo: `${espnCdn}/ncaa/500/111.png`,
					color: "#CC0000"
				},
				awayTeam: {
					id: "ncaamh-57",
					name: "Boston College Eagles",
					abbreviation: "BC",
					score: 0,
					logo: `${espnCdn}/ncaa/500/103.png`,
					color: "#b91f31"
				},
				venueName: "TD Garden",
				period: 1,
				clockSeconds: 1200,
				status: "pre",
				startTime: new Date(Date.now() + 1080 * 60 * 1e3).toISOString(),
				broadcasts: ["ESPNU"],
				odds: {
					details: "NU -1.5",
					overUnder: 5.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-11",
				league: "ncaaw",
				sportType: "basketball",
				homeTeam: {
					id: "111",
					name: "Northeastern Huskies",
					abbreviation: "NU",
					score: 55,
					logo: `${espnCdn}/ncaa/500/111.png`,
					color: "#CC0000"
				},
				awayTeam: {
					id: "222",
					name: "Villanova Wildcats",
					abbreviation: "VIL",
					score: 52,
					logo: `${espnCdn}/ncaa/500/222.png`,
					color: "#003366"
				},
				venueName: "Cabot Center",
				period: 3,
				clockSeconds: 420,
				status: "in",
				broadcasts: ["ESPN2"],
				odds: {
					details: "NU -3.5",
					overUnder: 138.5,
					provider: {
						name: "Draft Kings",
						logoUrl: "https://a.espncdn.com/i/betting/Draftkings_Light.svg"
					}
				}
			},
			{
				id: "mock-12",
				league: "epl",
				sportType: "soccer",
				homeTeam: {
					id: "364",
					name: "Liverpool FC",
					abbreviation: "LIV",
					score: 1,
					logo: `${espnCdn}/soccer/500/364.png`,
					color: "#C8102E"
				},
				awayTeam: {
					id: "359",
					name: "Arsenal",
					abbreviation: "ARS",
					score: 1,
					logo: `${espnCdn}/soccer/500/359.png`,
					color: "#EF0107"
				},
				venueName: "Anfield",
				period: 2,
				clockSeconds: 1980,
				status: "in",
				broadcasts: ["Peacock"]
			},
			{
				id: "mock-13",
				league: "fifawc",
				sportType: "soccer",
				homeTeam: {
					id: "564",
					name: "United States",
					abbreviation: "USA",
					score: 1,
					logo: `${espnCdn}/countries/500/usa.png`,
					color: "#002868"
				},
				awayTeam: {
					id: "239",
					name: "Mexico",
					abbreviation: "MEX",
					score: 1,
					logo: `${espnCdn}/countries/500/mex.png`,
					color: "#006847"
				},
				venueName: "Lincoln Financial Field",
				period: 2,
				clockSeconds: 2400,
				status: "in",
				broadcasts: ["Fox"]
			},
			{
				id: "mock-14",
				league: "nhl",
				sportType: "hockey",
				homeTeam: {
					id: "3",
					name: "New York Rangers",
					abbreviation: "NYR",
					score: 2,
					logo: `${espnCdn}/nhl/500/nyr.png`,
					color: "#0038A8"
				},
				awayTeam: {
					id: "1",
					name: "Boston Bruins",
					abbreviation: "BOS",
					score: 2,
					logo: `${espnCdn}/nhl/500/bos.png`,
					color: "#FFB81C"
				},
				venueName: "Madison Square Garden",
				period: 4,
				clockSeconds: 214,
				status: "in",
				broadcasts: ["TNT"],
				odds: {
					details: "NYR -115",
					overUnder: 5.5
				}
			},
			{
				id: "mock-15",
				league: "nba",
				sportType: "basketball",
				homeTeam: {
					id: "5",
					name: "Cleveland Cavaliers",
					abbreviation: "CLE",
					score: 108,
					logo: `${espnCdn}/nba/500/cle.png`,
					color: "#860038"
				},
				awayTeam: {
					id: "13",
					name: "Milwaukee Bucks",
					abbreviation: "MIL",
					score: 107,
					logo: `${espnCdn}/nba/500/mil.png`,
					color: "#00471B"
				},
				venueName: "Rocket Arena",
				period: 4,
				clockSeconds: 38,
				status: "in",
				broadcasts: ["ESPN"],
				odds: {
					details: "CLE -1.5",
					overUnder: 224.5
				}
			},
			{
				id: "mock-16",
				league: "mlb",
				sportType: "baseball",
				homeTeam: {
					id: "28",
					name: "Houston Astros",
					abbreviation: "HOU",
					score: 4,
					logo: `${espnCdn}/mlb/500/hou.png`,
					color: "#EB6E1F"
				},
				awayTeam: {
					id: "10",
					name: "Los Angeles Dodgers",
					abbreviation: "LAD",
					score: 4,
					logo: `${espnCdn}/mlb/500/lad.png`,
					color: "#005A9C"
				},
				venueName: "Daikin Park",
				period: 10,
				clockSeconds: 0,
				status: "in",
				topOfInning: true,
				baseRunners: {
					first: false,
					second: true,
					third: false
				},
				bso: {
					balls: 0,
					strikes: 1,
					outs: 0
				},
				broadcasts: ["Fox"]
			},
			{
				id: "mock-17",
				league: "csoft",
				sportType: "softball",
				homeTeam: {
					id: "111",
					name: "Northeastern Huskies",
					abbreviation: "NU",
					score: 3,
					logo: `${espnCdn}/ncaa/500/111.png`,
					color: "#CC0000"
				},
				awayTeam: {
					id: "103",
					name: "Boston College Eagles",
					abbreviation: "BC",
					score: 2,
					logo: `${espnCdn}/ncaa/500/103.png`,
					color: "#98002E"
				},
				venueName: "Friedman Diamond",
				period: 5,
				clockSeconds: 0,
				status: "in",
				topOfInning: true,
				baseRunners: {
					first: false,
					second: true,
					third: false
				},
				bso: {
					balls: 1,
					strikes: 0,
					outs: 0
				},
				broadcasts: ["ESPNU"]
			}
		];
		this.state = /* @__PURE__ */ new Map();
		for (const g of this.games) this.state.set(g.id, {
			streak: null,
			streakTicks: 0,
			postTicks: 0,
			preTicks: g.status === "pre" ? preGameTicksBeforeStart : 0
		});
	}
	/** Advance simulation by one tick and return current game states. */
	tick = () => {
		for (const game of this.games) {
			const simState = this.state.get(game.id);
			switch (game.status) {
				case "in":
					this.advanceLive(game, simState);
					break;
				case "post":
					this.advancePost(game, simState);
					break;
				case "pre":
					this.advancePre(game, simState);
					break;
			}
		}
		return this.games.map((g) => ({
			...g,
			homeTeam: { ...g.homeTeam },
			awayTeam: { ...g.awayTeam },
			bso: g.bso ? { ...g.bso } : void 0
		}));
	};
	advanceLive = (game, simState) => {
		const regularPeriods = leagueConfigMap$1[game.league].regularPeriods;
		if (game.sportType === "baseball" || game.sportType === "softball") {
			if (game.bso) {
				const roll = Math.random();
				if (roll < .3) {
					const newBalls = game.bso.balls + 1;
					game.bso = newBalls >= 4 ? {
						balls: 0,
						strikes: game.bso.strikes,
						outs: game.bso.outs
					} : {
						...game.bso,
						balls: newBalls
					};
				} else if (roll < .6) {
					const newStrikes = game.bso.strikes + 1;
					game.bso = newStrikes >= 3 ? {
						balls: 0,
						strikes: 0,
						outs: game.bso.outs
					} : {
						...game.bso,
						strikes: newStrikes
					};
				} else if (roll < .75) {
					const newOuts = game.bso.outs + 1;
					game.bso = newOuts >= 3 ? {
						balls: 0,
						strikes: 0,
						outs: 0
					} : {
						balls: 0,
						strikes: 0,
						outs: newOuts
					};
				}
			}
			this.scorePoints(game, simState);
			if (Math.random() < baseballInningAdvanceChance) if (game.period >= regularPeriods && game.homeTeam.score !== game.awayTeam.score) {
				game.status = "post";
				simState.postTicks = 0;
			} else game.period = Math.min(game.period + 1, regularPeriods + 3);
			return;
		}
		if (game.sportType === "football" && game.downDistance !== void 0) {
			if (Math.random() < .35) {
				const patterns = [
					"1st & 10",
					"2nd & 8",
					"3rd & 5",
					"4th & 2",
					"1st & 10",
					"2nd & 4",
					"3rd & Goal",
					"1st & 10"
				];
				game.downDistance = patterns[(patterns.indexOf(game.downDistance) + 1) % patterns.length];
			}
		}
		game.clockSeconds = Math.max(0, game.clockSeconds - clockTick);
		this.scorePoints(game, simState);
		if (game.clockSeconds <= 0) if (game.period < regularPeriods) {
			game.period++;
			game.clockSeconds = leagueConfigMap$1[game.league].periodDurationSecs;
		} else if (game.homeTeam.score === game.awayTeam.score) {
			game.period++;
			game.clockSeconds = overtimePeriodSeconds;
		} else {
			game.status = "post";
			simState.postTicks = 0;
		}
	};
	scorePoints = (game, simState) => {
		const params = sportParams[game.sportType];
		if (simState.streak) {
			simState.streakTicks++;
			if (simState.streakTicks > streakMaxTicks || Math.random() < streakEndChance) {
				simState.streak = null;
				simState.streakTicks = 0;
			}
		} else if (Math.random() < streakStartChance) {
			simState.streak = Math.random() < streakHomeChance ? "home" : "away";
			simState.streakTicks = 0;
		}
		const homeProb = getStreakAdjustedProb(simState.streak, "home", params);
		const awayProb = getStreakAdjustedProb(simState.streak, "away", params);
		const pointsForScore = () => Math.random() < rareScoreChance ? params.scoreValues[1] : params.scoreValues[0];
		if (Math.random() < homeProb) game.homeTeam.score += pointsForScore();
		if (Math.random() < awayProb) game.awayTeam.score += pointsForScore();
		const regularPeriods = leagueConfigMap$1[game.league].regularPeriods;
		if (game.sportType === "baseball" ? game.period >= baseballLateInningThreshold : game.period >= regularPeriods && game.clockSeconds < lateGameThresholdSeconds) {
			if (Math.abs(game.homeTeam.score - game.awayTeam.score) > getLateGameMarginThreshold(game.sportType) && Math.random() < lateGameComebackChance) {
				const trailing = game.homeTeam.score < game.awayTeam.score ? game.homeTeam : game.awayTeam;
				trailing.score += pointsForScore();
			}
		}
	};
	advancePost = (game, simState) => {
		simState.postTicks++;
		if (simState.postTicks >= resetPostGameAfterTicks) {
			const leagueConfig = leagueConfigMap$1[game.league];
			game.status = "in";
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
			game.homeTeam.score = 0;
			game.awayTeam.score = 0;
			if (game.bso) game.bso = {
				balls: 0,
				strikes: 0,
				outs: 0
			};
			if (game.downDistance !== void 0) game.downDistance = "1st & 10";
			simState.streak = null;
			simState.streakTicks = 0;
		}
	};
	advancePre = (game, simState) => {
		if (simState.preTicks > 0) simState.preTicks--;
		else {
			const leagueConfig = leagueConfigMap$1[game.league];
			game.status = "in";
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
		}
	};
};
//#endregion
//#region packages/powerscore/src/constants.ts
const stallPenaltySteps = [{
	minPolls: 15,
	deduction: 25
}, {
	minPolls: 8,
	deduction: 15
}];
const lateGameCloseCeiling = 36;
const scorerTunables = {
	scores: {
		closeness: {
			tied: 42,
			tight: 34,
			zeroZero: 22,
			close: 20,
			fringe: 8,
			none: 0
		},
		closenessFlatFloor: 12,
		lateGame: {
			overtime: 38,
			closeCeiling: lateGameCloseCeiling,
			fringeCeiling: 22,
			blowoutCeiling: 15,
			finalPeriodStart: 3,
			previousPeriodTouch: 3,
			otPreBoostMax: 38 - lateGameCloseCeiling,
			none: 0
		},
		momentum: {
			bigRun: 38,
			smallRun: 20,
			none: 0
		},
		leadChanges: {
			multiple: 18,
			single: 12,
			none: 0
		},
		comeback: {
			big: 20,
			moderate: 11,
			flatFloor: 2,
			none: 0
		},
		winProbabilityVariance: {
			maxAvgDist: .35,
			minDataPoints: 5
		}
	},
	reasons: {
		tied: "it's tied",
		closenessUnitBySportType: {
			hockey: "goal",
			soccer: "goal",
			baseball: "run",
			softball: "run"
		},
		defaultClosenessUnit: "point",
		closenessGameSuffix: "game",
		overtime: "overtime",
		extraInnings: "extra innings",
		inningSuffix: "inning",
		clockLeftSuffix: "left",
		underPrefix: "under",
		minutesLeftSuffix: "min left",
		overtimeAnticipation: "tied — overtime looming",
		momentumRunSuffix: "run",
		momentumRolling: "on a roll",
		leadChangeMultiple: "trading leads",
		leadChangeSingle: "just took the lead",
		fallback: "best game available"
	}
};
const sportTypeConfigMap = Object.fromEntries([
	{
		id: "basketball",
		clockBased: true,
		closenessMargins: [
			5,
			10,
			18
		],
		momentumBigRun: 8,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 6,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: {
			momentum: 45e3,
			leadChange: 6e4,
			comeback: 6e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 3e5
	},
	{
		id: "hockey",
		clockBased: true,
		closenessMargins: [
			1,
			2,
			3
		],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1, 2],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 18e4,
			leadChange: 24e4,
			comeback: 24e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 96e4
	},
	{
		id: "baseball",
		clockBased: false,
		closenessMargins: [
			1,
			3,
			5
		],
		lateGameCurve: {
			model: "baseball",
			regulationInnings: 9,
			regulationStartInning: 6,
			extraInningsStartInning: 10
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 15e4,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 0,
		historyWindowMs: 72e4
	},
	{
		id: "football",
		clockBased: true,
		closenessMargins: [
			3,
			9,
			14
		],
		momentumBigRun: 10,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 7,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: {
			momentum: 135e3,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 72e4
	},
	{
		id: "softball",
		clockBased: false,
		closenessMargins: [
			1,
			3,
			5
		],
		lateGameCurve: {
			model: "baseball",
			regulationInnings: 7,
			regulationStartInning: 5,
			extraInningsStartInning: 8
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 15e4,
			leadChange: 18e4,
			comeback: 18e4
		},
		otPreBoostWindowSecs: 0,
		historyWindowMs: 72e4
	},
	{
		id: "soccer",
		clockBased: true,
		closenessMargins: [
			1,
			2,
			3
		],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: true,
		clockIsFullGameElapsed: true,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: {
			momentum: 24e4,
			leadChange: 3e5,
			comeback: 3e5
		},
		otPreBoostWindowSecs: 60,
		historyWindowMs: 12e5
	}
].map((c) => [c.id, c]));
const leagueConfigs = [
	{
		id: "nba",
		label: "NBA",
		sportType: "basketball",
		espnPath: "basketball/nba",
		regularPeriods: 4,
		periodDurationSecs: 720,
		periodFormat: "quarters"
	},
	{
		id: "wnba",
		label: "WNBA",
		sportType: "basketball",
		espnPath: "basketball/wnba",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "ncaab",
		label: "NCAA Basketball",
		sportType: "basketball",
		espnPath: "basketball/mens-college-basketball",
		regularPeriods: 2,
		periodDurationSecs: 1200,
		periodFormat: "halves"
	},
	{
		id: "nhl",
		label: "NHL",
		sportType: "hockey",
		espnPath: "hockey/nhl",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "ncaamh",
		label: "NCAA Men's Hockey",
		sportType: "hockey",
		espnPath: "hockey/mens-college-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "mlb",
		label: "MLB",
		sportType: "baseball",
		espnPath: "baseball/mlb",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "nfl",
		label: "NFL",
		sportType: "football",
		espnPath: "football/nfl",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "ncaaf",
		label: "NCAA Football",
		sportType: "football",
		espnPath: "football/college-football",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "mls",
		label: "MLS",
		sportType: "soccer",
		espnPath: "soccer/usa.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ncaaw",
		label: "NCAA Women's Basketball",
		sportType: "basketball",
		espnPath: "basketball/womens-college-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "epl",
		label: "English Premier League",
		sportType: "soccer",
		espnPath: "soccer/eng.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "fifawc",
		label: "FIFA World Cup",
		sportType: "soccer",
		espnPath: "soccer/fifa.world",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "cbase",
		label: "NCAA Baseball",
		sportType: "baseball",
		espnPath: "baseball/college-baseball",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "csoft",
		label: "NCAA Softball",
		sportType: "softball",
		espnPath: "baseball/college-softball",
		regularPeriods: 7,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "olybb",
		label: "Olympic Men's Baseball",
		sportType: "baseball",
		espnPath: "baseball/olympics-baseball",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "wbbc",
		label: "World Baseball Classic",
		sportType: "baseball",
		espnPath: "baseball/world-baseball-classic",
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: "innings"
	},
	{
		id: "ufl",
		label: "UFL",
		sportType: "football",
		espnPath: "football/ufl",
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: "quarters"
	},
	{
		id: "olymih",
		label: "Olympic Men's Ice Hockey",
		sportType: "hockey",
		espnPath: "hockey/olympics-mens-ice-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "olywih",
		label: "Olympic Women's Ice Hockey",
		sportType: "hockey",
		espnPath: "hockey/olympics-womens-ice-hockey",
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: "periods"
	},
	{
		id: "olybkm",
		label: "Olympic Men's Basketball",
		sportType: "basketball",
		espnPath: "basketball/mens-olympics-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "olybkw",
		label: "Olympic Women's Basketball",
		sportType: "basketball",
		espnPath: "basketball/womens-olympics-basketball",
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: "quarters"
	},
	{
		id: "olysocm",
		label: "Olympic Men's Soccer",
		sportType: "soccer",
		espnPath: "soccer/fifa.olympics",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "olysocw",
		label: "Olympic Women's Soccer",
		sportType: "soccer",
		espnPath: "soccer/fifa.w.olympics",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "laliga",
		label: "La Liga",
		sportType: "soccer",
		espnPath: "soccer/esp.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "bundesliga",
		label: "Bundesliga",
		sportType: "soccer",
		espnPath: "soccer/ger.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "seriea",
		label: "Serie A",
		sportType: "soccer",
		espnPath: "soccer/ita.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ligamx",
		label: "Liga MX",
		sportType: "soccer",
		espnPath: "soccer/mex.1",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "ucl",
		label: "UEFA Champions League",
		sportType: "soccer",
		espnPath: "soccer/uefa.champions",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "uel",
		label: "UEFA Europa League",
		sportType: "soccer",
		espnPath: "soccer/uefa.europa",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "nwsl",
		label: "NWSL",
		sportType: "soccer",
		espnPath: "soccer/usa.nwsl",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	},
	{
		id: "fifawwc",
		label: "FIFA Women's World Cup",
		sportType: "soccer",
		espnPath: "soccer/fifa.wwc",
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: "halves"
	}
];
leagueConfigs.map((c) => c.id);
const leagueConfigMap = Object.fromEntries(leagueConfigs.map((c) => [c.id, c]));
//#endregion
//#region packages/powerscore/src/scorer.ts
const toFiniteNumber = (value, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const progressCurveExponent = .55;
const applyProgressFloor = (tierCeiling, flatFloor, progress) => {
	if (tierCeiling <= 0) return 0;
	const floor = clamp(flatFloor, 0, tierCeiling);
	const curvedProgress = Math.pow(clamp(progress, 0, 1), progressCurveExponent);
	return Math.round(floor + (tierCeiling - floor) * curvedProgress);
};
const normalizePowerScoreResult = (score, options = {}) => {
	const closeness = clamp(toFiniteNumber(score.closeness), 0, 42);
	const lateGame = clamp(toFiniteNumber(score.lateGame), 0, 38);
	const momentum = clamp(toFiniteNumber(score.momentum), 0, 38);
	const leadChanges = clamp(toFiniteNumber(score.leadChanges), 0, 18);
	const comeback = clamp(toFiniteNumber(score.comeback), 0, 20);
	const hasWinProbVariance = typeof score.winProbabilityVariance === "number" && Number.isFinite(score.winProbabilityVariance);
	const winProbabilityVariance = hasWinProbVariance ? clamp(Math.round(toFiniteNumber(score.winProbabilityVariance)), -5, 5) : void 0;
	const rawTotal = closeness + lateGame + momentum + leadChanges + comeback;
	const total = options.allowTotalOverflow ? Math.max(0, toFiniteNumber(score.total, rawTotal)) : clamp(toFiniteNumber(score.total, rawTotal), 0, 100);
	const hasStallPenalty = typeof score.stallPenalty === "number" && Number.isFinite(score.stallPenalty);
	const hasBaseTotal = typeof score.baseTotal === "number" && Number.isFinite(score.baseTotal);
	const hasFavoriteBonus = typeof score.favoriteBonus === "number" && Number.isFinite(score.favoriteBonus);
	const hasFavoriteTeamCount = typeof score.favoriteTeamCount === "number" && Number.isFinite(score.favoriteTeamCount);
	const hasGameBoost = typeof score.gameBoost === "number" && Number.isFinite(score.gameBoost);
	const hasScoringOpportunityBoost = typeof score.scoringOpportunityBoost === "number" && Number.isFinite(score.scoringOpportunityBoost);
	const hasPostseasonBoost = typeof score.postseasonBoost === "number" && Number.isFinite(score.postseasonBoost);
	const stallPenalty = hasStallPenalty ? Math.max(0, Math.round(toFiniteNumber(score.stallPenalty))) : void 0;
	const baseTotal = hasBaseTotal ? clamp(toFiniteNumber(score.baseTotal), 0, 100) : void 0;
	const favoriteBonus = hasFavoriteBonus ? Math.max(0, Math.round(toFiniteNumber(score.favoriteBonus))) : void 0;
	const favoriteTeamCount = hasFavoriteTeamCount ? Math.max(0, Math.round(toFiniteNumber(score.favoriteTeamCount))) : void 0;
	const gameBoost = hasGameBoost ? Math.max(0, Math.round(toFiniteNumber(score.gameBoost))) : void 0;
	const scoringOpportunityBoost = hasScoringOpportunityBoost ? Math.max(0, Math.round(toFiniteNumber(score.scoringOpportunityBoost))) : void 0;
	const postseasonBoost = hasPostseasonBoost ? Math.max(0, Math.round(toFiniteNumber(score.postseasonBoost))) : void 0;
	return {
		gameId: score.gameId,
		total,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		...hasWinProbVariance ? { winProbabilityVariance } : {},
		reason: typeof score.reason === "string" ? score.reason : scorerTunables.reasons.fallback,
		stalled: score.stalled === true,
		...hasStallPenalty ? { stallPenalty } : {},
		...hasBaseTotal ? { baseTotal } : {},
		...hasFavoriteBonus ? { favoriteBonus } : {},
		...hasFavoriteTeamCount ? { favoriteTeamCount } : {},
		...hasGameBoost ? { gameBoost } : {},
		...hasScoringOpportunityBoost ? { scoringOpportunityBoost } : {},
		...hasPostseasonBoost ? { postseasonBoost } : {}
	};
};
const getClosenessUnit = (game) => scorerTunables.reasons.closenessUnitBySportType[game.sportType] ?? scorerTunables.reasons.defaultClosenessUnit;
const shouldScoreZeroZeroAsFullTie = (game, config) => config.zeroZeroAsFullTie && (game.period == null || config.zeroZeroPenaltyPeriods?.includes(game.period) !== true);
const getCloseness = (game, config, progress) => {
	const { scores, reasons } = scorerTunables;
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const marginReason = `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}`;
	let tier;
	let reason;
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0) {
		tier = shouldScoreZeroZeroAsFullTie(game, config) ? scores.closeness.tied : scores.closeness.zeroZero;
		reason = reasons.tied;
	} else if (margin === 0) {
		tier = scores.closeness.tied;
		reason = reasons.tied;
	} else if (margin <= t1) {
		tier = scores.closeness.tight;
		reason = marginReason;
	} else if (margin <= t2) {
		tier = scores.closeness.close;
		reason = marginReason;
	} else if (margin <= t3) {
		tier = scores.closeness.fringe;
		reason = "";
	} else {
		tier = scores.closeness.none;
		reason = "";
	}
	return {
		score: applyProgressFloor(tier, scores.closenessFlatFloor, progress),
		reason
	};
};
const formatClock = (seconds) => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
};
const ordinal = (n) => {
	if (n === 1) return "1st";
	if (n === 2) return "2nd";
	if (n === 3) return "3rd";
	return `${n}th`;
};
const mapLinearLateGame = (phase, fraction, ceiling) => {
	const { lateGame } = scorerTunables.scores;
	const f = clamp(fraction, 0, 1);
	if (phase === "none") return 0;
	if (phase === "previous") return clamp(Math.round(lateGame.previousPeriodTouch * f), 0, ceiling);
	return clamp(Math.round(lateGame.finalPeriodStart + (ceiling - lateGame.finalPeriodStart) * f), 0, ceiling);
};
const getOtPreBoost = (game, config, secsRemaining) => {
	const window = Math.max(0, config.otPreBoostWindowSecs);
	if (window <= 0) return 0;
	if (game.homeTeam.score !== game.awayTeam.score) return 0;
	if (secsRemaining > window) return 0;
	const ramp = clamp((window - secsRemaining) / window, 0, 1);
	return Math.round(scorerTunables.scores.lateGame.otPreBoostMax * ramp);
};
const getClockSecondsRemaining = (game, config, periodDurationSecs) => {
	const boundedDuration = Math.max(0, periodDurationSecs);
	let rawClock = game.clockSeconds ?? 0;
	if (config.clockIsFullGameElapsed && (game.period ?? 1) > 1) rawClock = Math.max(0, rawClock - (game.period - 1) * boundedDuration);
	const boundedClock = clamp(rawClock, 0, boundedDuration);
	return config.clockCountsUp ? clamp(boundedDuration - boundedClock, 0, boundedDuration) : boundedClock;
};
const getGameProgress = (game, config) => {
	if (game.period == null) return 0;
	const league = leagueConfigMap[game.league];
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period > regularPeriods) return 1;
	if (!config.clockBased) return clamp((game.period - 1 + .5) / regularPeriods, 0, 1);
	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	const elapsedInPeriod = clamp(periodDuration - secsRemaining, 0, periodDuration);
	const periodsDone = Math.max(0, game.period - 1);
	return clamp((periodsDone + elapsedInPeriod / periodDuration) / regularPeriods, 0, 1);
};
const getBaseballRegulationProgress = (inning, curve) => {
	if (inning < curve.regulationStartInning) return null;
	const spanInnings = Math.max(1, curve.regulationInnings - curve.regulationStartInning);
	return clamp((inning - curve.regulationStartInning) / spanInnings, 0, 1);
};
const getLateGameCeiling = (game, config) => {
	const [, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const { lateGame } = scorerTunables.scores;
	if (margin <= t2) return lateGame.closeCeiling;
	if (margin <= t3) return lateGame.fringeCeiling;
	return lateGame.blowoutCeiling;
};
const getLateGame = (game, config) => {
	const { scores, reasons } = scorerTunables;
	if (game.period == null) return {
		score: scores.lateGame.none,
		reason: ""
	};
	const leagueConfig = leagueConfigMap[game.league];
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;
	if (game.period > regularPeriods) return {
		score: scores.lateGame.overtime,
		reason: clockBased ? reasons.overtime : reasons.extraInnings
	};
	const tierCeiling = getLateGameCeiling(game, config);
	if (!clockBased) {
		const curve = config.lateGameCurve;
		if (!curve || curve.model !== "baseball") return {
			score: scores.lateGame.none,
			reason: ""
		};
		const regulationProgress = getBaseballRegulationProgress(game.period, curve);
		if (regulationProgress === null) return {
			score: scores.lateGame.none,
			reason: ""
		};
		const score = mapLinearLateGame("final", regulationProgress, tierCeiling);
		const inning = Math.min(game.period, curve.regulationInnings);
		return {
			score,
			reason: `${ordinal(inning)} ${reasons.inningSuffix}`
		};
	}
	const periodDuration = Math.max(1, leagueConfig.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	const elapsedFraction = clamp((periodDuration - secsRemaining) / periodDuration, 0, 1);
	const previousPeriod = regularPeriods - 1;
	if (game.period < previousPeriod) return {
		score: scores.lateGame.none,
		reason: ""
	};
	if (game.period < regularPeriods) return {
		score: mapLinearLateGame("previous", elapsedFraction, tierCeiling),
		reason: ""
	};
	const rampScore = mapLinearLateGame("final", elapsedFraction, tierCeiling);
	const otBoost = getOtPreBoost(game, config, secsRemaining);
	return {
		score: clamp(rampScore + otBoost, 0, 38),
		reason: otBoost > 0 ? reasons.overtimeAnticipation : secsRemaining < 60 ? `${formatClock(secsRemaining)} ${reasons.clockLeftSuffix}` : `${reasons.underPrefix} ${Math.ceil(secsRemaining / 60)} ${reasons.minutesLeftSuffix}`
	};
};
const deriveNow = (history) => history.length > 0 ? history[history.length - 1].timestamp : 0;
const decayFactor = (ageMs, halfLifeMs) => {
	if (ageMs <= 0) return 1;
	if (halfLifeMs <= 0) return 0;
	return Math.pow(.5, ageMs / halfLifeMs);
};
const ageSince = (timestamp, now) => timestamp === null ? Infinity : Math.max(0, now - timestamp);
const lastScoreChangeTimestamp = (history) => {
	for (let i = history.length - 1; i >= 1; i--) {
		const cur = history[i];
		const prev = history[i - 1];
		if (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore) return cur.timestamp;
	}
	return null;
};
const findLeadChanges = (history) => {
	let count = 0;
	let lastTimestamp = null;
	for (let i = 1; i < history.length; i++) {
		const prevDiff = history[i - 1].homeScore - history[i - 1].awayScore;
		const currDiff = history[i].homeScore - history[i].awayScore;
		if (Math.sign(prevDiff) !== Math.sign(currDiff) && !(prevDiff === 0 && currDiff === 0)) {
			count++;
			lastTimestamp = history[i].timestamp;
		}
	}
	return {
		count,
		lastTimestamp
	};
};
const decaySignal = (tier, reason, ageMs, halfLifeMs) => {
	const score = Math.round(tier * decayFactor(ageMs, halfLifeMs));
	return score <= 0 ? {
		score: 0,
		reason: ""
	} : {
		score,
		reason
	};
};
const getMomentum = (game, history, config, now) => {
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return {
		score: 0,
		reason: ""
	};
	const oldest = history[0];
	const newest = history[history.length - 1];
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation ?? "?" : game.awayTeam.abbreviation ?? "?";
	let tier;
	let reason;
	if (run >= config.momentumBigRun) {
		tier = scores.momentum.bigRun;
		reason = `${runTeam} on ${run === 8 || run === 11 || run === 18 ? "an" : "a"} ${run}-0 ${reasons.momentumRunSuffix}`;
	} else if (run >= config.momentumSmallRun) {
		tier = scores.momentum.smallRun;
		reason = `${runTeam} ${reasons.momentumRolling}`;
	} else return {
		score: scores.momentum.none,
		reason: ""
	};
	const ageMs = ageSince(lastScoreChangeTimestamp(history), now);
	return decaySignal(tier, reason, ageMs, config.decayHalfLifeMs.momentum);
};
const getLeadChanges = (history, config, now) => {
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return {
		score: 0,
		reason: ""
	};
	const { count, lastTimestamp } = findLeadChanges(history);
	let tier;
	let reason;
	if (count >= 2) {
		tier = scores.leadChanges.multiple;
		reason = reasons.leadChangeMultiple;
	} else if (count === 1) {
		tier = scores.leadChanges.single;
		reason = reasons.leadChangeSingle;
	} else return {
		score: scores.leadChanges.none,
		reason: ""
	};
	const ageMs = ageSince(lastTimestamp, now);
	return decaySignal(tier, reason, ageMs, config.decayHalfLifeMs.leadChange);
};
const getComeback = (game, history, config, progress, now) => {
	const { scores } = scorerTunables;
	if (history.length < 3) return {
		score: 0,
		reason: ""
	};
	const shrinkage = Math.abs(history[0].homeScore - history[0].awayScore) - Math.abs(game.homeTeam.score - game.awayTeam.score);
	const trailingTeam = history[0].homeScore < history[0].awayScore ? game.homeTeam.abbreviation ?? "?" : game.awayTeam.abbreviation ?? "?";
	let tier;
	let reason;
	if (shrinkage >= config.comebackThresholdBig) {
		tier = scores.comeback.big;
		reason = `${trailingTeam} cutting into it`;
	} else if (shrinkage >= config.comebackThresholdSmall) {
		tier = scores.comeback.moderate;
		reason = `${trailingTeam} closing the gap`;
	} else return {
		score: scores.comeback.none,
		reason: ""
	};
	const floored = applyProgressFloor(tier, scores.comeback.flatFloor, progress);
	const ageMs = ageSince(lastScoreChangeTimestamp(history), now);
	return decaySignal(floored, reason, ageMs, config.decayHalfLifeMs.comeback);
};
const computeWinProbVarianceScore = (winProbHistory) => {
	const { maxAvgDist, minDataPoints } = scorerTunables.scores.winProbabilityVariance;
	if (winProbHistory.length < minDataPoints) return void 0;
	const n = winProbHistory.length;
	const raw = 5 - winProbHistory.reduce((sum, p) => sum + Math.abs(p - .5), 0) / n / maxAvgDist * 2 * 5;
	return Math.round(clamp(raw, -5, 5));
};
const computePowerScore = (game, history = [], stallCount = 0, winProbabilityHistory = []) => {
	if (game.intermission) return normalizePowerScoreResult({
		gameId: game.id,
		total: 0,
		closeness: 0,
		lateGame: 0,
		momentum: 0,
		leadChanges: 0,
		comeback: 0,
		reason: "",
		stalled: false
	});
	const config = sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball;
	const progress = getGameProgress(game, config);
	const now = deriveNow(history);
	const closeness = getCloseness(game, config, progress);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config, now);
	const leadChanges = getLeadChanges(history, config, now);
	const comeback = getComeback(game, history, config, progress, now);
	const winProbVariance = computeWinProbVarianceScore(winProbabilityHistory);
	const signalsSubtotal = closeness.score + lateGame.score + momentum.score + leadChanges.score + comeback.score;
	const stallStep = stallPenaltySteps.find((s) => stallCount >= s.minPolls);
	const stalled = stallStep !== void 0;
	const stallPenalty = stalled ? stallStep.deduction : 0;
	const rawTotal = Math.max(0, signalsSubtotal - stallPenalty) + (winProbVariance ?? 0);
	const reason = [
		momentum.reason,
		comeback.reason,
		leadChanges.reason,
		lateGame.reason,
		closeness.reason
	].filter(Boolean).slice(0, 2).join(", ") || scorerTunables.reasons.fallback;
	return normalizePowerScoreResult({
		gameId: game.id,
		total: rawTotal,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		leadChanges: leadChanges.score,
		comeback: comeback.score,
		...winProbVariance !== void 0 ? { winProbabilityVariance: winProbVariance } : {},
		reason,
		stalled,
		stallPenalty,
		baseTotal: signalsSubtotal
	});
};
//#endregion
//#region scripts/powerscore/simulateDistribution.ts
/**
* PowerScore distribution harness.
*
* Drives MockGameSimulator through many simulated polls, scores every live game with the scorer,
* and prints the resulting distributions so we can verify goals empirically:
*   - 0s / low totals are common (no more 20–30 floor)
*   - totals spread sensibly across the 0–100 range
*   - the best-vs-active "switch gap" distribution → recalibrated sensitivityThresholds
*   - breakdown by history depth exposes regressions in early-game / no-history scenarios
*
* Mirrors the extension background loop: score is computed against the history that does NOT yet
* include the current poll (so decay ages match runtime), then the current snapshot is appended.
*
* Win probability history is synthesized from game state (score margin × game progress) using a
* logistic function — a stand-in for the real ESPN win-prob chart data the scorer uses at runtime.
*
* Run: npm run powerscore:simulate -- [ticks]
*      npm run powerscore:simulate -- --early-game    (stress test only, skips main simulation)
*/
const earlyGameMode = process.argv.includes("--early-game");
const pollIntervalMs = 15e3;
const ticks = earlyGameMode ? 0 : Math.max(1e3, Number(process.argv[2]) || 4e4);
const historyWindowMsFor = (game) => sportTypeConfigMap[game.sportType]?.historyWindowMs ?? 3e5;
const winProbScaleBySport = {
	basketball: 11,
	football: 7,
	baseball: 2,
	softball: 2,
	hockey: 1.5,
	soccer: 1.2
};
const deriveWinProb = (game) => {
	const diff = game.homeTeam.score - game.awayTeam.score;
	const scale = winProbScaleBySport[game.sportType] ?? 8;
	const league = leagueConfigMap[game.league];
	const config = sportTypeConfigMap[game.sportType];
	if (!league || !config) return .5;
	const regularPeriods = Math.max(1, league.regularPeriods);
	const period = game.period ?? 1;
	const certainty = .5 + (period > regularPeriods ? 1 : Math.min((period - .5) / regularPeriods, 1)) * 2;
	const x = diff / scale * certainty;
	return 1 / (1 + Math.exp(-x));
};
const percentile = (sortedValues, p) => {
	if (sortedValues.length === 0) return 0;
	return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, Math.round(p / 100 * (sortedValues.length - 1))))];
};
const summarize = (values) => {
	if (values.length === 0) return "no samples";
	const sorted = values.toSorted((a, b) => a - b);
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const stat = (p) => String(percentile(sorted, p)).padStart(3);
	return `min ${stat(0)}  p10 ${stat(10)}  p25 ${stat(25)}  p50 ${stat(50)}  p75 ${stat(75)}  p90 ${stat(90)}  p95 ${stat(95)}  p99 ${stat(99)}  max ${stat(100)}  mean ${mean.toFixed(1)}`;
};
const simulator = new MockGameSimulator();
const history = /* @__PURE__ */ new Map();
const winProbHistory = /* @__PURE__ */ new Map();
const totalsBySport = {};
const totalsByHistoryDepth = {
	"0": [],
	"1-2": [],
	"3-9": [],
	"10+": []
};
const allTotals = [];
const signalSamples = {
	closeness: [],
	lateGame: [],
	momentum: [],
	leadChanges: [],
	comeback: [],
	winProbVariance: []
};
const switchGaps = [];
let zeroTotalCount = 0;
let liveSampleCount = 0;
const historyDepthBucket = (depth) => {
	if (depth === 0) return "0";
	if (depth <= 2) return "1-2";
	if (depth <= 9) return "3-9";
	return "10+";
};
for (let tick = 0; tick < ticks; tick++) {
	const now = tick * pollIntervalMs;
	const games = simulator.tick().filter((game) => game.status === "in");
	const tickTotals = [];
	for (const game of games) {
		const gameHistory = history.get(game.id) ?? [];
		const result = computePowerScore(game, gameHistory, 0, winProbHistory.get(game.id) ?? []);
		allTotals.push(result.total);
		(totalsBySport[game.sportType] ??= []).push(result.total);
		(totalsByHistoryDepth[historyDepthBucket(gameHistory.length)] ??= []).push(result.total);
		signalSamples.closeness.push(result.closeness);
		signalSamples.lateGame.push(result.lateGame);
		signalSamples.momentum.push(result.momentum);
		signalSamples.leadChanges.push(result.leadChanges);
		signalSamples.comeback.push(result.comeback);
		if (result.winProbabilityVariance !== void 0) signalSamples.winProbVariance.push(result.winProbabilityVariance);
		if (result.total === 0) zeroTotalCount++;
		liveSampleCount++;
		tickTotals.push(result.total);
	}
	if (tickTotals.length >= 2) {
		const sortedTickTotals = tickTotals.toSorted((a, b) => b - a);
		switchGaps.push(sortedTickTotals[0] - sortedTickTotals[1]);
	}
	for (const game of games) {
		const snapshots = history.get(game.id) ?? [];
		snapshots.push({
			gameId: game.id,
			timestamp: now,
			homeScore: game.homeTeam.score,
			awayScore: game.awayTeam.score
		});
		const cutoff = now - historyWindowMsFor(game);
		while (snapshots.length > 1 && snapshots[0].timestamp < cutoff) snapshots.shift();
		history.set(game.id, snapshots);
		const probs = winProbHistory.get(game.id) ?? [];
		probs.push(deriveWinProb(game));
		while (probs.length > snapshots.length) probs.shift();
		winProbHistory.set(game.id, probs);
	}
}
const sortedGaps = switchGaps.toSorted((a, b) => a - b);
const levelToPercentile = {
	1: 97,
	2: 88,
	3: 72,
	4: 52,
	5: 34,
	6: 18,
	7: 2
};
const suggestedThresholds = {};
for (let level = 1; level <= 7; level++) {
	const value = percentile(sortedGaps, levelToPercentile[level]);
	suggestedThresholds[level] = level === 7 ? Math.max(1, value) : Math.max(1, value);
}
if (ticks > 0) {
	console.log(`\nPowerScore distribution — ${ticks.toLocaleString()} polls, ${liveSampleCount.toLocaleString()} live-game samples\n`);
	console.log("TOTAL");
	console.log(`  ${summarize(allTotals)}`);
	console.log(`  total === 0: ${(zeroTotalCount / Math.max(1, liveSampleCount) * 100).toFixed(1)}% of live samples\n`);
	console.log("TOTAL by sport");
	for (const sport of Object.keys(totalsBySport).toSorted()) console.log(`  ${sport.padEnd(11)} ${summarize(totalsBySport[sport])}`);
	console.log("\nTOTAL by history depth (snapshots available when scored)");
	for (const bucket of [
		"0",
		"1-2",
		"3-9",
		"10+"
	]) {
		const samples = totalsByHistoryDepth[bucket] ?? [];
		console.log(`  depth ${bucket.padEnd(4)} (n=${samples.length.toLocaleString().padStart(7)})  ${summarize(samples)}`);
	}
	console.log("\nSIGNALS");
	for (const signal of Object.keys(signalSamples)) {
		const samples = signalSamples[signal];
		const label = signal === "winProbVariance" ? `${signal.padEnd(11)} (${samples.length.toLocaleString()} samples with ≥5 data pts)` : signal.padEnd(11);
		console.log(`  ${label} ${summarize(samples)}`);
	}
	console.log("\nSWITCH GAP (best − runner-up per poll)");
	console.log(`  ${summarize(switchGaps)}`);
	console.log("\nSUGGESTED sensitivityThresholds (paste into packages/core/src/constants.ts):");
	console.log("export const sensitivityThresholds: Record<number, number> = {");
	for (let level = 1; level <= 7; level++) {
		const label = {
			1: "Barely Active",
			2: "Passive",
			3: "Conservative",
			4: "Balanced (default)",
			5: "Eager",
			6: "Trigger Happy",
			7: "Overkill"
		}[level];
		console.log(`\t${level}: ${suggestedThresholds[level]},`.padEnd(10) + `// ${label} — ~p${levelToPercentile[level]} of switch gaps`);
	}
	console.log("};\n");
}
const makeSnapshotHistory = (count, homeScore, awayScore) => Array.from({ length: count }, (_, i) => ({
	gameId: "stress",
	timestamp: i * pollIntervalMs,
	homeScore,
	awayScore
}));
const earlyGameScenarios = [
	{
		label: "basketball tied buzzer (NBA Q4 1s)",
		game: {
			id: "stress",
			league: "nba",
			sportType: "basketball",
			homeTeam: {
				score: 78,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 78,
				abbreviation: "AWY"
			},
			period: 4,
			clockSeconds: 1
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "basketball 1-pt final min (NBA Q4 30s)",
		game: {
			id: "stress",
			league: "nba",
			sportType: "basketball",
			homeTeam: {
				score: 80,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 79,
				abbreviation: "AWY"
			},
			period: 4,
			clockSeconds: 30
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "hockey 1-goal final min (NHL P3 1m)",
		game: {
			id: "stress",
			league: "nhl",
			sportType: "hockey",
			homeTeam: {
				score: 2,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 1,
				abbreviation: "AWY"
			},
			period: 3,
			clockSeconds: 60
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "hockey tied final min (NHL P3 1s)",
		game: {
			id: "stress",
			league: "nhl",
			sportType: "hockey",
			homeTeam: {
				score: 1,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 1,
				abbreviation: "AWY"
			},
			period: 3,
			clockSeconds: 1
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "football 3-pt final min (NFL Q4 1m)",
		game: {
			id: "stress",
			league: "nfl",
			sportType: "football",
			homeTeam: {
				score: 21,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 18,
				abbreviation: "AWY"
			},
			period: 4,
			clockSeconds: 60
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "baseball 1-run 9th (MLB)",
		game: {
			id: "stress",
			league: "mlb",
			sportType: "baseball",
			homeTeam: {
				score: 3,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 2,
				abbreviation: "AWY"
			},
			period: 9,
			clockSeconds: 0
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "soccer tied 2nd half 85m (MLS)",
		game: {
			id: "stress",
			league: "mls",
			sportType: "soccer",
			homeTeam: {
				score: 1,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 1,
				abbreviation: "AWY"
			},
			period: 2,
			clockSeconds: 5100
		},
		depths: [
			0,
			1,
			3
		]
	},
	{
		label: "basketball blowout Q4 (NBA Q4 mid)",
		game: {
			id: "stress",
			league: "nba",
			sportType: "basketball",
			homeTeam: {
				score: 110,
				abbreviation: "HOM"
			},
			awayTeam: {
				score: 82,
				abbreviation: "AWY"
			},
			period: 4,
			clockSeconds: 400
		},
		depths: [
			0,
			1,
			3
		]
	}
];
console.log("\nEARLY-GAME / NO-HISTORY STRESS TEST\n");
console.log("  Validates scores at 0, 1, and 3 snapshot depths — catching ceiling regressions\n");
console.log("  scenario".padEnd(44) + "  depth  score  closeness  lateGame  signals");
console.log("  " + "-".repeat(88));
for (const { label, game, depths } of earlyGameScenarios) {
	for (const depth of depths) {
		const r = computePowerScore(game, makeSnapshotHistory(depth, game.homeTeam.score, game.awayTeam.score), 0, []);
		const signals = r.closeness + r.lateGame + r.momentum + r.leadChanges + r.comeback;
		const row = [
			`  ${label}`.padEnd(44),
			String(depth).padStart(7),
			String(r.total).padStart(7),
			String(r.closeness).padStart(11),
			String(r.lateGame).padStart(10),
			String(signals).padStart(10)
		].join("");
		console.log(row);
	}
	console.log();
}
//#endregion
