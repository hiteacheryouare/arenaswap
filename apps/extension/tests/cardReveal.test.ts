import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	pickRevealCut,
	pickRevealMode,
	revealCutMs,
	revealCuts,
	revealAbbrBaseLength,
	revealAbbrScale,
	revealBaseDurationMs,
	revealDayStamp,
	revealDelayMs,
	revealDurationMs,
	revealFullRate,
	revealOpenBeatMs,
	revealOpenMs,
	revealHoldHeightShare,
	revealHoldScale,
	revealHoldWidthShare,
	revealLean,
	revealLeanRatio,
	revealLeanWidthCap,
	revealMaxCards,
	revealModeForIndex,
	revealNameBeatMs,
	revealNameFit,
	revealNameHeightShare,
	revealNameInkBottomEm,
	revealNameInkTopEm,
	revealNameLift,
	revealNameLineHeight,
	revealNameLines,
	revealNameMaxPx,
	revealNameSpread,
	revealPlateRatio,
	revealQuickRate,
	revealSettleMs,
	revealStaggerCapIndex,
	revealStaggerStepMs,
	revealSkewDeg,
	revealSweepAngleDeg,
	revealSpineStartMs,
	revealSweepBarPx,
	revealSweepRun,
	revealTotalMs,
} from '../entrypoints/popup/cardReveal';
import { openRevealEnabledKey, readOpenRevealEnabled, writeOpenRevealEnabled } from '../utils/openReveal';

describe('which version of the open animation plays', () => {
	it('gives the full version the first time on a given day', () => {
		expect(pickRevealMode(null, '2026-09-15', false, true)).toBe('full');
		expect(pickRevealMode('2026-09-14', '2026-09-15', false, true)).toBe('full');
	});

	it('gives every open after that the same graphic, quicker', () => {
		expect(pickRevealMode('2026-09-15', '2026-09-15', false, true)).toBe('quick');
	});

	it('plays nothing at all under reduced motion', () => {
		expect(pickRevealMode(null, '2026-09-15', true, true)).toBe('none');
		expect(pickRevealMode('2026-09-15', '2026-09-15', true, true)).toBe('none');
	});

	it('plays nothing at all with the setting off', () => {
		expect(pickRevealMode(null, '2026-09-15', false, false)).toBe('none');
		expect(pickRevealMode('2026-09-15', '2026-09-15', false, false)).toBe('none');
	});
});

describe('the copy of the setting the first render can read', () => {
	const store = new Map<string, string>();
	const stub = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => { store.set(key, value); },
	} as unknown as Storage;

	beforeEach(() => {
		store.clear();
		Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true });
	});

	it('treats an unwritten setting as on', () => {
		expect(readOpenRevealEnabled()).toBe(true);
	});

	it('round trips both answers', () => {
		writeOpenRevealEnabled(false);
		expect(store.get(openRevealEnabledKey)).toBe('off');
		expect(readOpenRevealEnabled()).toBe(false);

		writeOpenRevealEnabled(true);
		expect(readOpenRevealEnabled()).toBe(true);
	});

	it('leaves the animation on where there is nowhere to store the answer', () => {
		Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
		expect(() => writeOpenRevealEnabled(false)).not.toThrow();
		expect(readOpenRevealEnabled()).toBe(true);
	});
});

describe('the two phases and the two speeds', () => {
	it('runs the poster at a fixed fraction of the one timeline', () => {
		expect(revealDurationMs('full')).toBe(Math.round(revealBaseDurationMs * revealFullRate));
		expect(revealDurationMs('quick')).toBe(Math.round(revealBaseDurationMs * revealQuickRate));
		expect(revealFullRate).toBe(1.3);
		expect(revealQuickRate).toBe(0.8);
	});

	it('gives the two opening scenes only to the first open of the day', () => {
		expect(revealOpenMs('full')).toBe(Math.round((revealOpenBeatMs + revealNameBeatMs) * revealFullRate));
		expect(revealOpenMs('quick')).toBe(0);
		expect(revealOpenMs('none')).toBe(0);
	});

	it('runs the whole of the first open in about six seconds a card', () => {
		expect(revealOpenMs('full')).toBe(3185);
		expect(revealDurationMs('full')).toBe(4420);
		expect(revealTotalMs('full')).toBe(7605);
	});

	it('leaves every later open of the day exactly where it was', () => {
		expect(revealTotalMs('quick')).toBe(2720);
		expect(revealDurationMs('quick')).toBe(2720);
		expect(revealDelayMs(3, 'quick')).toBe(192);
		expect(revealSpineStartMs(3, 'quick')).toBe(revealDelayMs(3, 'quick'));
	});

	it('starts the poster after both opening scenes on the first open', () => {
		expect(revealSpineStartMs(0, 'full')).toBe(revealOpenMs('full'));
		expect(revealSpineStartMs(2, 'full')).toBe(revealDelayMs(2, 'full') + revealOpenMs('full'));
	});

	it('takes no time at all when nothing is going to play', () => {
		expect(revealTotalMs('none')).toBe(0);
		expect(revealDurationMs('none')).toBe(0);
		expect(revealDelayMs(3, 'none')).toBe(0);
	});
});

describe('the day a reveal is stamped against', () => {
	it('is the local calendar day, zero padded', () => {
		expect(revealDayStamp(new Date(2026, 8, 15, 23, 59))).toBe('2026-09-15');
		expect(revealDayStamp(new Date(2026, 0, 3, 0, 1))).toBe('2026-01-03');
	});
});

describe('the stagger down the list', () => {
	it('steps once per card', () => {
		expect(revealDelayMs(0, 'full')).toBe(0);
		expect(revealDelayMs(1, 'full')).toBe(Math.round(revealStaggerStepMs * revealFullRate));
		expect(revealDelayMs(3, 'full')).toBe(Math.round(revealStaggerStepMs * 3 * revealFullRate));
		expect(revealDelayMs(1, 'full')).toBe(104);
	});

	it('tightens with the quick version', () => {
		expect(revealDelayMs(3, 'quick')).toBe(Math.round(revealStaggerStepMs * 3 * revealQuickRate));
	});

	it('stops lengthening past the cap', () => {
		const capped = revealDelayMs(revealStaggerCapIndex, 'full');
		expect(revealDelayMs(revealStaggerCapIndex + 1, 'full')).toBe(capped);
		expect(revealDelayMs(400, 'full')).toBe(capped);
	});
});

describe('how far down the list the graphic is drawn at all', () => {
	it('stops after the cards anyone could see', () => {
		expect(revealModeForIndex('full', 0)).toBe('full');
		expect(revealModeForIndex('full', revealMaxCards - 1)).toBe('full');
		expect(revealModeForIndex('full', revealMaxCards)).toBe('none');
		expect(revealModeForIndex('quick', 99)).toBe('none');
	});
});

describe('when the popup stops being in its opening state', () => {
	it('waits for the last card to start and then to finish both its phases', () => {
		expect(revealSettleMs('full')).toBe(revealDelayMs(revealStaggerCapIndex, 'full') + revealTotalMs('full'));
		expect(revealSettleMs('quick')).toBe(revealDelayMs(revealStaggerCapIndex, 'quick') + revealTotalMs('quick'));
	});

	it('holds the opening state for the whole graphic plus its own cascade', () => {
		expect(revealSettleMs('full')).toBe(8229);
		expect(revealSettleMs('quick')).toBe(3104);
	});

	it('is immediate when nothing is going to play', () => {
		expect(revealSettleMs('none')).toBe(0);
	});
});

describe('how big the poster crest is drawn', () => {
	it('never draws the poster smaller than the crest it resolves into', () => {
		expect(revealHoldScale(304, 20, 64)).toBe(1);
		expect(revealHoldScale(20, 148, 64)).toBe(1);
		expect(revealHoldScale(304, 148, 64)).toBeGreaterThan(1);
	});

	it('bounds the plate, not the mark inside it', () => {
		expect(revealPlateRatio).toBeCloseTo(4 / 3, 10);
		expect(revealHoldScale(1000, 148, 64) * 64 * revealPlateRatio)
			.toBeCloseTo(148 * revealHoldHeightShare, 6);
		expect(revealHoldScale(304, 1000, 64) * 64 * revealPlateRatio)
			.toBeCloseTo(304 * revealHoldWidthShare, 6);
	});

	it('stays inside the card it is drawn on, at any card height', () => {
		[96, 120, 148, 190, 240].forEach(height => {
			const plate = revealHoldScale(304, height, 64) * 64 * revealPlateRatio;
			expect(plate).toBeLessThanOrEqual(height);
			expect(plate).toBeLessThanOrEqual(304 / 2);
		});
	});

	it('holds at one when there is no crest to measure', () => {
		expect(revealHoldScale(304, 148, 0)).toBe(1);
		expect(revealHoldScale(0, 0, 0)).toBe(1);
	});
});

describe('how the poster lettering is sized', () => {
	it('leaves a three-character tricode alone', () => {
		expect(revealAbbrScale('MIA', 'ARI')).toBe(1);
		expect(revealAbbrBaseLength).toBe(3);
	});

	it('shrinks for the longer of the two, not for each side separately', () => {
		expect(revealAbbrScale('ARMY', 'NAVY')).toBeCloseTo(0.75, 10);
		expect(revealAbbrScale('UCONN', 'SMU')).toBeCloseTo(0.6, 10);
		expect(revealAbbrScale('SMU', 'UCONN')).toBeCloseTo(0.6, 10);
	});

	it('never scales up, and survives an abbreviation that is not there', () => {
		expect(revealAbbrScale('LA', 'SF')).toBe(1);
		expect(revealAbbrScale()).toBe(1);
		expect(revealAbbrScale('', '')).toBe(1);
	});
});

describe('how a club name is set on two lines', () => {
	it('breaks a name before its nickname', () => {
		expect(revealNameLines('Miami Marlins', 'Marlins')).toEqual(['Miami', 'Marlins']);
		expect(revealNameLines('Penn State Nittany Lions', 'Nittany Lions')).toEqual(['Penn State', 'Nittany Lions']);
		expect(revealNameLines('Portland Trail Blazers', 'Trail Blazers')).toEqual(['Portland', 'Trail Blazers']);
	});

	it('breaks at the last space when no nickname came with the game', () => {
		expect(revealNameLines('Washington Commanders')).toEqual(['Washington', 'Commanders']);
		expect(revealNameLines('Penn State Nittany Lions')).toEqual(['Penn State Nittany', 'Lions']);
	});

	it('leaves a one-word club on one line', () => {
		expect(revealNameLines('Barcelona', 'Barcelona')).toEqual(['Barcelona']);
		expect(revealNameLines('Juventus')).toEqual(['Juventus']);
	});

	it('survives a game with no name on it at all', () => {
		expect(revealNameLines()).toEqual([]);
		expect(revealNameLines('', '')).toEqual([]);
		expect(revealNameLines('  ')).toEqual([]);
	});

	it('collapses the whitespace it was sent', () => {
		expect(revealNameLines(' Miami   Marlins ', ' Marlins ')).toEqual(['Miami', 'Marlins']);
	});
});

describe('revealNameInk', () => {
	it('keeps the measured ink edges', () => {
		expect(revealNameInkTopEm).toBeCloseTo(0.385, 9);
		expect(revealNameInkBottomEm).toBeCloseTo(0.572, 9);
	});
});

const inkHeight = (sizes: number[]) => {
	const boxes = sizes.reduce((total, size) => total + size * revealNameLineHeight, 0);
	const gap = (revealNameLineHeight / 2 - revealNameInkTopEm) * sizes[0]!;
	const hang = (revealNameInkBottomEm - revealNameLineHeight / 2) * sizes[sizes.length - 1]!;
	return boxes - gap + hang;
};

describe('how the club names are sized', () => {
	const marlins = [2.96, 3.5701];
	const commanders = [5.8298, 6.6293];
	const card = 296;
	const band = 84;

	it('justifies every line of a name to one width', () => {
		const sizes = revealNameFit(marlins, card, band);
		expect(sizes).toHaveLength(2);
		expect(sizes[0]! * marlins[0]!).toBeCloseTo(sizes[1]! * marlins[1]!, 6);
	});

	it('names a long club across most of the card, at twice the size', () => {
		const sizes = revealNameFit(commanders, card, band);
		const drawn = sizes[0]! * commanders[0]!;
		expect(drawn).toBeGreaterThan(card * 0.7);
		expect(drawn).toBeLessThanOrEqual(card);
		expect(sizes[0]!).toBeGreaterThan(35);
	});

	it('comes down to the band on a card too short for the width', () => {
		const short = revealNameFit(marlins, card, 74);
		const tall = revealNameFit(marlins, card, band);
		expect(short[0]!).toBeLessThan(tall[0]!);
		expect(inkHeight(short)).toBeLessThanOrEqual(74 * revealNameHeightShare + 0.001);
		expect(inkHeight(short)).toBeGreaterThan(74 * revealNameHeightShare - 0.001);
	});

	it('will not draw one line of a name away from the other', () => {
		const sizes = revealNameFit([1.2, 2.8], card, 400);
		expect(Math.max(...sizes)).toBeLessThanOrEqual(revealNameMaxPx);
		expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThanOrEqual(revealNameSpread + 0.001);
	});

	it('answers nothing for a line it could not measure', () => {
		expect(revealNameFit([0, 4], card, band)).toEqual([0, 0]);
		expect(revealNameFit([], card, band)).toEqual([]);
	});

	it('lifts the block until the ink is what sits centred', () => {
		const sizes = revealNameFit(marlins, card, band);
		const lift = revealNameLift(sizes);
		const boxes = sizes.reduce((total, size) => total + size * revealNameLineHeight, 0);
		const gap = (revealNameLineHeight / 2 - revealNameInkTopEm) * sizes[0]!;
		const hang = (revealNameInkBottomEm - revealNameLineHeight / 2) * sizes[sizes.length - 1]!;
		const blockTop = (band - boxes) / 2 - lift;
		expect(blockTop + gap).toBeCloseTo(band - (blockTop + boxes + hang), 6);
	});

	it('lifts nothing it could not measure', () => {
		expect(revealNameLift([])).toBe(0);
		expect(revealNameLift([0, 10])).toBe(0);
	});
});

describe('the figures the stylesheet repeats by hand', () => {
	const stylesheet = readFileSync(path.join(__dirname, '../assets/global.scss'), 'utf8');

	it('runs every timeline over the base duration', () => {
		const durations = stylesheet.match(/calc\((\d+)ms \* var\(--reveal-rate\)\) linear var\(--reveal-spine\)/g) ?? [];
		expect(durations.length).toBeGreaterThan(0);
		durations.forEach(declaration => {
			expect(declaration).toContain(`${revealBaseDurationMs}ms`);
		});
	});

	it('skews the bars by the angle the lean is derived from', () => {
		expect(stylesheet).not.toMatch(/skewX\(-?[\d.]+deg\)/);
		const skews = stylesheet.match(/skewX\([^)]*var\(--reveal-skew\)[^)]*\)/g) ?? [];
		expect(skews).toHaveLength(6);
	});

	it('finishes the last content beat before the wrapper is taken away', () => {
		const beats = [...stylesheet.matchAll(/animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/g)]
			.map(match => Number(match[1]));
		const contentBeatMs = Number(/cardRevealContent calc\((\d+)ms/.exec(stylesheet)?.[1]);
		expect(beats.length).toBeGreaterThan(0);
		expect(Number.isFinite(contentBeatMs)).toBe(true);
		expect(Math.max(...beats) + contentBeatMs).toBeLessThanOrEqual(revealBaseDurationMs);
	});

	it('fills the lettering before the bar reaches it', () => {
		const fill = /cardRevealAbbrFill calc\((\d+)ms \* var\(--reveal-rate\)\) [\w-]+ calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const sweep = /cardRevealSweepAway calc\(\d+ms \* var\(--reveal-rate\)\) linear calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		expect(fill).not.toBeNull();
		expect(sweep).not.toBeNull();
		expect(Number(fill![2]) + Number(fill![1])).toBeLessThanOrEqual(Number(sweep![1]));
	});

	it('sends the three bars of a pass out in order', () => {
		const chaser = /\.game-card-reveal-sweep\.is-away\.is-chaser,[\s\S]*?animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const trailer = /\.game-card-reveal-sweep\.is-away\.is-trailer,[\s\S]*?animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const sweep = /cardRevealSweepAway calc\(\d+ms \* var\(--reveal-rate\)\) linear calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		expect(Number(sweep![1])).toBeLessThan(Number(chaser![1]));
		expect(Number(chaser![1])).toBeLessThan(Number(trailer![1]));

		const durationOf = (rule: RegExpExecArray) => Number(
			/animation-duration:\s+calc\((\d+)ms/.exec(stylesheet.slice(rule.index))![1],
		);
		expect(durationOf(chaser!)).toBeLessThan(durationOf(trailer!));
		expect(Number(trailer![1]) + durationOf(trailer!)).toBeLessThanOrEqual(revealBaseDurationMs);
	});

	it('keeps the two opening scenes alive until the colour has closed over them', () => {
		const window = (keyframes: string) => new RegExp(
			`animation:\\s+${keyframes} calc\\(\\((\\d+)ms \\+ (\\d+)ms \\+ (\\d+)ms\\) \\* var\\(--reveal-rate\\)\\)`,
		).exec(stylesheet)?.slice(1, 4).map(Number) ?? null;

		const layer = window('cardRevealOpeningIn');
		expect(layer).not.toBeNull();
		expect(layer![0]).toBe(revealOpenBeatMs);
		expect(layer![1]).toBe(revealNameBeatMs);

		expect(layer![2]).toBeGreaterThanOrEqual(revealBaseDurationMs * 0.26);

		expect(window('cardRevealOpeningCrest')).toEqual(layer);
		expect(window('cardRevealOpeningBand')).toEqual(layer);
		expect(window('cardRevealOpeningName')).toEqual(layer);
	});

	it('has the naming gone by the frame the poster starts on', () => {
		const total = revealOpenBeatMs + revealNameBeatMs + 1050;
		const posterStartsAt = Math.round(((revealOpenBeatMs + revealNameBeatMs) / total) * 100);

		const collapsed = /@keyframes cardRevealOpeningName \{[\s\S]*?\n\t+(\d+)%, 100% \{ opacity: 0;/.exec(stylesheet);
		expect(Number(collapsed![1])).toBe(posterStartsAt);

		const crestGone = /@keyframes cardRevealOpeningCrest \{[\s\S]*?\n\t+(\d+)%\s+\{ opacity: 0;/.exec(stylesheet);
		const bandShut = /@keyframes cardRevealOpeningBand \{[\s\S]*?\n\t+(\d+)%, 100% \{ clip-path: inset\(0\)/.exec(stylesheet);
		const nameLanded = /@keyframes cardRevealOpeningName \{[\s\S]*?\n\t+(\d+)%, \d+%\s+\{ opacity: 0\.9;/.exec(stylesheet);
		expect(Number(crestGone![1])).toBeLessThan(Number(bandShut![1]));
		expect(Number(bandShut![1])).toBeLessThanOrEqual(Number(nameLanded![1]));
		expect(Number(nameLanded![1])).toBeLessThan(posterStartsAt);
	});

	it('holds the naming still for long enough to read two clubs', () => {
		const total = revealOpenBeatMs + revealNameBeatMs + 1050;
		const landed = Number(/@keyframes cardRevealOpeningName \{[\s\S]*?\n\t+(\d+)%, \d+%\s+\{ opacity: 0\.9;/.exec(stylesheet)![1]);
		const leaves = Number(/@keyframes cardRevealOpeningName \{[\s\S]*?\n\t+\d+%, (\d+)%\s+\{ opacity: 0\.9;/.exec(stylesheet)![1]);
		const heldMs = ((leaves - landed) / 100) * total * revealFullRate;
		expect(heldMs).toBeGreaterThanOrEqual(1000);
	});

	it('cuts the opening fields and the poster halves along one seam', () => {
		const seam = (side: 'away' | 'home') => {
			const shared = `.game-card-reveal-half.is-${side},`;
			const at = stylesheet.indexOf(shared);
			if (at < 0) return null;
			const rule = stylesheet.slice(at, stylesheet.indexOf('}', at));
			if (!rule.includes(`.game-card-reveal-opening-field.is-${side}`)) return null;
			return /clip-path:\s*(polygon\([^;]+\));/.exec(rule)?.[1] ?? null;
		};

		expect(seam('away')).not.toBeNull();
		expect(seam('home')).not.toBeNull();
		expect(seam('away')).toContain('--reveal-lean');
		expect(seam('home')).toContain('--reveal-lean');
	});

	it('splits the naming scene flat, and wipes each band in from its own edge', () => {
		const band = (side: 'away' | 'home') => {
			const at = stylesheet.indexOf(`.game-card-reveal-opening-band.is-${side} {`);
			if (at < 0) return null;
			return stylesheet.slice(at, stylesheet.indexOf('}', at));
		};

		expect(band('away')).toContain('--reveal-band-shut: 0 0 100% 0');
		expect(band('home')).toContain('--reveal-band-shut: 100% 0 0 0');
		expect(band('away')).not.toContain('--reveal-lean');
		expect(band('home')).not.toContain('--reveal-lean');
	});

	it('collapses each name onto the slot its tricode uses', () => {
		const slot = (side: 'away' | 'home') => {
			const at = stylesheet.indexOf(`.game-card-reveal-opening-name.is-${side} {`);
			if (at < 0) return null;
			const rule = stylesheet.slice(at, stylesheet.indexOf('}', at));
			return [
				/--reveal-name-slot-x:\s*(-?\d+%)/.exec(rule)?.[1],
				/--reveal-name-slot-y:\s*(-?\d+%)/.exec(rule)?.[1],
			];
		};

		expect(slot('away')).toEqual(['-25%', '50%']);
		expect(slot('home')).toEqual(['25%', '-50%']);
	});

	it('translates a bar exactly as far as the offsets it is parked at', () => {
		const parked = [...stylesheet.matchAll(/\.game-card-reveal-sweep\.is-\w+ \{\s*\r?\n\s*left:\s*([^;]+);/g)]
			.map(match => match[1].trim());
		expect(parked).toEqual([
			`calc(-${revealSweepBarPx}px - var(--reveal-lean))`,
			'calc(100% + var(--reveal-lean))',
		]);
		const cardWidth = 296;
		const lean = 28.12;
		expect(revealSweepRun(cardWidth, lean)).toBeCloseTo((cardWidth + lean) - (-revealSweepBarPx - lean), 10);
	});
});

describe('the one angle the whole graphic is built on', () => {
	it('is the tangent of the sweep angle', () => {
		expect(revealSweepAngleDeg).toBe(20.5);
		expect(revealLeanRatio).toBeCloseTo(Math.tan((20.5 * Math.PI) / 180), 10);
	});

	it('leans by the card\'s height until that would cross more than a tenth of its width', () => {
		const width = 296;
		expect(revealLean(158, width)).toBeCloseTo((158 * revealLeanRatio) / 2, 6);
		expect(revealLean(212, width)).toBeCloseTo(width * revealLeanWidthCap, 6);
		expect(revealLean(400, width)).toBeCloseTo(width * revealLeanWidthCap, 6);
	});

	it('skews the bars by the angle the lean it was given actually leans at', () => {
		expect(revealSkewDeg(revealLean(150, 296), 150)).toBeCloseTo(revealSweepAngleDeg, 6);
		const tall = 300;
		const lean = revealLean(tall, 296);
		expect(revealSkewDeg(lean, tall)).toBeLessThan(revealSweepAngleDeg);
		expect(Math.tan((revealSkewDeg(lean, tall) * Math.PI) / 180) * (tall / 2)).toBeCloseTo(lean, 6);
	});
});

describe('which cut a later open draws', () => {
	it('plays the poster on the first open of the day', () => {
		expect(pickRevealCut('full', 'typeSlam', () => 0.99)).toBe('poster');
	});

	it('never draws the cut the last open played', () => {
		revealCuts.forEach(last => {
			[0, 0.34, 0.67, 0.999999].forEach(roll => {
				expect(pickRevealCut('quick', last, () => roll)).not.toBe(last);
			});
		});
	});

	it('can draw every cut, the poster included', () => {
		const drawn = new Set(revealCuts.map((_, slot) => pickRevealCut('quick', null, () => (slot + 0.5) / revealCuts.length)));
		expect([...drawn].toSorted()).toEqual(revealCuts.toSorted());
	});

	it('holds the opening state for the cut that is actually playing', () => {
		expect(revealSettleMs('quick', 'headToHead')).toBe(revealDelayMs(revealStaggerCapIndex, 'quick') + revealCutMs.headToHead);
		expect(revealSettleMs('quick', 'poster')).toBe(revealSettleMs('quick'));
		expect(revealSettleMs('none', 'boxScore')).toBe(0);
	});
});
