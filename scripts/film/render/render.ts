// Shoots the films: drives the stage in headless Chrome one frame at a time on a virtual clock, pipes
// every frame into ffmpeg, and lays the synthesized score under it.
//
// Run: npm run film -- [options]   (builds first; `npm run film:render -- …` skips the build)
//   --cut 15,30,60           which cuts (default: all three)
//   --format landscape,portrait
//   --locale en              any locale under apps/extension/locales (default: en)
//   --stills 12.5,23         write PNG stills at these times instead of a video
//   --jobs 2                 how many renders run at once (default: 2)
//   --scale 0.5              a smaller, quicker preview (default: 1)
//   --offline                never fetch a crest the cache does not already hold
//
// Output: scripts/film/out/ (gitignored)
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import renderScore from '../audio/score';
import { writeWav } from '../audio/wav';
import cuts from '../stage/cuts';
import type { Format } from '../stage/cuts/cutTypes';
import { frameSizes } from '../stage/cuts/cutTypes';
import { fps } from '../stage/timing';
import connectCdp, { type CdpConnection } from './cdp';
import attachNetCache from './netCache';
import pageClockSource from './pageClock';
import startFilmServer from './server';
import { findChrome, findFfmpeg, launchChrome } from './tools';

const args = process.argv.slice(2);
const option = (name: string) => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? args[index + 1] : undefined;
};
const list = (name: string, fallback: string[]) => option(name)?.split(',').map(value => value.trim()).filter(Boolean) ?? fallback;

const root = join(__dirname, '..', '..', '..');
const filmDir = join(root, 'scripts', 'film');
const outDir = join(filmDir, 'out');
const cacheDir = join(filmDir, '.cache', 'net');
const extensionRoot = join(root, 'apps', 'extension', '.output', 'film', 'chrome-mv3');
const stageRoot = join(filmDir, '.build', 'stage');
const dataRoot = join(filmDir, 'data');

const cutIds = list('cut', ['15', '30', '60']) as (keyof typeof cuts)[];
const formats = list('format', ['landscape', 'portrait']) as Format[];
const locale = option('locale') ?? 'en';
const stills = option('stills')?.split(',').map(Number).filter(Number.isFinite);
const jobs = Math.max(1, Number(option('jobs') ?? 2));
const offline = args.includes('--offline');
const scale = Number(option('scale') ?? 1);

// The night starts here on the page's own clock. The stage reads its own time off frame numbers and
// every popup reads the night off its clock in the cut, so this only has to be the right evening.
const initialVirtualTime = Date.parse('2026-10-03T23:25:00Z') / 1000;

const formatTag: Record<Format, string> = { landscape: '16x9', portrait: '9x16' };

// A stuck step is reported rather than waited on forever: virtual time will not advance while a
// request is in flight, so a request that never finishes freezes the render without an error.
const withTimeout = <T>(promise: Promise<T>, what: () => string, seconds = 30): Promise<T> => Promise.race([
	promise,
	new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Stuck for ${seconds}s: ${what()}`)), seconds * 1000).unref()),
]);

const advance = async (cdp: CdpConnection, milliseconds: number, pending: Map<string, string>) => {
	const expired = cdp.once('Emulation.virtualTimeBudgetExpired');
	await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: milliseconds });
	await withTimeout(expired, () => `waiting on ${pending.size} request(s): ${[...pending.values()].slice(0, 5).join(', ')}`);
};

// Chrome answers a screenshot off the next compositor frame, and with virtual time paused it now and
// then never schedules one. Half a millisecond of virtual time is enough to make it draw.
const capture = async (cdp: CdpConnection, params: object, pending: Map<string, string>, frame: number): Promise<string> => {
	const shot = cdp.send<{ data: string }>('Page.captureScreenshot', params);
	for (let nudge = 0; nudge < 20; nudge++) {
		const result = await Promise.race([shot, new Promise<null>(resolve => setTimeout(() => resolve(null), 2000).unref())]);
		if (result) return result.data;
		await advance(cdp, 0.5, pending);
	}
	throw new Error(`Chrome never drew frame ${frame}`);
};

const evaluate = async <T>(cdp: CdpConnection, expression: string): Promise<T> => {
	const result = await cdp.send<{ result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
	if (result.exceptionDetails) throw new Error(`${expression}: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
	return result.result.value;
};

const encoder = (ffmpeg: string, size: { width: number; height: number }, audioFile: string, outFile: string) => spawn(ffmpeg, [
	'-hide_banner', '-loglevel', 'error', '-y',
	'-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
	'-i', audioFile,
	'-map', '0:v', '-map', '1:a',
	'-vf', `scale=${size.width}:${size.height}:out_color_matrix=bt709:out_range=tv,format=yuv420p`,
	'-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-tune', 'animation',
	'-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
	'-c:a', 'aac', '-b:a', '256k',
	'-movflags', '+faststart', '-shortest',
	outFile,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const shoot = async (cutId: keyof typeof cuts, format: Format, origin: string, chromePath: string, ffmpegPath: string) => {
	const cut = cuts[cutId];
	const size = frameSizes[format];
	const name = `arenaswap-${cutId}s-${formatTag[format]}${locale === 'en' ? '' : `-${locale}`}${scale === 1 ? '' : '-preview'}`;
	const output = { width: Math.round(size.width * scale / 2) * 2, height: Math.round(size.height * scale / 2) * 2 };
	const started = Date.now();
	const chrome = await launchChrome(chromePath);
	const cdp = await connectCdp(chrome.webSocketUrl);
	const errors: string[] = [];
	cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails?.exception?.description ?? exceptionDetails?.text));
	cdp.on('Runtime.consoleAPICalled', ({ type, args: values }) => {
		if (type === 'error') errors.push(values.map((value: { value?: unknown; description?: string }) => value.value ?? value.description).join(' '));
	});

	try {
		await cdp.send('Page.enable');
		await cdp.send('Runtime.enable');
		const pending = new Map<string, string>();
		await cdp.send('Network.enable');
		cdp.on('Network.requestWillBeSent', ({ requestId, request }) => pending.set(requestId, request.url));
		for (const done of ['Network.loadingFinished', 'Network.loadingFailed']) cdp.on(done, ({ requestId }) => pending.delete(requestId));
		const netStats = await attachNetCache(cdp, cacheDir, offline);
		await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: false });
		await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
		await cdp.send('Emulation.setLocaleOverride', { locale: locale.replace('_', '-') });
		await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: pageClockSource });
		await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause', initialVirtualTime });
		void cdp.send('Page.navigate', { url: `${origin}/film/index.html?cut=${cutId}&format=${format}&locale=${locale}` });

		for (let waited = 0; !(await evaluate<boolean>(cdp, 'Boolean(window.film)')); waited += 200) {
			if (waited > 120_000) throw new Error(`The stage never became ready. ${errors.join(' | ')}`);
			await advance(cdp, 200, pending);
		}

		const total = Math.round(cut.duration * fps);
		const wanted = stills ? new Set(stills.map(seconds => Math.min(total - 1, Math.round(seconds * fps)))) : null;
		const lastFrame = wanted ? Math.max(...wanted) : total - 1;
		mkdirSync(outDir, { recursive: true });

		let video: ReturnType<typeof encoder> | null = null;
		const audioFile = join(outDir, `.${name}.wav`);
		if (!wanted) {
			writeWav(audioFile, renderScore({ bpm: 128, bars: cut.bars, sections: cut.sections, cues: cut.cues, seed: 3 }), 24);
			video = encoder(ffmpegPath, output, audioFile, join(outDir, `${name}.mp4`));
		}

		for (let index = 0; index <= lastFrame; index++) {
			await withTimeout(evaluate(cdp, `film.frame(${index}); filmScrub(); 0`), () => `frame ${index}`);
			if (!wanted || wanted.has(index)) {
				const png = Buffer.from(await capture(cdp, {
					format: 'png',
					optimizeForSpeed: true,
					...(scale === 1 ? {} : { clip: { x: 0, y: 0, width: size.width, height: size.height, scale } }),
				}, pending, index), 'base64');
				if (video) {
					if (!video.stdin!.write(png)) await withTimeout(new Promise(resolve => video!.stdin!.once('drain', resolve)), () => `ffmpeg accepting frame ${index}`);
				} else {
					writeFileSync(join(outDir, `${name}-${(index / fps).toFixed(2)}s.png`), png);
				}
			}
			await advance(cdp, 1000 / fps, pending);
			if (index % 300 === 0 && index > 0) console.log(`  ${name}: ${index}/${lastFrame + 1} frames`);
		}

		if (video) {
			video.stdin!.end();
			const code = await new Promise<number | null>(resolve => video!.once('close', resolve));
			rmSync(audioFile, { force: true });
			if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
		}
		const seconds = ((Date.now() - started) / 1000).toFixed(0);
		console.log(`✓ ${name} (${seconds}s, ${netStats.downloads} downloads, ${netStats.hits} cache hits${netStats.misses.length ? `, ${netStats.misses.length} missing` : ''})`);
		if (errors.length > 0) console.warn(`  page errors in ${name}:\n    ${[...new Set(errors)].slice(0, 12).join('\n    ')}`);
	} finally {
		cdp.close();
		chrome.close();
	}
};

const main = async () => {
	const chromePath = findChrome();
	const ffmpegPath = findFfmpeg();
	const server = await startFilmServer(extensionRoot, stageRoot, dataRoot);
	const queue = cutIds.flatMap(cutId => formats.map(format => ({ cutId, format })));
	console.log(`Rendering ${queue.length} film${queue.length === 1 ? '' : 's'} (${locale}) with ${chromePath}`);
	try {
		const workers = Array.from({ length: Math.min(jobs, queue.length) }, async () => {
			for (let job = queue.shift(); job; job = queue.shift()) await shoot(job.cutId, job.format, server.origin, chromePath, ffmpegPath);
		});
		await Promise.all(workers);
	} finally {
		await server.close();
	}
};

main().catch(error => {
	console.error(error);
	process.exit(1);
});
