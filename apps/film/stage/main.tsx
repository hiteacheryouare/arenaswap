import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import cuts from './cuts';
import type { Format } from './cuts/cutTypes';
import createSlate from './data/slate';
import type { FilmSlate, PregameData } from './data/slateTypes';
import Film, { contextsAt } from './film';
import createMeasure from './measure';
import createPopupHost from './popup/popupHost';
import shotModules from './shots';
import type { OverlayState } from './shots/shotTypes';
import preloadImages from './preload';
import { fps } from './timing';
import './styles/stage.scss';

const copyFiles = import.meta.glob<{ default: Record<string, string> }>('./locales/*.json', { eager: true });

const params = new URLSearchParams(location.search);
const cut = cuts[(params.get('cut') ?? '60') as keyof typeof cuts];
const format = (params.get('format') ?? 'landscape') as Format;
const locale = params.get('locale') ?? 'en';

const boot = async () => {
	const [rawSlate, pregame, messages] = await Promise.all([
		fetch('/film/data/saturday.json').then(response => response.json() as Promise<FilmSlate>),
		fetch('/film/data/pregame.json').then(response => response.json() as Promise<PregameData>),
		fetch(`/_locales/${locale}/messages.json`).then(response => response.json() as Promise<Record<string, { message: string }>>),
	]);
	const strings = copyFiles[`./locales/${locale}.json`]?.default ?? copyFiles['./locales/en.json']!.default;
	const english = copyFiles['./locales/en.json']!.default;
	const copy = (key: string) => strings[key] ?? english[key] ?? key;

	const slate = createSlate(rawSlate, pregame);
	const host = createPopupHost(cut, slate, messages);
	document.documentElement.lang = locale.replace('_', '-');

	await preloadImages(cut, slate);
	await document.fonts.ready;

	const container = document.getElementById('stage')!;
	const root = createRoot(container);
	const measure = createMeasure(container, host);
	let t = 0;
	let overlay: OverlayState | null = null;

	const draw = () => root.render(<Film t={t} cut={cut} format={format} slate={slate} host={host} copy={copy} overlay={overlay} />);

	const overlayAt = (): OverlayState | null => {
		const contexts = contextsAt({ t, cut, format, slate, host, copy });
		const states = contexts.map(ctx => shotModules[ctx.shot.kind].overlay?.(ctx, measure)).filter((state): state is OverlayState => state !== undefined);
		if (states.length === 0) return null;
		return { dot: states.map(state => state.dot).filter(dot => dot !== undefined && dot.radius > 0 && dot.opacity > 0).pop() };
	};

	const frame = (index: number) => {
		t = index / fps;
		host.tick(t);
		flushSync(draw);
		overlay = overlayAt();
		flushSync(draw);
	};

	frame(0);
	(window as unknown as { film: unknown }).film = {
		duration: cut.duration,
		fps,
		frames: Math.round(cut.duration * fps),
		frame,
		cues: cut.cues,
	};
};

(window as unknown as { filmReady: Promise<void> }).filmReady = boot();
