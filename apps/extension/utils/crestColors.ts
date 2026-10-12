import { logWarn } from '@arenaswap/core';
import type { Game, Team } from '@arenaswap/core/types';
// Subpaths rather than the package root: the root also loads logoTint and logoSwitchColor, which
// read localStorage at import and have no business in the service worker.
import { isHex } from '@arenaswap/chromatic/colorMath';
import { crestColorCalibration, crestColorFromPixels, crestSampleSize } from '@arenaswap/chromatic/crestColor';

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
const fetchConcurrency = 8;
const retryAfterMs = 5 * 60_000;

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
	now?: () => number;
}

export const createCrestColors = ({ load, save, sample = sampleCrestColor, now = Date.now }: crestColorDeps) => {
	let colors: crestColorMap = new Map();
	let loading: Promise<boolean> | null = null;
	// Held as promises so a second fetch landing mid-read waits for it.
	const reads = new Map<string, Promise<boolean>>();
	// A first college Saturday asks for a couple of hundred crests at once. Fetched all together on a
	// slow link they would hit the timeout together, so they queue, and a failure waits a while
	// before it is tried again rather than being tried on every poll.
	const failedAt = new Map<string, number>();
	const waiting: (() => void)[] = [];
	let active = 0;

	const withSlot = async <T>(task: () => Promise<T>): Promise<T> => {
		if (active < fetchConcurrency) active += 1;
		else await new Promise<void>(resolve => waiting.push(resolve));
		try {
			return await task();
		} finally {
			const next = waiting.shift();
			if (next) next();
			else active -= 1;
		}
	};

	const read = (src: string): Promise<boolean> => {
		const existing = reads.get(src);
		if (existing) return existing;
		const failed = failedAt.get(src);
		if (failed !== undefined && now() - failed < retryAfterMs) return Promise.resolve(false);
		const pending = withSlot(() => sample(src)).then(color => {
			reads.delete(src);
			if (color === undefined) {
				failedAt.set(src, now());
				return false;
			}
			failedAt.delete(src);
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
				return true;
			})
			.catch(err => {
				logWarn('Failed to read the stored crest colours.', err);
				loading = null;
				return false;
			});
		const loaded = await loading;

		const missing = crestsToRead(games, colors);
		if (missing.length > 0) {
			const recorded = await Promise.all(missing.map(read));
			// Saving over a store that never loaded would replace it with just this session's reads.
			if (loaded && recorded.some(Boolean)) {
				await save(toStored(colors)).catch(err => logWarn('Failed to persist crest colours.', err));
			}
		}
		return paintCrestColors(games, colors);
	};

	return { paint };
};
