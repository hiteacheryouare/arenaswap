import { colorDifference } from '../src/colorMath';
import { crestBacking, pendingSwitchCrest, resolveChartLineColors, readableInkOn, readableTeamInkOnCard, resolveTeamColorPair, teamDisplayInk, teamRowWash } from '../src/colorUtils';

jest.mock('../src/logoSwitchColor', () => {
	const read: Record<string, string | null> = {
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/120.png': '#F8DB3F',
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/97.png': '#050403',
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/213.png': null,
		'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/164.png': null,
		'https://a.espncdn.com/i/teamlogos/soccer/500-dark/364.png': null,
		'https://a.espncdn.com/i/teamlogos/nhl/500-dark/scoreboard/tb.png': null,
		'https://a.espncdn.com/i/teamlogos/nhl/500-dark/scoreboard/tor.png': null,
	};
	return { cachedLogoSwitchColor: (crest: string) => (crest in read ? read[crest] : undefined) };
});

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
	['CLE @ TB', { color: '#002B5C', alternateColor: '#E31937' }, { color: '#092C5C', alternateColor: '#8FBCE6' }, '#E31937', '#092C5C'],
	['TB @ CLE', { color: '#092C5C', alternateColor: '#8FBCE6' }, { color: '#002B5C', alternateColor: '#E31937' }, '#8FBCE6', '#002B5C'],
	['NJ @ DET', { color: '#E30B2B', alternateColor: '#000000' }, { color: '#E30526', alternateColor: '#FFFFFF' }, '#000000', '#E30526'],
	['WSH @ CAR', { color: '#D71830', alternateColor: '#0B1F41' }, { color: '#E30426', alternateColor: '#000000' }, '#0B1F41', '#E30426'],
	['DET @ MIN', { color: '#1D428A', alternateColor: '#C8102E' }, { color: '#266092', alternateColor: '#79BC43' }, '#C8102E', '#266092'],
	['OSU @ IU', { color: '#BA0C2F', alternateColor: '#A8ADB4' }, { color: '#970310', alternateColor: '#FFFFFF' }, '#A8ADB4', '#970310'],
	['NAVY @ UTSA', { color: '#00225B', alternateColor: '#B5A67C' }, { color: '#0C2340', alternateColor: '#F15A22' }, '#B5A67C', '#0C2340'],
	['PSU @ MICH', { color: '#061440', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/213.png' }, { color: '#00274C', alternateColor: '#FFCB05' }, '#000000', '#00274C'],
	['RUTG @ MD', { color: '#CE0E2D', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/164.png' }, { color: '#CE1126', alternateColor: '#FFFFFF' }, '#ffffff', '#CE1126'],
	['LIV @ BRE', { color: '#D11317', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' }, { color: '#F42727', alternateColor: '#0F1C3F' }, '#ffffff', '#F42727'],
	['TB @ NYR', { color: '#003E7E', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/tb.png' }, { color: '#0056AE', alternateColor: '#E51937' }, '#003E7E', '#0056AE'],
	['TOR @ CBJ', { color: '#003E7E', alternateColor: '#FFFFFF', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/tor.png' }, { color: '#002D62', alternateColor: '#E31937' }, '#003E7E', '#002D62'],
	['VAN @ STL', { color: '#FFFFFF', alternateColor: '#12284C' }, { color: '#EC1458', alternateColor: '#001544' }, '#12284C', '#EC1458'],
	['COV @ TOT', { color: '#87CCED', alternateColor: '#FFFFFF' }, { color: '#FFFFFF', alternateColor: '#0B1426' }, '#87CCED', '#0B1426'],
	['MAN @ LEE', { color: '#DA020E', alternateColor: '#4169E1' }, { color: '#FFFFFF', alternateColor: '#FFCD00' }, '#DA020E', '#FFCD00'],
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

	test('never emits a malformed colour string', () => {
		const [a, h] = resolveTeamColorPair({ color: 'not-a-color' }, { color: '#00FF00' }, '#123456', '#f87171');
		expect(a).toBe('#123456');
		expect(a).toMatch(/^#[\da-fA-F]{6}$/);
		expect(h).toMatch(/^#[\da-fA-F]{6}$/);
	});

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

	test('keeps both primaries when the away alternate is white and the home team has none', () => {
		const alabama = { color: '#9E1B32', alternateColor: '#FFFFFF' };
		const redHome = { color: '#A6192E' };
		expect(resolveTeamColorPair(alabama, redHome)).toEqual(['#9E1B32', '#A6192E']);
	});

	test('never switches the home team, even when the away team has nothing to give', () => {
		const alabama = { color: '#9E1B32', alternateColor: '#FFFFFF' };
		const redHome = { color: '#A6192E', alternateColor: '#000000' };
		expect(resolveTeamColorPair(alabama, redHome)).toEqual(['#9E1B32', '#A6192E']);
	});

	test('picks black, white or nothing by how dark the away team is', () => {
		const navyHome = { color: '#0A1A4A' };
		expect(resolveTeamColorPair({ color: '#061440' }, navyHome)[0]).toBe('#000000');
		expect(resolveTeamColorPair({ color: '#003E7E' }, { color: '#002D62' })[0]).toBe('#003E7E');
		expect(resolveTeamColorPair({ color: '#CE0E2D' }, { color: '#CE1126' })[0]).toBe('#ffffff');
	});

	test('draws a club that publishes white in its alternate', () => {
		expect(resolveTeamColorPair({ color: '#FFFFFF', alternateColor: '#12284C' }, { color: '#EC1458' })).toEqual(['#12284C', '#EC1458']);
		expect(resolveTeamColorPair({ color: '#DA020E' }, { color: '#FFFFFF', alternateColor: '#FFCD00' })).toEqual(['#DA020E', '#FFCD00']);
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

describe('readableTeamInkOnCard', () => {
	test('darkens the golds, which are the colours that actually fail', () => {
		expect(readableTeamInkOnCard('#FCB514')).toBe('#8a630b');
		expect(readableTeamInkOnCard('#FFB81C')).toBe('#8b650f');
	});

	test('leaves a colour that already clears 4.5:1 exactly as it was', () => {
		expect(readableTeamInkOnCard('#002D72')).toBe('#002D72');
		expect(readableTeamInkOnCard('#CE1141')).toBe('#CE1141');
	});

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

describe('teamDisplayInk', () => {
	const pennState = { color: '#FFFFFF', alternateColor: '#061440' };

	test('names a club on its white band in the navy that club also owns', () => {
		expect(teamDisplayInk(pennState, '#FFFFFF')).toBe('#061440');
	});

	test('keeps white where white reads, which is most of the league', () => {
		expect(teamDisplayInk(pennState, '#061440')).toBe('#ffffff');
		expect(teamDisplayInk({ color: '#0C2340', alternateColor: '#C8102E' }, '#0C2340')).toBe('#ffffff');
		expect(teamDisplayInk({ color: '#A71930' }, '#A71930')).toBe('#ffffff');
	});

	test('leaves the mid-tones white at the size this type is set', () => {
		expect(teamDisplayInk({ color: '#4B9CD3' }, '#4B9CD3')).toBe('#ffffff');
	});

	test('falls back to the near-black only when the club has no other colour to give', () => {
		expect(teamDisplayInk({ color: '#FFB81C' }, '#FFB81C')).toBe('#111827');
		expect(teamDisplayInk({ color: '#B1B3B3', alternateColor: '#FFFFFF' }, '#B1B3B3')).toBe('#111827');
	});

	test('never draws the ink in the colour it is standing on', () => {
		expect(teamDisplayInk(pennState, '#ffffff')).toBe('#061440');
	});

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

	test('takes the light ink on a background it cannot read', () => {
		expect(readableInkOn('not-a-color')).toBe('#ffffff');
		expect(readableInkOn('')).toBe('#ffffff');
	});

	test('keeps white across the band where neither ink clears the small-text bar', () => {
		for (const surface of ['#E03A3E', '#0080C6', '#777777', '#7b7b7b']) {
			expect(readableInkOn(surface)).toBe('#ffffff');
		}
	});

	test('flips only once the near-black overtakes white, and not a shade before', () => {
		for (const nowDark of ['#EF3B24', '#0085CA', '#008E97', '#7c7c7c']) {
			expect(readableInkOn(nowDark)).toBe('#111827');
		}
	});

	test('never hands back the less legible of its two inks, on any grey it can be given', () => {
		for (let channel = 0; channel <= 255; channel++) {
			const grey = `#${channel.toString(16).padStart(2, '0').repeat(3)}`;
			const chosen = readableInkOn(grey);
			const rejected = chosen === '#ffffff' ? '#111827' : '#ffffff';
			expect(contrastOn(chosen, grey)).toBeGreaterThanOrEqual(contrastOn(rejected, grey));
		}
	});

	test('takes the obvious ink at either end of the range', () => {
		expect(readableInkOn('#000000')).toBe('#ffffff');
		expect(readableInkOn('#FFFFFF')).toBe('#111827');
		expect(contrastOn('#ffffff', '#000000')).toBeCloseTo(21, 10);
	});

	test('cannot measure an ink that is not a hex, and returns the unreadable one anyway', () => {
		expect(readableInkOn('#FFFFFF', 'white')).toBe('white');
		expect(readableInkOn('#FFFFFF', 'var(--as-fg-body)')).toBe('var(--as-fg-body)');
	});
});

describe('crestBacking', () => {
	test('tints the disc with the team colour over white', () => {
		expect(crestBacking('#0C2340')).toBe('linear-gradient(160deg, #0C234014, #0C234028), #ffffff');
	});

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

describe('resolveChartLineColors', () => {
	test('lightens a near-black colour on a dark surface', () => {
		const [a] = resolveChartLineColors({ color: '#000000' }, { color: '#00FF00' }, 'dark');
		expect(a).not.toBe('#000000');
		expect(a).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('leaves an already-bright colour alone on a dark surface', () => {
		const [, h] = resolveChartLineColors({ color: '#000000' }, { color: '#00FF00' }, 'dark');
		expect(h).toBe('#00FF00');
	});

	test('lightens a colour that clears the old 0.10 threshold but not 3:1, without draining it', () => {
		const [a] = resolveChartLineColors({ color: '#00694E' }, { color: '#FFC72C' }, 'dark');
		expect(a).toBe('#007c5c');
	});

	test('leaves a colour just above the 3:1 boundary alone', () => {
		const [a] = resolveChartLineColors({ color: '#C8102E' }, { color: '#FFC72C' }, 'dark');
		expect(a).toBe('#C8102E');
	});

	test('switches a side when lifting brings two distinct blues together', () => {
		const yankees = { color: '#0C2340', alternateColor: '#C4CED3' };
		const dodgers = { color: '#005A9C', alternateColor: '#EF3E42' };
		expect(resolveTeamColorPair(yankees, dodgers)).toEqual(['#0C2340', '#005A9C']);
		const [a, h] = resolveChartLineColors(yankees, dodgers, 'dark');
		expect(colorDifference(a, h)).toBeGreaterThanOrEqual(11);
	});
});

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

const expectSameHue = (result: string, source: string): void => {
	const drift = Math.abs(hueOf(result)! - hueOf(source)!);
	expect(Math.min(drift, 360 - drift)).toBeLessThanOrEqual(5);
};

const lightened = (color: string): string => (
	resolveChartLineColors({ color }, { color: '#FFC72C' }, 'dark')[0]
);

describe('lightening a chart colour keeps the team recognisable', () => {
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

const contrastOnChart = (hex: string): number => {
	const parsed = hex.replace('#', '');
	const [red, green, blue] = [0, 2, 4].map(i => Number.parseInt(parsed.slice(i, i + 2), 16));
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return (luminance + 0.05) / (0.0055 + 0.05);
};

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

	test('a pure blue is no longer returned unchanged', () => {
		expect(lightened('#0000ff')).not.toBe('#0000ff');
	});

	test('the colours scaling already handles are not mixed toward white', () => {
		expect(lightened('#002D72')).toBe('#0057de');
		expect(lightened('#0C2340')).toBe('#276ecf');
		expect(lightened('#203731')).toBe('#3f6b5e');
		expect(lightened('#4F2683')).toBe('#823fd8');
		expect(lightened('#005A9C')).toBe('#006ab8');
	});
});

const onLight = (color: string): string => (
	resolveChartLineColors({ color }, { color: '#00A651' }, 'light')[0]
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
