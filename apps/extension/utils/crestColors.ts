import { logWarn } from '@arenaswap/core';
import type { Game, Team } from '@arenaswap/core/types';
import { isHex } from '@arenaswap/ui/src/components/colorMath';
import { crestColorCalibration, crestColorFromPixels, crestSampleSize } from '@arenaswap/ui/src/components/crestColor';

/* Our sources publish no colour at all for some teams — every men's college hockey team, the Olympic
   hockey nations, and about a hundred programmes each in college baseball, softball and football —
   and those games painted in the grey or blue-and-orange each surface keeps as a default. This reads
   one off the crest instead, in the background, so a game reaches every surface already coloured and
   nothing changes colour on screen once it has been measured. */

export const crestColorCacheKey = 'arenaswap.crestColors';

// Keyed by crest URL, and null records a crest with no colour in it to give.
export type crestColorMap = Map<string, string | null>;

interface storedCrestColors {
	calibration: string;
	colors: Record<string, string | null>;
}

const cacheLimit = 4096;
const fetchTimeoutMs = 4000;

export const readStoredCrestColors = (stored: unknown): crestColorMap => {
	if (typeof stored !== 'object' || stored === null) return new Map();
	const { calibration, colors } = stored as Partial<storedCrestColors>;
	if (calibration !== crestColorCalibration || typeof colors !== 'object' || colors === null) return new Map();
	return new Map(Object.entries(colors)
		.filter((entry): entry is [string, string | null] => isHex(entry[1]) || entry[1] === null));
};

const toStored = (colors: crestColorMap): storedCrestColors => ({
	calibration: crestColorCalibration,
	colors: Object.fromEntries(colors),
});

const needsCrestColor = (team: Team): boolean => (
	Boolean(team.logo) && !isHex(team.color) && !isHex(team.alternateColor)
);

export const crestsToRead = (games: Game[], known: crestColorMap): string[] => [
	...new Set(games
		.flatMap(game => [game.awayTeam, game.homeTeam])
		.filter(team => needsCrestColor(team) && !known.has(team.logo!))
		.map(team => team.logo!)),
];

const paintTeam = (team: Team, colors: crestColorMap): Team => {
	if (!needsCrestColor(team)) return team;
	const color = colors.get(team.logo!);
	return color ? { ...team, color } : team;
};

export const paintCrestColors = (games: Game[], colors: crestColorMap): Game[] => games.map(game => {
	const awayTeam = paintTeam(game.awayTeam, colors);
	const homeTeam = paintTeam(game.homeTeam, colors);
	return awayTeam === game.awayTeam && homeTeam === game.homeTeam ? game : { ...game, awayTeam, homeTeam };
});

// Undefined when the crest could not be read at all, which is not a verdict and is not stored.
export const sampleCrestColor = async (src: string): Promise<string | null | undefined> => {
	if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return undefined;
	try {
		const response = await fetch(src, { signal: AbortSignal.timeout(fetchTimeoutMs) });
		if (!response.ok) return undefined;
		const bitmap = await createImageBitmap(await response.blob(), {
			resizeWidth: crestSampleSize,
			resizeHeight: crestSampleSize,
			resizeQuality: 'medium',
		});
		const context = new OffscreenCanvas(crestSampleSize, crestSampleSize).getContext('2d');
		if (!context) return undefined;
		context.drawImage(bitmap, 0, 0);
		bitmap.close();
		return crestColorFromPixels(context.getImageData(0, 0, crestSampleSize, crestSampleSize).data);
	} catch {
		return undefined;
	}
};

interface crestColorDeps {
	load: () => Promise<unknown>;
	save: (stored: storedCrestColors) => Promise<void>;
	sample?: (src: string) => Promise<string | null | undefined>;
}

export const createCrestColors = ({ load, save, sample = sampleCrestColor }: crestColorDeps) => {
	let colors: crestColorMap = new Map();
	let loading: Promise<void> | null = null;
	// One read per crest per worker, whatever it returned, so a crest that will not load is not
	// fetched again on every poll. Held as promises so a second fetch landing mid-read waits for it.
	const reads = new Map<string, Promise<boolean>>();

	const read = (src: string): Promise<boolean> => {
		const existing = reads.get(src);
		if (existing) return existing;
		const pending = sample(src).then(color => {
			if (color === undefined) return false;
			colors.set(src, color);
			for (const oldest of colors.keys()) {
				if (colors.size <= cacheLimit) break;
				colors.delete(oldest);
			}
			return true;
		});
		reads.set(src, pending);
		return pending;
	};

	const paint = async (games: Game[]): Promise<Game[]> => {
		loading ??= load()
			.then(stored => {
				colors = new Map([...readStoredCrestColors(stored), ...colors]);
			})
			.catch(err => logWarn('Failed to read the stored crest colours.', err));
		await loading;

		const missing = crestsToRead(games, colors);
		if (missing.length > 0) {
			const recorded = await Promise.all(missing.map(read));
			if (recorded.some(Boolean)) {
				await save(toStored(colors)).catch(err => logWarn('Failed to persist crest colours.', err));
			}
		}
		return paintCrestColors(games, colors);
	};

	return { paint };
};
