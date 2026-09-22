import { crestBacking, readableInkOn, readableTeamInkOnCard, resolveTeamColorPair, teamDisplayInk, teamRowWash, underHeroScrim } from '../src/components/colorUtils';
import { hexLuminance } from '../src/components/colorMath';

describe('resolveTeamColorPair', () => {
	const away = { color: '#1D428A', alternateColor: '#FFC72C' };
	const home = { color: '#552583', alternateColor: '#FDB927' };

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

	test('swaps in an alternate when both primaries clash', () => {
		const clashAway = { color: '#0A1F44', alternateColor: '#FFC72C' };
		const clashHome = { color: '#0C2340', alternateColor: '#C8102E' };
		const [a, h] = resolveTeamColorPair(clashAway, clashHome);
		expect([a, h]).not.toEqual(['#0A1F44', '#0C2340']);
	});

	test('returns well-separated primaries unchanged when lighten is off', () => {
		const separatedAway = { color: '#1D428A', alternateColor: '#FFC72C' };
		const separatedHome = { color: '#F1C40F', alternateColor: '#C8102E' };
		expect(resolveTeamColorPair(separatedAway, separatedHome, '#60a5fa', '#f87171', false))
			.toEqual(['#1D428A', '#F1C40F']);
	});

	// Warriors navy against Lakers purple sits ~63 apart in RGB, just inside the clash threshold.
	test('breaks up navy-against-purple rather than drawing both', () => {
		expect(resolveTeamColorPair(away, home)).not.toEqual(['#1D428A', '#552583']);
	});

	// Chart lines sit on a dark surface, so a very dark team colour is mixed toward white.
	test('lightens a near-black colour when lighten is on', () => {
		const [a] = resolveTeamColorPair({ color: '#000000' }, { color: '#00FF00' }, '#60a5fa', '#f87171', true);
		expect(a).not.toBe('#000000');
		expect(a).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('leaves an already-bright colour alone when lighten is on', () => {
		const [, h] = resolveTeamColorPair({ color: '#000000' }, { color: '#00FF00' }, '#60a5fa', '#f87171', true);
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
		const [a] = resolveTeamColorPair({ color: '#00694E' }, { color: '#FFC72C' }, '#60a5fa', '#f87171', true);
		expect(a).toBe('#007c5c');
	});

	// #C8102E is luminance 0.1285, or 3.22:1. It already clears the bar, so lightening it would
	// only wash it out.
	test('leaves a colour just above the 3:1 boundary alone', () => {
		const [a] = resolveTeamColorPair({ color: '#C8102E' }, { color: '#FFC72C' }, '#60a5fa', '#f87171', true);
		expect(a).toBe('#C8102E');
	});

	test('is deterministic for the same input', () => {
		expect(resolveTeamColorPair(away, home)).toEqual(resolveTeamColorPair(away, home));
	});
});

// Real ESPN palettes, transcribed from `/teams`. Each is a pair whose primaries clash and whose
// every substitution is unreadable on one side, which is the branch that used to draw ink.
const houston = { color: '#c8102e', alternateColor: '#ffffff' };
const texasTech = { color: '#da291c', alternateColor: '#000000' };
const nationals = { color: '#ab0003', alternateColor: '#11225b' };
const cardinals = { color: '#be0a14', alternateColor: '#001541' };
const isInkHex = (value: string): boolean => ['#000000', '#ffffff'].includes(value.toLowerCase());

describe('resolveTeamColorPair keeps a team colour on the card when the primaries clash', () => {
	// Two red teams, 35.7 apart. Houston publish a white and Texas Tech a black, so the largest
	// distance in RGB was on the menu and it took both sides. Tech's red survives instead.
	test('draws Texas Tech in red rather than drawing both teams in ink', () => {
		expect(resolveTeamColorPair(houston, texasTech, '#dee2e6', '#dee2e6'))
			.toEqual(['#ffffff', '#da291c']);
	});

	// Two blues, 21.9 apart, with the same white-and-black pair of alternates behind them.
	test('does the same for two blues that clash', () => {
		const navy = { color: '#003594', alternateColor: '#ffffff' };
		const otherNavy = { color: '#00549f', alternateColor: '#000000' };
		const [a, h] = resolveTeamColorPair(navy, otherNavy, '#dee2e6', '#dee2e6');
		expect(isInkHex(a) && isInkHex(h)).toBe(false);
	});

	// The clash this whole branch exists for: two reds 27.4 apart, separated through a navy. It came
	// out right before the ranking went in and has to keep coming out right after.
	test('still separates the two reds it already separated', () => {
		expect(resolveTeamColorPair(nationals, cardinals, '#dee2e6', '#dee2e6'))
			.toEqual(['#11225b', '#be0a14']);
	});

	// Ranking readable sides first must not disturb a pair that had a fully readable substitution all
	// along: two usable sides still beat one, and distance still decides between them.
	test('leaves a pair that had a readable substitution on the one it already picked', () => {
		const lakers = { color: '#552583', alternateColor: '#FDB927' };
		const warriors = { color: '#1D428A', alternateColor: '#FFC72C' };
		expect(resolveTeamColorPair(lakers, warriors, '#dee2e6', '#dee2e6'))
			.toEqual(['#FDB927', '#1D428A']);
	});

	// The one case where ink is the honest answer: neither team published anything else.
	test('draws ink when ink is all either team has', () => {
		const [a, h] = resolveTeamColorPair({ color: '#000000', alternateColor: '#ffffff' }, { color: '#000000', alternateColor: '#ffffff' }, '#dee2e6', '#dee2e6');
		expect([a, h].every(isInkHex)).toBe(true);
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
	resolveTeamColorPair({ color }, { color: '#FFC72C' }, '#60a5fa', '#f87171', true)[0]
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

const contrastOn = (ink: string, surface: string): number => {
	const measure = (hex: string): number => {
		const [red, green, blue] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16));
		return 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	};
	const [a, b] = [measure(ink), measure(surface)];
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// The opening graphic draws a club's name across the card and its tricode at 3.4rem, both on the
// team's own colour. Penn State is the case that broke it: `apiClient` promotes a near-black primary
// to the alternate slot, so they reach the popup as #FFFFFF over #061440 and were named in white on
// a white band.
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

// The hero draws its crests over a scrim, so the surface a crest has to stand off is not the
// team's published colour — it is that colour with a near-black laid over it at 0.28. Judging the
// crest against the published hex would call a mark readable on a backdrop it never appears on.
describe('underHeroScrim', () => {
	test('lays the scrim over the colour at the alpha the hero uses', () => {
		// 0.72 of the team colour plus 0.28 of rgb(3, 7, 12), channel by channel.
		expect(underHeroScrim('#0C2340')).toBe('#091b31');
		expect(underHeroScrim('#FFFFFF')).toBe('#b8babb');
	});

	test('darkens every colour, which is the whole reason the crest is judged against it', () => {
		for (const color of ['#0C2340', '#C8102E', '#FFB81C', '#4B9CD3', '#FFFFFF', '#860038']) {
			expect(hexLuminance(underHeroScrim(color))).toBeLessThan(hexLuminance(color));
		}
	});

	test('always hands back a colour the rest of the arithmetic can read', () => {
		for (const color of ['#0C2340', '#FFFFFF', '#000000', '#FFB81C']) {
			expect(underHeroScrim(color)).toMatch(/^#[\da-f]{6}$/);
		}
	});

	// A team with no colour still gets a hero, and its crest still has to be judged against
	// something — the page behind the scrim, which is what the block fades into.
	test('falls back to the page behind it for a colour it cannot read', () => {
		expect(underHeroScrim('not-a-color')).toBe('#0d1117');
		expect(underHeroScrim('')).toBe('#0d1117');
	});

	// The scrim is near-black rather than black, so a pure black comes back a shade lighter. It
	// must not come back as something a crest could disappear into by accident.
	test('leaves a black essentially black', () => {
		expect(hexLuminance(underHeroScrim('#000000'))).toBeLessThan(0.01);
	});
});
