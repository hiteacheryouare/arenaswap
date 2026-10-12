import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromeCandidates: Record<string, string[]> = {
	darwin: [
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
	],
	win32: [
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
		'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	],
	linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

// kdenlive bundles a full ffmpeg build, which is the only one on some Macs.
const ffmpegCandidates: Record<string, string[]> = {
	darwin: ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/Applications/kdenlive.app/Contents/MacOS/ffmpeg'],
	win32: [],
	linux: ['/usr/bin/ffmpeg'],
};

const onPath = (name: string): string | undefined => {
	const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
	return lookup.status === 0 ? lookup.stdout.split(/\r?\n/)[0]?.trim() || undefined : undefined;
};

const firstExisting = (envName: string, binary: string, candidates: Record<string, string[]>): string => {
	const fromEnv = process.env[envName];
	if (fromEnv) {
		if (!existsSync(fromEnv)) throw new Error(`${envName} points at ${fromEnv}, which does not exist.`);
		return fromEnv;
	}
	const found = onPath(binary) ?? (candidates[process.platform] ?? []).find(path => existsSync(path));
	if (!found) throw new Error(`Could not find ${binary}. Set ${envName} to its full path.`);
	return found;
};

export const findChrome = () => firstExisting('CHROME_PATH', 'google-chrome', chromeCandidates);
export const findFfmpeg = () => firstExisting('FFMPEG_PATH', 'ffmpeg', ffmpegCandidates);

export interface LaunchedChrome {
	process: ChildProcess;
	webSocketUrl: string;
	close: () => void;
}

export const launchChrome = async (executable: string): Promise<LaunchedChrome> => {
	const profile = mkdtempSync(join(tmpdir(), 'arenaswap-film-'));
	const child = spawn(executable, [
		'--headless',
		'--remote-debugging-port=0',
		`--user-data-dir=${profile}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--hide-scrollbars',
		'--mute-audio',
		'--font-render-hinting=none',
		'--force-color-profile=srgb',
		'--disable-background-timer-throttling',
		'--disable-renderer-backgrounding',
		'--disable-backgrounding-occluded-windows',
		// What deterministic headless rendering needs, short of BeginFrame control (which macOS lacks):
		// every compositor stage finishes before a frame is drawn, images decode before they paint,
		// and animations and scrolling stay on the main thread where virtual time reaches them.
		'--run-all-compositor-stages-before-draw',
		'--disable-checker-imaging',
		'--disable-threaded-animation',
		'--disable-threaded-scrolling',
		'--disable-image-animation-resync',
		'--disable-new-content-rendering-timeout',
		'--disable-gpu',
		'about:blank',
	], { stdio: 'ignore' });

	const portFile = join(profile, 'DevToolsActivePort');
	for (let attempt = 0; attempt < 150 && !existsSync(portFile); attempt++) await new Promise(resolve => setTimeout(resolve, 100));
	if (!existsSync(portFile)) {
		child.kill();
		throw new Error('Chrome started but never opened its debugging port.');
	}
	const [port] = readFileSync(portFile, 'utf8').split(/\r?\n/);
	const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as { type: string; webSocketDebuggerUrl: string }[];
	const page = targets.find(target => target.type === 'page');
	if (!page) throw new Error('Chrome has no page target to drive.');

	return {
		process: child,
		webSocketUrl: page.webSocketDebuggerUrl,
		close: () => {
			child.kill();
			// Chrome holds the profile open for a moment after the kill.
			setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
		},
	};
};
