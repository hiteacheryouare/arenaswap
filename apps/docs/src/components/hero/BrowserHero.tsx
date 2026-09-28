import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TranslationContext, islandTranslator, tokenize } from '../../i18n/islandStrings';
import SiteBoard from '../board/SiteBoard';
import { heroGames, heroTickCount, heroTickMs } from './heroGames';
import { cooldownTicks, openingIndex, replayThrough, scoreBoardAt, shouldSwitch, switchThreshold } from './heroTimeline';
import type { HeroSwitch } from './heroTimeline';

// A browser with three streams open and the extension's Games screen over them. The popup is the
// shipped board; each tick scores all three games with `computePowerScore` and applies the shipped
// sensitivity threshold and cooldown, so the tab changes for the same reason it does on your machine.
//
// The footage is real game footage under a free licence. /credits names every clip.

const holdTicksAtEnd = 3;
// prefers-reduced-motion lands here instead of tick 0: far enough in that both switches have
// already happened, so the still frame shows a finished story rather than an opening position.
const restingTick = 18;

const base = import.meta.env.BASE_URL;
const noop = () => {};
const tabs = Object.fromEntries(heroGames.map((script, index) => [script.base.id, { number: index + 1 }]));

// The hero's own copy, separate from the `strings` map the shared components read: that one
// mirrors the extension key for key, and these sentences belong to this page.
export interface HeroStrings {
	captionSwitched: string;
	captionWatching: string;
	replay: string;
}

const HeroWindow = ({ copy }: { copy: HeroStrings }) => {
	const [tick, setTick] = useState(0);
	const [running, setRunning] = useState(false);
	const [reduced, setReduced] = useState(false);
	// Opens on the best game rather than the first one in the list: if auto-switching has been on,
	// you are already on the best game by the time you look.
	const [onScreenIndex, setOnScreenIndex] = useState(openingIndex);
	const [lastSwitch, setLastSwitch] = useState<HeroSwitch | null>(null);

	const rootRef = useRef<HTMLDivElement>(null);
	const popupBodyRef = useRef<HTMLDivElement>(null);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const lastSwitchTickRef = useRef(-cooldownTicks);
	const onScreenRef = useRef(openingIndex);

	// A pure function of the tick, so a re-render for any other reason cannot change the board.
	const scored = useMemo(() => scoreBoardAt(tick), [tick]);

	useEffect(() => {
		if (reduced) return;
		const target = shouldSwitch(scored, onScreenRef.current, tick, lastSwitchTickRef.current);
		if (!target) return;

		setLastSwitch({
			tick,
			from: heroGames[onScreenRef.current].tabTitle,
			to: heroGames[target.index].tabTitle,
			gap: target.result.total - scored[onScreenRef.current].result.total,
		});
		lastSwitchTickRef.current = tick;
		onScreenRef.current = target.index;
		setOnScreenIndex(target.index);
	}, [scored, tick, reduced]);

	const restart = useCallback(() => {
		lastSwitchTickRef.current = -cooldownTicks;
		onScreenRef.current = openingIndex;
		setOnScreenIndex(openingIndex);
		setLastSwitch(null);
		setTick(0);
	}, []);

	useEffect(() => {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			setReduced(query.matches);
			if (!query.matches) return;
			// Stop first: the tick effect keys off `running`.
			setRunning(false);
			// Which tab you are on at a given tick is a consequence of every switch before it, so the
			// still frame replays them rather than hardcoding an index.
			const resting = replayThrough(restingTick);
			lastSwitchTickRef.current = resting.lastSwitch?.tick ?? -cooldownTicks;
			onScreenRef.current = resting.onScreenIndex;
			setOnScreenIndex(resting.onScreenIndex);
			setLastSwitch(resting.lastSwitch);
			setTick(restingTick);
		};
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, []);

	// Only runs while it is both on screen and in a visible tab.
	useEffect(() => {
		if (reduced || !rootRef.current) return;
		let visible = false;
		const sync = () => setRunning(visible && document.visibilityState === 'visible');
		const observer = new IntersectionObserver(entries => {
			visible = entries[0].isIntersecting;
			sync();
		}, { threshold: 0.2 });
		observer.observe(rootRef.current);
		document.addEventListener('visibilitychange', sync);
		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', sync);
		};
	}, [reduced]);

	useEffect(() => {
		if (!running) return;
		const timer = setTimeout(() => {
			if (tick >= heroTickCount - 1 + holdTicksAtEnd) restart();
			else setTick(current => current + 1);
		}, heroTickMs);
		return () => clearTimeout(timer);
	}, [running, tick, restart]);

	// Play the tab you are on, pause the rest. Sources attach on first use so a visitor who never
	// scrolls past the hero downloads one clip instead of three.
	useEffect(() => {
		videoRefs.current.forEach((video, index) => {
			if (!video) return;
			const active = index === onScreenIndex;
			if (active && !video.getAttribute('src')) video.setAttribute('src', video.dataset.src ?? '');
			if (active && running) void video.play().catch(noop);
			else video.pause();
		});
	}, [onScreenIndex, running]);

	// The game that just took over is usually already at the top, on the stage. When it is not,
	// bringing it into view is this page's doing, not the extension's. Never before the first switch:
	// a popup opens at the top.
	useEffect(() => {
		if (!lastSwitch) return;
		const body = popupBodyRef.current;
		const block = body?.querySelector<HTMLElement>(`[data-game="${heroGames[onScreenIndex].base.id}"]`);
		if (!body || !block) return;
		const top = block.offsetTop;
		const bottom = top + block.offsetHeight;
		if (top >= body.scrollTop && bottom <= body.scrollTop + body.clientHeight) return;
		body.scrollTo({ top: Math.max(0, top - 12), behavior: reduced ? 'auto' : 'smooth' });
	}, [onScreenIndex, reduced, lastSwitch]);

	const onScreen = heroGames[onScreenIndex];
	const games = useMemo(() => scored.map(entry => entry.game), [scored]);
	const scores = useMemo(() => new Map(scored.map(entry => [entry.id, entry.result.total])), [scored]);

	return (
		<figure className='browser-hero' ref={rootRef}>
			<div className='browser' role='group' aria-label='A browser with three live games open and ArenaSwap running'>
				<div className='browser-titlebar'>
					<span className='browser-lights' aria-hidden='true'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{heroGames.map((script, index) => (
							<span
								key={script.base.id}
								className={`browser-tab${index === onScreenIndex ? ' is-active' : ''}`}
								aria-current={index === onScreenIndex ? 'true' : undefined}
							>
								<img src={`${base}images/leagues/${script.base.league}.png`} alt='' className='browser-tab-favicon' />
								<span className='browser-tab-title'>{script.tabTitle}</span>
							</span>
						))}
					</div>
				</div>

				<div className='browser-toolbar'>
					<span className='browser-nav' aria-hidden='true'>
						<i className='bi bi-arrow-left' />
						<i className='bi bi-arrow-right' />
					</span>
					<span className='browser-omnibox'>
						{onScreen.tabHost}<span className='browser-omnibox-path'>/watch/live</span>
					</span>
					<span className='browser-extension' aria-hidden='true'>
						<img src={`${base}images/icon_white_on_transparent.svg`} alt='' />
					</span>
				</div>

				<div className='browser-viewport'>
					{heroGames.map((script, index) => (
						<video
							key={script.base.id}
							ref={element => { videoRefs.current[index] = element; }}
							className={`browser-video${index === onScreenIndex ? ' is-active' : ''}`}
							data-src={`${base}video/${script.video}.mp4`}
							poster={`${base}video/${script.poster}.jpg`}
							muted
							loop
							playsInline
							preload='none'
							aria-hidden='true'
							tabIndex={-1}
						/>
					))}
				</div>
			</div>

			<div className='browser-popup'>
				<SiteBoard
					games={games}
					scores={scores}
					tabs={tabs}
					watchedId={onScreen.base.id}
					switchThreshold={switchThreshold}
					scroller={popupBodyRef}
					toggleId='hero-enable-toggle'
				/>
			</div>

			<figcaption className='browser-caption'>
				<span aria-live='polite'>
					{lastSwitch
						? tokenize(copy.captionSwitched).map((part, index) => (
							typeof part === 'string'
								? <span key={index}>{part}</span>
								: <b key={index}>{part.slot === 'from' ? lastSwitch.from : lastSwitch.to}</b>
						))
						: tokenize(copy.captionWatching).map((part, index) => (
							typeof part === 'string'
								? <span key={index}>{part}</span>
								: <b key={index}>{onScreen.tabTitle}</b>
						))}
				</span>
				{reduced && (
					<button type='button' className='btn btn-quiet btn-sm browser-replay' onClick={() => { setReduced(false); restart(); }}>
						{copy.replay}
					</button>
				)}
			</figcaption>
		</figure>
	);
};

const BrowserHero = ({ strings, copy }: { strings?: Record<string, string>; copy: HeroStrings }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<HeroWindow copy={copy} />
	</TranslationContext.Provider>
);

export default BrowserHero;
