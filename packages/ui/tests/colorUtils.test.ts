import { crestBacking, pendingSwitchCrest, resolveChartLineColors, readableInkOn, readableTeamInkOnCard, resolveTeamColorPair, teamDisplayInk, teamRowWash } from '../src/components/colorUtils';

jest.mock('../src/components/logoSwitchColor', () => ({
	cachedLogoSwitchColor: (crest: string) => ({
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/120.png': '#F8DB3F',
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/97.png': '#050403',
	} as Record<string, string>)[crest],
}));

// Every matchup Apple Sports was checked against, with the colours ESPN publishes for each team
// and the colour Apple painted each side. Two are left out on purpose: Lakers @ Kings, where Apple
// has the Kings in black against ESPN's purple, and Red Sox @ Yankees, a finished game where Apple
// switched nobody and the rule switches the Red Sox.
const appleMatchups: [string, { color: string; alternateColor: string; logo?: string }, { color: string; alternateColor: string }, string, string][] = [
	['PHI @ ATL', { color: '#E81828', alternateColor: '#003278' }, { color: '#0C2340', alternateColor: '#BA0C2F' }, '#E81828', '#0C2340'],
	['PIT @ PHI', { color: '#000000', alternateColor: '#FDB71A' }, { color: '#FE5823', alternateColor: '#000000' }, '#000000', '#FE5823'],
	['CHC @ SD', { color: '#0E3386', alternateColor: '#CC3433' }, { color: '#2F241D', alternateColor: '#FFC425' }, '#0E3386', '#2F241D'],
	['CHW @ HOU', { color: '#000000', alternateColor: '#C4CED4' }, { color: '#002D62', alternateColor: '#EB6E1F' }, '#000000', '#002D62'],
	['PHI @ NJ', { color: '#FE5823', alternateColor: '#000000' }, { color: '#E30B2B', alternateColor: '#000000' }, '#FE5823', '#E30B2B'],
	['PIT @ CLE', { color: '#000000', alternateColor: '#FFB612' }, { color: '#472A08', alternateColor: '#FF3C00' }, '#000000', '#472A08'],
	['SEA @ CGY', { color: '#000D33', alternateColor: '#A3DCE4' }, { color: '#DD1A32', alternateColor: '#000000' }, '#000D33', '#DD1A32'],
	['IND @ WSH', { color: '#003B75', alternateColor: '#FFFFFF' }, { color: '#5A1414', alternateColor: '#FFB612' }, '#003B75', '#5A1414'],
	['NY @ PHI', { color: '#1D428A', alternateColor: '#F58426' }, { color: '#1D428A', alternateColor: '#E01234' }, '#F58426', '#1D428A'],
	['MD @ NEB', { color: '#CE1126', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/120.png' }, { color: '#E31937', alternateColor: '#FFFFFF' }, '#F8DB3F', '#E31937'],
	['NYY @ TB', { color: '#132448', alternateColor: '#C4CED4' }, { color: '#092C5C', alternateColor: '#8FBCE6' }, '#C4CED4', '#092C5C'],
	['UTSA @ RICE', { color: '#0C2340', alternateColor: '#F15A22' }, { color: '#00205B', alternateColor: '#C1C6C8' }, '#F15A22', '#00205B'],
	['MIA @ CLEM', { color: '#F47423', alternateColor: '#035131' }, { color: '#F56600', alternateColor: '#FFFFFF' }, '#035131', '#F56600'],
	['DET @ CAR', { color: '#0076B6', alternateColor: '#BBBBBB' }, { color: '#0085CA', alternateColor: '#000000' }, '#BBBBBB', '#0085CA'],
	['LOU @ NCSU', { color: '#C9001F', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png' }, { color: '#CC0000', alternateColor: '#FFFFFF' }, '#050403', '#CC0000'],
	['TB @ NYY', { color: '#092C5C', alternateColor: '#8FBCE6' }, { color: '#132448', alternateColor: '#C4CED4' }, '#8FBCE6', '#132448'],
	['SAC @ LAL', { color: '#5A2D81', alternateColor: '#6A7A82' }, { color: '#552583', alternateColor: '#FDB927' }, '#6A7A82', '#552583'],
	['BUF @ CBJ', { color: '#00468B', alternateColor: '#FDB71A' }, { color: '#002D62', alternateColor: '#E31937' }, '#FDB71A', '#002D62'],
	['NE @ BUF', { color: '#002A5C', alternateColor: '#C60C30' }, { color: '#00338D', alternateColor: '#D50A0A' }, '#C60C30', '#00338D'],
	['ALA @ MSST', { color: '#9E1B32', alternateColor: '#FFFFFF' }, { color: '#5D1725', alternateColor: '#C1C6C8' }, '#9E1B32', '#5D1725'],
];

describe('resolveTeamColorPair paints a matchup the way Apple Sports does', () => {
	test.each(appleMatchups)('%s', (_, away, home, awayExpected, homeExpected) => {
		expect(resolveTeamColorPair(away, home)).toEqual([awayExpected, homeExpected]);
	});
});

describe('pendingSwitchCrest', () => {
	const alabama = { color: '#9E1B32', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/333.png' };
	const redHome = { color: '#A6192E' };

	test('asks for the away crest when a clash needs a colour out of it', () => {
		expect(pendingSwitchCrest(alabama, redHome)).toEqual({ crest: 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/333.png', primary: '#9E1B32' });
	});

	test('asks for nothing once the crest has been read', () => {
		expect(pendingSwitchCrest(appleMatchups[9]![1], appleMatchups[9]![2])).toBeNull();
	});

	test('asks for nothing when there is no clash, or the alternate will do', () => {
		expect(pendingSwitchCrest(alabama, { color: '#0C2340' })).toBeNull();
		expect(pendingSwitchCrest({ ...alabama, alternateColor: '#000000' }, redHome)).toBeNull();
	});
});

describe('resolveTeamColorPair', () => {
	const away = { color: '#1D428A', alternateColor: '#FFC72C' };
	const home = { color: '#F1C40F', alternateColor: '#C8102E' };

	test('keeps both primaries when they are already far apart', () => {
		expect(resolveTeamColorPair({ color: '#FF0000' }, { color: '#00FF00' })).toEqual(['#FF0000', '#00FF00']);
	});

	test('falls back to the supplied defaults when a team has no colour', () => {
		expect(resolveTeamColorPair({}, {}, '#111111', '#EEEEEE')).toEqual(['#111111', '#EEEEEE']);
	});

	// An unparseable colour has no channels to measure, so it can never be judged usable.
	test('never emits a malformed colour string', () => {
		const [a, h] = resolveTeamColorPair({ color: 'not-a-color' }, { color: '#00FF00' }, '#123456', '#f87171');
		expect(a).toBe('#123456');
		expect(a).toMatch(/^#[\da-fA-F]{6}$/);
		expect(h).toMatch(/^#[\da-fA-F]{6}$/);
	});

	// ESPN's NHL scoreboard sends no alternates at all. A clash with nothing to swap in keeps both
	// teams' own colours rather than handing one side the default.
	test('keeps both primaries when a clash has no alternate to swap in', () => {
		const sabres = { color: '#00468B' };
		const blueJackets = { color: '#002D62' };
		expect(resolveTeamColorPair(sabres, blueJackets, '#2274A5', '#F75C03')).toEqual(['#00468B', '#002D62']);
	});

	test('changes the away team and leaves the home team, whichever way round they are', () => {
		const knicks = { color: '#1D428A', alternateColor: '#F58426' };
		const sixers = { color: '#1D428A', alternateColor: '#E01234' };
		expect(resolveTeamColorPair(knicks, sixers)[1]).toBe('#1D428A');
		expect(resolveTeamColorPair(sixers, knicks)[1]).toBe('#1D428A');
	});

	// A white side is the one thing the card cannot paint, so a white alternate is no alternate.
	test('keeps both primaries when the away alternate is white and the home team has none', () => {
		const alabama = { color: '#9E1B32', alternateColor: '#FFFFFF' };
		const redHome = { color: '#A6192E' };
		expect(resolveTeamColorPair(alabama, redHome)).toEqual(['#9E1B32', '#A6192E']);
	});

	test('switches the home team only when the away team has nothing to switch to', () => {
		const alabama = { color: '#9E1B32', alternateColor: '#FFFFFF' };
		const redHome = { color: '#A6192E', alternateColor: '#000000' };
		expect(resolveTeamColorPair(alabama, redHome)).toEqual(['#9E1B32', '#000000']);
	});

	test('returns well-separated primaries unchanged', () => {
		const separatedAway = { color: '#1D428A', alternateColor: '#FFC72C' };
		const separatedHome = { color: '#F1C40F', alternateColor: '#C8102E' };
		expect(resolveTeamColorPair(separatedAway, separatedHome, '#60a5fa', '#f87171'))
			.toEqual(['#1D428A', '#F1C40F']);
	});

	test('is deterministic for the same input', () => {
		expect(resolveTeamColorPair(away, home)).toEqual(resolveTeamColorPair(away, home));
	});
});

// Contrast against the light detail cards, #f8fafc, luminance 0.9536.
const srgbChannel = (value: number): number => {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const contrastOnCard = (hex: string): number => {
	const parsed = hex.replace('#', '');
	const [red, green, blue] = [0, 2, 4].map(i => Number.parseInt(parsed.slice(i, i + 2), 16));
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return (0.9536 + 0.05) / (luminance + 0.05);
};

// The light detail cards are #f8fafc, luminance 0.9536. Small text wants 4.5:1, which puts the
// ceiling on the ink at luminance 0.173. Contrast here is (0.9536 + 0.05) / (L + 0.05).
describe('readableTeamInkOnCard', () => {
	// Untouched, gold is luminance 0.5379 and reaches 1.71:1 — not text so much as a suggestion
	// of one. It has to come down a long way, and it lands on a dark bronze rather than a grey.
	test('darkens the golds, which are the colours that actually fail', () => {
		expect(readableTeamInkOnCard('#FCB514')).toBe('#8a630b');
		expect(readableTeamInkOnCard('#FFB81C')).toBe('#8b650f');
	});

	// #002D72 is 12.40:1 and #CE1141 is 5.31:1. Both already clear the bar, and darkening either
	// would only muddy a colour that was fine.
	test('leaves a colour that already clears 4.5:1 exactly as it was', () => {
		expect(readableTeamInkOnCard('#002D72')).toBe('#002D72');
		expect(readableTeamInkOnCard('#CE1141')).toBe('#CE1141');
	});

	// #E81828 is 4.37:1 — under the bar by a hair, which is the case an eyeball misses.
	test('moves a colour that is only just short', () => {
		expect(readableTeamInkOnCard('#E81828')).toBe('#c81522');
	});

	test('every colour it returns clears 4.5:1 on the card', () => {
		const teamColors = [
			'#FCB514', '#FFB81C', '#E81828', '#ED1E36', '#002D72', '#CE1141', '#F74902',
			'#F75C03', '#041E42', '#071B2C', '#FFFFFF', '#000000', '#FFFF00', '#00FF00',
		];
		for (const color of teamColors) {
			expect(contrastOnCard(readableTeamInkOnCard(color))).toBeGreaterThanOrEqual(4.5);
		}
	});

	test('falls back rather than emitting a malformed colour', () => {
		expect(readableTeamInkOnCard(undefined)).toBe('#111827');
		expect(readableTeamInkOnCard(null)).toBe('#111827');
		expect(readableTeamInkOnCard('not-a-color')).toBe('#111827');
		expect(readableTeamInkOnCard('#fff')).toBe('#111827');
	});

	test('is idempotent, since a clamped colour already clears the bar', () => {
		const once = readableTeamInkOnCard('#FCB514');
		expect(readableTeamInkOnCard(once)).toBe(once);
	});
});

describe('teamRowWash', () => {
	// The 28 alpha the matchup card and the crest disc already use, fading out by 72% so whatever
	// sits at the end of the row lands on the plain card.
	test('fades the team colour out to the right', () => {
		expect(teamRowWash('#E81828')).toBe('linear-gradient(90deg, #E8182828, #E8182800 72%)');
	});

	test('reports nothing for a colour it cannot read, so no gradient is set', () => {
		expect(teamRowWash(undefined)).toBeUndefined();
		expect(teamRowWash('')).toBeUndefined();
		expect(teamRowWash('rgb(1,2,3)')).toBeUndefined();
	});
});

const contrastOn = (ink: string, surface: string): number => {
	const measure = (hex: string): number => {
		const [red, green, blue] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16));
		return 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	};
	const [a, b] = [measure(ink), measure(surface)];
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// The opening graphic draws a club's name across the card and its tricode at 3.4rem, both on the
// team's own colour. A club whose published colour is white, like this Penn State fixture, was being
// named in white on a white band.
describe('teamDisplayInk', () => {
	const pennState = { color: '#FFFFFF', alternateColor: '#061440' };

	test('names a club on its white band in the navy that club also owns', () => {
		expect(teamDisplayInk(pennState, '#FFFFFF')).toBe('#061440');
	});

	// The same club on the other side of the same swap. Nothing about a team with a white in its
	// palette should cost it the white ink on the half where white is the right answer.
	test('keeps white where white reads, which is most of the league', () => {
		expect(teamDisplayInk(pennState, '#061440')).toBe('#ffffff');
		expect(teamDisplayInk({ color: '#0C2340', alternateColor: '#C8102E' }, '#0C2340')).toBe('#ffffff');
		expect(teamDisplayInk({ color: '#A71930' }, '#A71930')).toBe('#ffffff');
	});

	// Carolina blue is the colour the 4.5:1 bar would have flipped. At display size white clears it
	// at 3.1:1, and inverting a card nobody had trouble reading is the worse answer.
	test('leaves the mid-tones white at the size this type is set', () => {
		expect(teamDisplayInk({ color: '#4B9CD3' }, '#4B9CD3')).toBe('#ffffff');
	});

	test('falls back to the near-black only when the club has no other colour to give', () => {
		expect(teamDisplayInk({ color: '#FFB81C' }, '#FFB81C')).toBe('#111827');
		expect(teamDisplayInk({ color: '#B1B3B3', alternateColor: '#FFFFFF' }, '#B1B3B3')).toBe('#111827');
	});

	// The surface is a resolved colour and the team's are ESPN's, normalised to upper case by
	// `apiClient` — a match on the raw strings would hand a club its own white back as its ink.
	test('never draws the ink in the colour it is standing on', () => {
		expect(teamDisplayInk(pennState, '#ffffff')).toBe('#061440');
	});

	// A card whose team carries no colour at all is drawn on `gameCardReveal`'s #dee2e6 rail.
	test('reads a colourless team on the fallback rail', () => {
		expect(teamDisplayInk({}, '#dee2e6')).toBe('#111827');
		expect(teamDisplayInk({}, 'not-a-color')).toBe('#ffffff');
	});

	test('every ink it picks clears 3:1 on the band it is drawn on', () => {
		const teams = [
			pennState,
			{ color: '#FFB81C' },
			{ color: '#B1B3B3', alternateColor: '#FFFFFF' },
			{ color: '#FFFFFF', alternateColor: '#C99700' },
			{ color: '#0C2340', alternateColor: '#C8102E' },
			{ color: '#FFCB05', alternateColor: '#00274C' },
			{ color: '#F1C40F' },
			{ color: '#000000', alternateColor: '#FFFFFF' },
		];
		for (const team of teams) {
			for (const surface of [team.color, team.alternateColor]) {
				if (!surface) continue;
				expect(contrastOn(teamDisplayInk(team, surface), surface)).toBeGreaterThanOrEqual(3);
			}
		}
	});
});

// Drawn on a team's own colour at label size: the end zone name on the football strip, and the
// pre-game leader rows in the popup.
describe('readableInkOn', () => {
	test('keeps white on the colours most of the league publishes', () => {
		for (const navy of ['#0C2340', '#002D72', '#003594', '#4F2683', '#860038', '#C8102E']) {
			expect(readableInkOn(navy)).toBe('#ffffff');
		}
	});

	test('flips to the near-black on the colours white disappears into', () => {
		for (const light of ['#FFB81C', '#FDBB30', '#FFFFFF', '#F1C40F', '#B1B3B3']) {
			expect(readableInkOn(light)).toBe('#111827');
		}
	});

	test('takes the caller\'s own pair of inks', () => {
		expect(readableInkOn('#0C2340', '#f8fafc', '#000000')).toBe('#f8fafc');
		expect(readableInkOn('#FFB81C', '#f8fafc', '#000000')).toBe('#000000');
	});

	// A team with no colour reaches this as whatever string ESPN sent. The light ink is the right
	// default because the surfaces it lands on in that state are dark.
	test('takes the light ink on a background it cannot read', () => {
		expect(readableInkOn('not-a-color')).toBe('#ffffff');
		expect(readableInkOn('')).toBe('#ffffff');
	});

	// The band this whole function turns on. 0.1833 is where *white* drops under 4.5:1, but
	// #111827 sits at luminance 0.0092 and does not clear 4.5:1 there either — the two inks are
	// equally readable at 0.19930, and the best either manages anywhere between is 4.21:1. A fixed
	// threshold at 0.1833 therefore spends that whole band handing back the worse of the two:
	// Atlanta's and Portland's #E03A3E would read at 4.09:1 where white gives 4.34:1, and the
	// Chargers' #0080C6 at 4.14:1 where white gives 4.28:1 — on the end zone carrying their name.
	test('keeps white across the band where neither ink clears the small-text bar', () => {
		for (const surface of ['#E03A3E', '#0080C6', '#777777', '#7b7b7b']) {
			expect(readableInkOn(surface)).toBe('#ffffff');
		}
	});

	// The flip belongs where the two curves cross, not where one of them leaves the bar. Calgary,
	// Carolina and Miami publish the first colours past the crossing, and they are the ones that
	// genuinely do read better in the near-black.
	test('flips only once the near-black overtakes white, and not a shade before', () => {
		for (const nowDark of ['#EF3B24', '#0085CA', '#008E97', '#7c7c7c']) {
			expect(readableInkOn(nowDark)).toBe('#111827');
		}
	});

	// Swept rather than sampled, because every fixed threshold is wrong somewhere and a handful of
	// team colours will not say where. A grey is the cheapest surface that walks the entire
	// luminance range, and these 256 straddle the crossing from both sides.
	test('never hands back the less legible of its two inks, on any grey it can be given', () => {
		for (let channel = 0; channel <= 255; channel++) {
			const grey = `#${channel.toString(16).padStart(2, '0').repeat(3)}`;
			const chosen = readableInkOn(grey);
			const rejected = chosen === '#ffffff' ? '#111827' : '#ffffff';
			expect(contrastOn(chosen, grey)).toBeGreaterThanOrEqual(contrastOn(rejected, grey));
		}
	});

	// Both ends, where the answer is not a judgement call at all.
	test('takes the obvious ink at either end of the range', () => {
		expect(readableInkOn('#000000')).toBe('#ffffff');
		expect(readableInkOn('#FFFFFF')).toBe('#111827');
		expect(contrastOn('#ffffff', '#000000')).toBeCloseTo(21, 10);
	});

	// LATENT rather than live: both callers — the football strip's end zone and the popup's
	// pre-game leader discs — take the default pair, so nothing reaches this today. Written down
	// because the failure mode is silent. `hexLuminance` measures an unparseable ink as 0, so a
	// non-hex impersonates pure black, beats #111827 on every surface there is, and is handed
	// straight back into a `color` rule. Here that paints white type onto a white band.
	test('cannot measure an ink that is not a hex, and returns the unreadable one anyway', () => {
		expect(readableInkOn('#FFFFFF', 'white')).toBe('white');
		expect(readableInkOn('#FFFFFF', 'var(--as-body-color)')).toBe('var(--as-body-color)');
	});
});

// A crest sits on its own tinted white disc rather than on the surface behind it, because a navy
// mark on a navy poster is invisible and every league has at least one.
describe('crestBacking', () => {
	test('tints the disc with the team colour over white', () => {
		expect(crestBacking('#0C2340')).toBe('linear-gradient(160deg, #0C234014, #0C234028), #ffffff');
	});

	// The same 28 the matchup card and the row wash use, so one team's colour reads at one weight
	// wherever it appears.
	test('lands the tint at the alpha the rest of the product uses', () => {
		expect(crestBacking('#E81828')).toContain('#E8182828');
		expect(teamRowWash('#E81828')).toContain('#E8182828');
	});

	test('falls back to a plain white disc, which still lifts a crest off a dark page', () => {
		expect(crestBacking(undefined)).toBe('#ffffff');
		expect(crestBacking(null)).toBe('#ffffff');
		expect(crestBacking('')).toBe('#ffffff');
		expect(crestBacking('rgb(1,2,3)')).toBe('#ffffff');
	});
});

// A chart line is the one place a team's colour is adjusted: it has to be seen against the chart.
describe('resolveChartLineColors', () => {
	// Chart lines sit on a dark surface, so a very dark team colour is mixed toward white.
	test('lightens a near-black colour on a dark surface', () => {
		const [a] = resolveChartLineColors({ color: '#000000' }, { color: '#00FF00' }, 'dark');
		expect(a).not.toBe('#000000');
		expect(a).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('leaves an already-bright colour alone on a dark surface', () => {
		const [, h] = resolveChartLineColors({ color: '#000000' }, { color: '#00FF00' }, 'dark');
		expect(h).toBe('#00FF00');
	});

	// The 3:1 boundary against the #0d1117 chart background sits at luminance 0.1164. Bemidji
	// State's #00694E is 0.1065, or 2.82:1, so it has to be lightened. The threshold read 0.10
	// for a while, and this colour falls in exactly that window.
	//
	// The expected value moved from #7ab1a3 to #007c5c when the climb stopped mixing toward white.
	// Both clear 3:1; only one is still green. Mixing adds the same amount to all three channels,
	// which pulls them together and drains the hue — #7ab1a3 is a grey-teal, and the same formula
	// turned Mets navy into #7a92b6 and Yankees navy into #818d9c, two greys that read alike.
	// Scaling the channels instead leaves their ratios, and so the hue, where they were.
	test('lightens a colour that clears the old 0.10 threshold but not 3:1, without draining it', () => {
		const [a] = resolveChartLineColors({ color: '#00694E' }, { color: '#FFC72C' }, 'dark');
		expect(a).toBe('#007c5c');
	});

	// #C8102E is luminance 0.1285, or 3.22:1. It already clears the bar, so lightening it would
	// only wash it out.
	test('leaves a colour just above the 3:1 boundary alone', () => {
		const [a] = resolveChartLineColors({ color: '#C8102E' }, { color: '#FFC72C' }, 'dark');
		expect(a).toBe('#C8102E');
	});
});

// The hue of the resulting colour, 0-359, or null for a grey. Written out rather than imported
// because the point of these tests is that the hue the caller started with survives.
const hueOf = (hex: string): number | null => {
	const [red, green, blue] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16));
	const max = Math.max(red!, green!, blue!);
	const min = Math.min(red!, green!, blue!);
	if (max === min) return null;
	const span = max - min;
	const sector = max === red! ? ((green! - blue!) / span) % 6
		: max === green! ? ((blue! - red!) / span) + 2
		: ((red! - green!) / span) + 4;
	return Math.round(((sector * 60) + 360) % 360);
};

// Scaling the channels rounds each to an integer, which can shift the hue by a degree or two. The
// bar is that the colour is still the same colour, not that the arithmetic is exact.
const expectSameHue = (result: string, source: string): void => {
	const drift = Math.abs(hueOf(result)! - hueOf(source)!);
	expect(Math.min(drift, 360 - drift)).toBeLessThanOrEqual(5);
};

const lightened = (color: string): string => (
	resolveChartLineColors({ color }, { color: '#FFC72C' }, 'dark')[0]
);

describe('lightening a chart colour keeps the team recognisable', () => {
	// Every one of these came back a grey when the climb mixed toward white.
	test.each([
		['Mets navy', '#002D72'],
		['Yankees navy', '#0C2340'],
		['Packers green', '#203731'],
		['Vikings purple', '#4F2683'],
		['Dodgers blue', '#005A9C'],
	])('%s keeps its hue', (_label, color) => {
		const result = lightened(color);
		expect(result).not.toBe(color);
		expectSameHue(result, color);
	});

	test('a pure black has no hue to keep, so it does become a grey', () => {
		const result = lightened('#000000');
		expect(hueOf(result)).toBeNull();
	});

	test('a colour already bright enough is returned untouched', () => {
		expect(lightened('#C8102E')).toBe('#C8102E');
	});
});

// The chart background is #0d1117, luminance 0.0055. A chart line is non-text, so it wants 3:1.
const contrastOnChart = (hex: string): number => {
	const parsed = hex.replace('#', '');
	const [red, green, blue] = [0, 2, 4].map(i => Number.parseInt(parsed.slice(i, i + 2), 16));
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return (luminance + 0.05) / (0.0055 + 0.05);
};

// The mirror of 'every colour it returns clears 4.5:1 on the card'. Without it the lightening side
// was pinned only on hue and on having moved at all, so a colour that came back still unreadable
// satisfied every assertion in the block above.
describe('every chart colour it returns clears 3:1', () => {
	test.each([
		['Mets navy', '#002D72'],
		['Yankees navy', '#0C2340'],
		['Packers green', '#203731'],
		['Vikings purple', '#4F2683'],
		['Dodgers blue', '#005A9C'],
		['a pure blue', '#0000ff'],
		['navy', '#000080'],
		['dark blue', '#00008B'],
		['a near-black blue', '#010040'],
		['pure black', '#000000'],
		['a colour that needs nothing', '#C8102E'],
	])('%s', (_label, color) => {
		expect(contrastOnChart(lightened(color))).toBeGreaterThanOrEqual(3);
	});

	// Scaling every channel by a common factor cannot lift a colour whose brightest channel is
	// already 255: 255 stays 255 and Math.round(0 * 1.18) is 0, so the whole 24-step climb is a
	// no-op and a pure blue used to come back byte-identical, at 2.31:1.
	test('a pure blue is no longer returned unchanged', () => {
		expect(lightened('#0000ff')).not.toBe('#0000ff');
	});

	// The five navies the scaling was written for finish the scaling loop on their own, so the
	// mixing fallback must not touch them.
	test('the colours scaling already handles are not mixed toward white', () => {
		expect(lightened('#002D72')).toBe('#0057de');
		expect(lightened('#0C2340')).toBe('#276ecf');
		expect(lightened('#203731')).toBe('#3f6b5e');
		expect(lightened('#4F2683')).toBe('#823fd8');
		expect(lightened('#005A9C')).toBe('#006ab8');
	});
});

// The light theme draws its charts on #ffffff, where the rule turns over: a line has to be dark
// enough rather than bright enough, and it is the pale golds that fail instead of the navies.
const onLight = (color: string): string => (
	resolveChartLineColors({ color }, { color: '#002D72' }, 'light')[0]
);
const contrastOnWhite = (hex: string): number => {
	const parsed = hex.replace('#', '');
	const [red, green, blue] = [0, 2, 4].map(i => Number.parseInt(parsed.slice(i, i + 2), 16));
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return 1.05 / (luminance + 0.05);
};

describe('a chart colour on the light surface', () => {
	test.each([
		['Penguins gold', '#FCB514'],
		['Lakers gold', '#FDB927'],
		['Carolina blue', '#7BAFD4'],
		['a pale fallback blue', '#60a5fa'],
		['pure yellow', '#ffff00'],
	])('%s is darkened to clear 3:1', (_label, color) => {
		const result = onLight(color);
		expect(result).not.toBe(color);
		expect(contrastOnWhite(result)).toBeGreaterThanOrEqual(3);
		expectSameHue(result, color);
	});

	test('a navy that already clears 3:1 is returned untouched', () => {
		expect(onLight('#0C2340')).toBe('#0C2340');
	});
});
