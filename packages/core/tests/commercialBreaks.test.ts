import { hasCommercialBreaks, nextCommercialBreak, type CommercialBreakEntry, type CommercialBreakInput, type CommercialBreakKind } from '../src/commercialBreaks';
import { nextClockStall, type ClockStallEntry } from '../src/scoring';
import type { Game, Team } from '../src/types';

// Every sequence below is a run of real polls from the recordings, at the recorder's own cadence:
// seconds since the first poll, then what the scoreboard said.
type BaseballPoll = [seconds: number, shortDetail: string, lastPlayId: string, lastPlayType: string, pitcherId: string | undefined, outs: number];
type ClockPoll = [seconds: number, displayClock: string, lastPlayId: string, lastPlayType: string];
type TextPoll = [seconds: number, displayClock: string, lastPlayId: string, lastPlayType: string, lastPlay: string];

const start = Date.UTC(2026, 9, 10, 1, 0);

const team = (id: string, abbreviation: string, score: number): Team => ({ id, name: abbreviation, abbreviation, score });

const clockSeconds = (display: string): number => {
	const [minutes, seconds] = display.includes(':') ? display.split(':') : ['0', display];
	return Number(minutes) * 60 + Math.floor(Number(seconds));
};

interface Verdict {
	seconds: number;
	kind?: CommercialBreakKind;
}

// The background worker's loop, for one game: each poll's verdict is fed into the next.
const replay = (
	polls: { seconds: number; game: Game; powerPlay?: CommercialBreakInput['powerPlay'] }[],
	initial?: Omit<CommercialBreakEntry, 'lastPlaySeenAt'>,
): Verdict[] => {
	let entry: CommercialBreakEntry | undefined = initial ? { ...initial, lastPlaySeenAt: start } : undefined;
	return polls.map(({ seconds, game, powerPlay }) => {
		entry = nextCommercialBreak(game, entry, { now: start + seconds * 1000, powerPlay });
		return { seconds, kind: entry.kind };
	});
};

const flagged = (verdicts: Verdict[], kind?: CommercialBreakKind): number[] => (
	verdicts.filter(verdict => (kind ? verdict.kind === kind : verdict.kind !== undefined)).map(verdict => verdict.seconds)
);

const between = (verdicts: Verdict[], from: number, to: number): number[] => (
	verdicts.filter(verdict => verdict.seconds >= from && verdict.seconds <= to).map(verdict => verdict.seconds)
);

// CLE @ CHW, 2026-10-09 02:29:13 UTC onward.
const whiteSoxGuardiansSixth: BaseballPoll[] = [
	[0, 'Top 6th', '4019079931008020036', 'Strike Looking', '4927630', 1],
	[15, 'Top 6th', '4019079931008990057', 'Play Result', '4927630', 1],
	[30, 'Top 6th', '4019079931009010001', 'Start Batter/Pitcher', '4927630', 1],
	[45, 'Top 6th', '4019079931009010001', 'Start Batter/Pitcher', '4927630', 1],
	[60, 'Top 6th', '4019079931009010001', 'Start Batter/Pitcher', '4927630', 1],
	[75, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4927630', 1],
	[90, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4927630', 1],
	[105, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4927630', 1],
	[121, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4927630', 1],
	[136, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[151, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[166, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[181, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[196, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[211, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[226, 'Top 6th', '4019079931010010001', 'Start Batter/Pitcher', '4991171', 1],
	[241, 'Top 6th', '4019079931010020398', 'Play Result', '4991171', 1],
	[256, 'Top 6th', '4019079931010020398', 'Play Result', '4991171', 1],
	[271, 'Top 6th', '4019079931010020398', 'Play Result', '4991171', 1],
	[286, 'Top 6th', '4019079931010020398', 'Play Result', '4991171', 1],
	[302, 'Top 6th', '4019079931010020298', 'Play Result', '4991171', 2],
	[317, 'Top 6th', '4019079931010020298', 'Play Result', '4991171', 2],
	[332, 'Top 6th', '4019079931010020298', 'Play Result', '4991171', 2],
	[347, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[362, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[377, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[392, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[407, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[422, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[437, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[452, 'Mid 6th', '4019079931099990058', 'End Inning', undefined, 0],
	[467, 'Mid 6th', '4019079931010990057', 'Play Result', '4991171', 3],
	[482, 'Mid 6th', '4019079931010990057', 'Play Result', '4991171', 3],
	[497, 'Mid 6th', '4019079931010990057', 'Play Result', '4991171', 3],
	[513, 'Bot 6th', '4019079931010990057', 'Play Result', '4991171', 3],
	[528, 'Bot 6th', '4019079931101010001', 'Start Batter/Pitcher', '5194333', 0],
	[543, 'Bot 6th', '4019079931101020021', 'Foul Ball', '5194333', 0],
	[558, 'Bot 6th', '4019079931101030021', 'Foul Ball', '5194333', 0],
	[573, 'Bot 6th', '4019079931101030021', 'Foul Ball', '5194333', 0],
	[588, 'Bot 6th', '4019079931101990057', 'Play Result', '5194333', 1],
	[603, 'Bot 6th', '4019079931102010001', 'Start Batter/Pitcher', '5194333', 1],
	[618, 'Bot 6th', '4019079931102020021', 'Foul Ball', '5194333', 1],
	[633, 'Bot 6th', '4019079931102030021', 'Foul Ball', '5194333', 1],
	[648, 'Bot 6th', '4019079931102030021', 'Foul Ball', '5194333', 1],
	[663, 'Bot 6th', '4019079931102040021', 'Foul Ball', '5194333', 1],
	[679, 'Bot 6th', '4019079931102040021', 'Foul Ball', '5194333', 1],
	[694, 'Bot 6th', '4019079931102990057', 'Play Result', '5194333', 2],
	[709, 'Bot 6th', '4019079931103010001', 'Start Batter/Pitcher', '5194333', 2],
	[724, 'Bot 6th', '4019079931103030005', 'Ball', '5194333', 2],
	[739, 'Bot 6th', '4019079931103030005', 'Ball', '5194333', 2],
	[754, 'Bot 6th', '4019079931103040005', 'Ball', '5194333', 2],
	[769, 'Bot 6th', '4019079931103040005', 'Ball', '5194333', 2],
	[784, 'Bot 6th', '4019079931103050036', 'Strike Looking', '5194333', 2],
	[799, 'Bot 6th', '4019079931103060036', 'Strike Looking', '5194333', 2],
	[814, 'Bot 6th', '4019079931103990057', 'Play Result', '5194333', 2],
	[829, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '5194333', 2],
	[844, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '5194333', 2],
	[860, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '5194333', 2],
	[875, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '5194333', 2],
	[890, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[905, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[920, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[935, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[950, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[965, 'Bot 6th', '4019079931104010001', 'Start Batter/Pitcher', '4187661', 2],
	[980, 'Bot 6th', '4019079931104020036', 'Strike Looking', '4187661', 2],
	[995, 'Bot 6th', '4019079931104020036', 'Strike Looking', '4187661', 2],
];

// ATL @ NO, 2026-10-06 02:49:25 UTC onward.
const falconsSaintsTouchdown: ClockPoll[] = [
	[0, '13:33', '4018729793434', 'Pass Incompletion'],
	[15, '13:28', '4018729793457', 'Pass Reception'],
	[30, '13:28', '4018729793457', 'Pass Reception'],
	[45, '13:28', '4018729793482', 'Rushing Touchdown'],
	[60, '13:00', '4018729793482', 'Rushing Touchdown'],
	[75, '13:00', '-438323', 'Extra Point Good'],
	[91, '13:00', '4018729793513', 'Official Timeout'],
	[106, '13:00', '4018729793513', 'Official Timeout'],
	[121, '13:00', '4018729793513', 'Official Timeout'],
	[136, '13:00', '4018729793513', 'Official Timeout'],
	[151, '13:00', '4018729793513', 'Official Timeout'],
	[166, '13:00', '4018729793513', 'Official Timeout'],
	[181, '13:00', '4018729793513', 'Official Timeout'],
	[196, '13:00', '4018729793513', 'Official Timeout'],
	[212, '13:00', '4018729793513', 'Official Timeout'],
	[227, '13:00', '4018729793513', 'Official Timeout'],
	[242, '13:00', '4018729793513', 'Official Timeout'],
	[257, '13:00', '4018729793513', 'Official Timeout'],
	[272, '13:00', '4018729793520', 'Kickoff'],
	[287, '13:00', '4018729793520', 'Kickoff'],
	[302, '12:55', '4018729793535', 'Official Timeout'],
	[318, '12:55', '4018729793535', 'Official Timeout'],
];

// SAC @ LAL, 2026-10-09 03:42:10 UTC onward.
const lakersKingsTimeout: ClockPoll[] = [
	[0, '3:00', '401898717321', 'Defensive Rebound'],
	[15, '3:00', '401898717323', 'Full Timeout'],
	[30, '3:00', '401898717323', 'Full Timeout'],
	[45, '3:00', '401898717323', 'Full Timeout'],
	[60, '3:00', '401898717323', 'Full Timeout'],
	[75, '3:00', '401898717323', 'Full Timeout'],
	[90, '3:00', '401898717323', 'Full Timeout'],
	[105, '3:00', '401898717323', 'Full Timeout'],
	[120, '2:59', '401898717327', 'Substitution'],
	[136, '2:59', '401898717327', 'Substitution'],
	[151, '2:22', '401898717328', 'Layup Driving Reverse'],
	[166, '2:14', '401898717332', 'Offensive Rebound'],
	[181, '2:06', '401898717334', 'Offensive Rebound'],
	[196, '2:06', '401898717334', 'Offensive Rebound'],
];

// PHX @ DET, 2026-10-06 01:38:54 UTC onward.
const pistonsSunsFinalMinute: ClockPoll[] = [
	[0, '49.3', '401908947753', 'Out of Bounds - Lost Ball Turnover'],
	[15, '49.3', '401908947757', 'Offensive Foul Turnover'],
	[30, '33.8', '401908947760', 'Full Timeout'],
	[46, '33.8', '401908947760', 'Full Timeout'],
	[61, '33.8', '401908947760', 'Full Timeout'],
	[76, '33.8', '401908947760', 'Full Timeout'],
	[92, '33.8', '401908947760', 'Full Timeout'],
	[107, '33.8', '401908947760', 'Full Timeout'],
	[122, '33.8', '401908947760', 'Full Timeout'],
	[137, '33.8', '401908947760', 'Full Timeout'],
	[152, '33.8', '401908947760', 'Full Timeout'],
];

// CGY @ VAN, 2026-10-04 02:31:55 UTC onward.
const canucksFlamesFirst: TextPoll[] = [
	[0, '10:30', '401892440000001980', 'Penalty Shot Infraction', 'Brennan Othmann Minor'],
	[15, '10:30', '401892440000001980', 'Penalty Shot Infraction', 'Brennan Othmann Minor'],
	[30, '10:30', '401892440000001980', 'Penalty Shot Infraction', 'Brennan Othmann Minor'],
	[46, '10:25', '401892440000001930', 'Face Off', 'Morgan Frost faceoff won against Aatu Räty'],
	[61, '10:04', '401892440000002030', 'Blocked', 'Kevin Bahl shot blocked by Arshdeep Bains'],
	[76, '10:01', '401892440000002030', 'Blocked', 'Kevin Bahl shot blocked by Arshdeep Bains'],
	[92, '9:57', '401892440000000130', 'Stoppage', 'Goalie Stopped'],
	[107, '9:57', '401892440000000130', 'Stoppage', 'Goalie Stopped'],
	[122, '9:32', '401892440000002130', 'Shot', 'Max Sasson saved by Devin Cooley'],
	[137, '9:32', '401892440000002130', 'Shot', 'Max Sasson saved by Devin Cooley'],
	[152, '9:14', '401892440000002130', 'Shot', 'Max Sasson saved by Devin Cooley'],
	[168, '9:02', '401892440000002130', 'Shot', 'Max Sasson Snap Shot saved by Devin Cooley'],
	[183, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[198, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[213, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[228, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[244, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[259, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[274, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[290, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[305, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[320, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[336, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
	[351, '8:56', '401892440000000140', 'Stoppage', 'Goalie Stopped'],
];

// SC @ FLA, 2026-10-10 19:19:26 UTC onward.
const gatorsGamecocksExtraPoint: ClockPoll[] = [
	[0, '8:36', '401856714502', 'Passing Touchdown'],
	[15, '8:36', '-89282057', 'Extra Point Good'],
	[31, '8:36', '-89282057', 'Extra Point Good'],
	[46, '8:36', '-89282057', 'Extra Point Good'],
	[61, '8:36', '-89282057', 'Extra Point Good'],
	[76, '8:36', '-89282057', 'Extra Point Good'],
	[91, '8:36', '-89282057', 'Extra Point Good'],
	[107, '8:36', '-89282057', 'Extra Point Good'],
	[122, '8:36', '-89282057', 'Extra Point Good'],
	[137, '8:36', '-89282057', 'Extra Point Good'],
	[152, '8:36', '-89282057', 'Extra Point Good'],
	[167, '8:36', '-89282057', 'Extra Point Good'],
	[183, '8:36', '-89282057', 'Extra Point Good'],
	[198, '8:32', '-89282057', 'Extra Point Good'],
	[213, '8:32', '-89282057', 'Extra Point Good'],
	[228, '8:31', '-89282057', 'Extra Point Good'],
	[243, '8:27', '-89282057', 'Extra Point Good'],
	[259, '8:09', '401856714515', 'Rush'],
	[274, '8:09', '401856714515', 'Rush'],
	[289, '8:09', '401856714519', 'Rush'],
];

// KU @ UTAH, 2026-10-11 01:42:04 UTC onward.
const utesJayhawksDrill: TextPoll[] = [
	[0, '0:58', '401856827400', 'Pass Reception', '(01:09) Shotgun #8 I.Marshall pass compl'],
	[15, '0:56', '401856827400', 'Pass Reception', '(01:09) Shotgun #8 I.Marshall pass compl'],
	[30, '0:59', '401856827405', 'Pass Reception', '(01:04) Shotgun #8 I.Marshall pass compl'],
	[46, '0:59', '401856827412', 'Timeout', 'Timeout Kansas, clock 00:59'],
	[61, '0:59', '401856827412', 'Timeout', 'Timeout Kansas, clock 00:59'],
	[76, '0:59', '401856827412', 'Timeout', 'Timeout Kansas, clock 00:59'],
	[91, '0:54', '401856827412', 'Timeout', 'Timeout Kansas, clock 00:59'],
	[106, '0:47', '401856827412', 'Timeout', 'Timeout Kansas, clock 00:59'],
	[122, '0:47', '401856827410', 'Pass Reception', '(00:59) Shotgun #8 I.Marshall pass compl'],
];

const baseballGame = ([, shortDetail, lastPlayId, lastPlayType, pitcherId, outs]: BaseballPoll): Game => ({
	id: '401907993',
	league: 'mlb',
	sportType: 'baseball',
	homeTeam: team('4', 'CHW', 2),
	awayTeam: team('5', 'CLE', 3),
	period: 6,
	clockSeconds: 0,
	status: 'in',
	topOfInning: shortDetail.startsWith('Top'),
	inningBreak: /^(Mid|End)\b/.test(shortDetail),
	bso: { balls: 0, strikes: 0, outs },
	...(pitcherId ? { atBat: { pitcher: { id: pitcherId, name: 'Pitcher' }, batter: { name: 'Batter' } } } : {}),
	lastPlayId,
	lastPlayType,
});

const clockGame = (base: Omit<Game, 'clockSeconds' | 'lastPlayId' | 'lastPlayType'>) => ([, display, lastPlayId, lastPlayType, lastPlay]: ClockPoll | TextPoll): Game => ({
	...base,
	clockSeconds: clockSeconds(display),
	lastPlayId,
	lastPlayType,
	...(lastPlay !== undefined ? { lastPlay } : {}),
});

const polls = <T extends { 0: number }>(rows: T[], toGame: (row: T) => Game) => rows.map(row => ({ seconds: row[0], game: toGame(row) }));

describe('baseball, with no clock to watch', () => {
	const verdicts = replay(polls(whiteSoxGuardiansSixth, baseballGame));

	test('the Mid 6th break is a commercial for as long as the teams are changing sides', () => {
		expect(flagged(verdicts, 'inningBreak')).toEqual(between(verdicts, 347, 497));
	});

	test('a reliever coming in mid-inning is a break until his first pitch', () => {
		expect(flagged(verdicts, 'pitchingChange')).toEqual([...between(verdicts, 136, 226), ...between(verdicts, 890, 965)]);
	});

	test('the new half\'s own pitcher is not a pitching change, though the feed still shows three outs', () => {
		expect(between(verdicts, 513, 875).filter(seconds => flagged(verdicts).includes(seconds))).toEqual([]);
	});
});

describe('the NFL, from the TV timeouts its feed logs', () => {
	const game = clockGame({ id: '401872979', league: 'nfl', sportType: 'football', homeTeam: team('18', 'NO', 24), awayTeam: team('1', 'ATL', 17), period: 4, status: 'in' });
	const verdicts = replay(polls(falconsSaintsTouchdown, game));

	test('the break after the extra point and the one after the kickoff are both caught as they start', () => {
		expect(flagged(verdicts, 'tvTimeout')).toEqual([...between(verdicts, 91, 257), ...between(verdicts, 302, 318)]);
	});

	test('the kickoff between them is play, and so is the touchdown itself', () => {
		expect(flagged(verdicts)).not.toContain(272);
		expect(flagged(verdicts)).not.toContain(45);
		expect(flagged(verdicts)).not.toContain(75);
	});

	test('the old clock stall only noticed the first break 90 seconds after the new rule did', () => {
		let stall: ClockStallEntry | undefined;
		const stalledAt = polls(falconsSaintsTouchdown, game).find(({ game: poll }) => {
			stall = nextClockStall(poll, stall);
			return (stall?.stallCount ?? 0) >= 8;
		});
		expect(stalledAt?.seconds).toBe(181);
		expect(flagged(verdicts)[0]).toBe(91);
	});
});

describe('basketball, from its timeouts', () => {
	test('a full timeout is a break, held through the substitutions until the ball is live', () => {
		const game = clockGame({ id: '401898717', league: 'nba', sportType: 'basketball', homeTeam: team('13', 'LAL', 49), awayTeam: team('23', 'SAC', 33), period: 2, status: 'in' });
		const verdicts = replay(polls(lakersKingsTimeout, game));
		expect(flagged(verdicts)).toEqual(between(verdicts, 15, 136));
	});

	test('a timeout with 33.8 seconds left in a three-point game is the one a fan stays for', () => {
		const game = clockGame({ id: '401908947', league: 'nba', sportType: 'basketball', homeTeam: team('8', 'DET', 105), awayTeam: team('21', 'PHX', 102), period: 4, status: 'in' });
		expect(flagged(replay(polls(pistonsSunsFinalMinute, game)))).toEqual([]);
	});
});

describe('the NHL, from where its TV timeouts fall on the clock', () => {
	const game = clockGame({ id: '401892440', league: 'nhl', sportType: 'hockey', homeTeam: team('22', 'VAN', 1), awayTeam: team('3', 'CGY', 1), period: 1, status: 'in' });
	// The 14:00 timeout had already been taken earlier in the period.
	const earlierInThePeriod = { usedTvMarks: { 1: [14] } };

	test('a whistle that was over in seconds leaves the 10:00 timeout for the next stoppage, which is it', () => {
		const verdicts = replay(polls(canucksFlamesFirst, game), earlierInThePeriod);
		expect(flagged(verdicts)).toEqual(between(verdicts, 213, 351));
	});

	test('no TV timeout during a power play', () => {
		const verdicts = replay(polls(canucksFlamesFirst, game).map(poll => ({ ...poll, powerPlay: 'home' as const })), earlierInThePeriod);
		expect(flagged(verdicts)).toEqual([]);
	});

	test('no TV timeout straight after an icing', () => {
		const icing = canucksFlamesFirst.map(([seconds, display, id, type, text]): TextPoll => [seconds, display, id, type, text === 'Goalie Stopped' ? 'Icing' : text]);
		expect(flagged(replay(polls(icing, game), earlierInThePeriod))).toEqual([]);
	});
});

describe('college football, from the plays a break follows', () => {
	test('the extra point is the break, until the next snap', () => {
		const game = clockGame({ id: '401856714', league: 'ncaaf', sportType: 'football', homeTeam: team('57', 'FLA', 13), awayTeam: team('2579', 'SC', 24), period: 3, status: 'in' });
		const verdicts = replay(polls(gatorsGamecocksExtraPoint, game));
		expect(flagged(verdicts, 'scoreBreak')).toEqual(between(verdicts, 15, 243));
	});

	test('a timeout with 59 seconds left in the half is the offense saving the clock', () => {
		const game = clockGame({ id: '401856827', league: 'ncaaf', sportType: 'football', homeTeam: team('254', 'UTAH', 21), awayTeam: team('2305', 'KU', 7), period: 2, status: 'in' });
		expect(flagged(replay(polls(utesJayhawksDrill, game)))).toEqual([]);
	});

	test('the timeout text\'s own clock beats a scoreboard clock left at 15:00', () => {
		const game = clockGame({ id: '401856827', league: 'ncaaf', sportType: 'football', homeTeam: team('254', 'UTAH', 21), awayTeam: team('2305', 'KU', 7), period: 2, status: 'in' });
		const frozen = utesJayhawksDrill.map(([seconds, , id, type, text]): TextPoll => [seconds, '15:00', id, type, text]);
		expect(flagged(replay(polls(frozen, game)))).toEqual([]);
	});

	const drive = (clockMoves: boolean): TextPoll[] => [
		...Array.from({ length: 10 }, (_, index): TextPoll => [index * 30, clockMoves ? `${12 - index}:00` : '15:00', `play-${index}`, 'Rush', 'rush for 4 yards']),
		[300, clockMoves ? '2:30' : '15:00', 'pat', 'Extra Point Good', '(KICK)'],
		[330, clockMoves ? '2:30' : '15:00', 'pat', 'Extra Point Good', '(KICK)'],
	];
	const college = clockGame({ id: 'ncaaf-feed', league: 'ncaaf', sportType: 'football', homeTeam: team('1', 'HOME', 14), awayTeam: team('2', 'AWAY', 7), period: 3, status: 'in' });

	test('a scoreboard whose clock keeps up gets its score breaks', () => {
		expect(flagged(replay(polls(drive(true), college)), 'scoreBreak')).toEqual([300, 330]);
	});

	test('one whose clock has stopped being kept is too late to time a break by', () => {
		expect(flagged(replay(polls(drive(false), college)))).toEqual([]);
	});

	// One character per play, the extra point last: 1 when the clock moved since the play before,
	// 0 when it sat still. The first play always reads as moved, having nothing to compare with.
	const playsFrom = (pattern: string): TextPoll[] => {
		let clock = 900;
		const rows = [...pattern].map((moved, index): TextPoll => {
			if (moved === '1') clock -= 30;
			const display = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
			const last = index === pattern.length - 1;
			return [index * 30, display, last ? 'pat' : `play-${index}`, last ? 'Extra Point Good' : 'Rush', last ? '(KICK)' : 'rush for 4 yards'];
		});
		const [seconds, ...rest] = rows.at(-1)!;
		return [...rows, [seconds + 30, ...rest]];
	};

	test.each([
		['11111111111', true],
		['10000000000', false],
		['11100000000', false],
		['11110000000', true],
		['10000000011', false],
		['1000000000', false],
		['100000000', true],
		['100000000001', false],
		['1000000000111', true],
		['1010101010101', true],
	])('plays %s: the extra point is timed as a break: %s', (pattern, timed) => {
		const verdicts = replay(polls(playsFrom(pattern), college));
		const pat = (pattern.length - 1) * 30;
		expect(flagged(verdicts, 'scoreBreak')).toEqual(timed ? [pat, pat + 30] : []);
	});
});

describe('leagues whose feed carries no plays keep the frozen clock', () => {
	const collegeHockey = (seconds: number): Game => ({
		id: 'ncaamh-1', league: 'ncaamh', sportType: 'hockey', homeTeam: team('1', 'BU', 2), awayTeam: team('2', 'BC', 2),
		period: 2, clockSeconds: seconds < 120 ? 600 - seconds : 480, status: 'in',
	});

	test('eight polls on one clock is a break, and the clock moving again ends it', () => {
		const verdicts = replay([0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255].map(seconds => ({ seconds, game: collegeHockey(seconds) })));
		const running = { seconds: 270, game: { ...collegeHockey(270), clockSeconds: 470 } };
		expect(flagged(verdicts, 'clockStall')).toEqual([240, 255]);
		expect(replay([...verdicts.map(({ seconds }) => ({ seconds, game: collegeHockey(seconds) })), running]).at(-1)?.kind).toBeUndefined();
	});
});

describe('soccer has no commercials during play', () => {
	const match = (): Game => ({
		id: 'epl-1', league: 'epl', sportType: 'soccer', homeTeam: team('1', 'ARS', 1), awayTeam: team('2', 'CHE', 1),
		period: 2, clockSeconds: 5400, status: 'in',
	});

	test('a clock frozen at 90:00 through stoppage time never reads as a break', () => {
		const verdicts = replay(Array.from({ length: 40 }, (_, index) => ({ seconds: index * 12, game: match() })));
		expect(flagged(verdicts)).toEqual([]);
		expect(hasCommercialBreaks(match())).toBe(false);
	});
});

describe('every league but soccer\'s has breaks to find', () => {
	test.each([['mlb', 'baseball'], ['csoft', 'softball'], ['nfl', 'football'], ['ncaaf', 'football'], ['nba', 'basketball'], ['ncaab', 'basketball'], ['nhl', 'hockey'], ['ncaamh', 'hockey']] as const)('%s', (league, sportType) => {
		expect(hasCommercialBreaks({ league, sportType })).toBe(true);
	});
});

describe('halftime and delays are already frozen by the status', () => {
	test('no break is reported while the game is in an intermission or delayed', () => {
		const verdicts = replay(polls(falconsSaintsTouchdown, row => ({ ...clockGame({ id: 'nfl-int', league: 'nfl', sportType: 'football', homeTeam: team('1', 'NO', 7), awayTeam: team('2', 'ATL', 7), period: 2, status: 'in' })(row), intermission: true })));
		expect(flagged(verdicts)).toEqual([]);
	});
});
