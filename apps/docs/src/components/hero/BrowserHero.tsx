import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LeagueId } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import { PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import useReorderGlide from '@arenaswap/ui/src/components/useReorderGlide';
import { TranslationContext, islandTranslator, tokenize } from '../../i18n/islandStrings';
import { heroGames, heroTickCount, heroTickMs } from './heroGames';
import { cooldownTicks, openingIndex, reducedMotionTick, replayThrough, scoreBoardAt, shouldSwitch } from './heroTimeline';
import type { HeroSwitch } from './heroTimeline';

const base = import.meta.env.BASE_URL;
const emptyLeagueLogos = {} as Record<LeagueId, string>;
const noFavorites = new Set<string>();
const noop = () => {};

const HeroTabSlot = ({ label }: { label: string }) => (
	<div className='game-card-tab-assign' data-card-control='true'>
		<select className='form-control form-control-sm' value={label} disabled aria-label={label} onChange={noop}>
			<option>{label}</option>
		</select>
	</div>
);

export interface HeroStrings {
	browserLabel: string;
	captionSwitched: string;
	captionWatching: string;
	replay: string;
	tabLabel: string;
}

const HeroWindow = ({ copy }: { copy: HeroStrings }) => {
	const t = useT();
	const [tick, setTick] = useState(0);
	const [running, setRunning] = useState(false);
	const [reduced, setReduced] = useState(false);
	const [onScreenIndex, setOnScreenIndex] = useState(openingIndex);
	const [lastSwitch, setLastSwitch] = useState<HeroSwitch | null>(null);

	const rootRef = useRef<HTMLDivElement>(null);
	const popupBodyRef = useRef<HTMLDivElement>(null);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const lastSwitchTickRef = useRef(-cooldownTicks);
	const onScreenRef = useRef(openingIndex);

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
			setRunning(false);
			const resting = replayThrough(reducedMotionTick);
			lastSwitchTickRef.current = resting.lastSwitch?.tick ?? -cooldownTicks;
			onScreenRef.current = resting.onScreenIndex;
			setOnScreenIndex(resting.onScreenIndex);
			setLastSwitch(resting.lastSwitch);
			setTick(reducedMotionTick);
		};
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, []);

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
			if (tick >= heroTickCount - 1) restart();
			else setTick(current => current + 1);
		}, heroTickMs);
		return () => clearTimeout(timer);
	}, [running, tick, restart]);

	const rewoundIndexRef = useRef<number | null>(null);
	useEffect(() => {
		videoRefs.current.forEach((video, index) => {
			if (!video) return;
			const active = index === onScreenIndex;
			if (active && !video.getAttribute('src')) video.setAttribute('src', video.dataset.src ?? '');
			if (active && rewoundIndexRef.current !== index) {
				video.currentTime = 0;
				rewoundIndexRef.current = index;
			}
			if (active && running) void video.play().catch(noop);
			else video.pause();
		});
	}, [onScreenIndex, running]);

	useEffect(() => {
		if (!lastSwitch) return;
		const body = popupBodyRef.current;
		const block = body?.querySelector<HTMLElement>(`[data-hero-card="${heroGames[onScreenIndex].base.id}"]`);
		if (!body || !block) return;
		const top = block.offsetTop;
		const bottom = top + block.offsetHeight;
		if (top >= body.scrollTop && bottom <= body.scrollTop + body.clientHeight) return;
		body.scrollTo({ top: Math.max(0, top - 12), behavior: reduced ? 'auto' : 'smooth' });
	}, [onScreenIndex, reduced, lastSwitch]);

	useReorderGlide(popupBodyRef);

	const onScreen = heroGames[onScreenIndex];
	const ranked = useMemo(
		() => scored.toSorted((a, b) => (b.result.total - a.result.total) || (a.index - b.index)),
		[scored],
	);

	return (
		<div className='browser-hero' ref={rootRef}>
			<div className='browser' role='group' aria-label={copy.browserLabel} data-bs-theme='dark'>

				<div className='browser-titlebar'>
					<span className='browser-lights' aria-hidden='true'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{heroGames.map((script, index) => (
							<span
								key={script.base.id}
								className={`browser-tab${index === onScreenIndex ? ' is-active' : ''}`}
								aria-current={index === onScreenIndex ? 'true' : undefined}
							>
								<Crest logo={`${base}images/leagues/${script.base.league}.png`} abbreviation='' icon='bi-globe2' className='browser-tab-favicon' />
								<span className='browser-tab-title'>{script.tabTitle}</span>
								<span className='browser-tab-close' aria-hidden='true'><i className='bi bi-x-lg' /></span>
								<span className='browser-tab-flare' aria-hidden='true' />
							</span>
						))}
						<span className='browser-newtab' aria-hidden='true'><i className='bi bi-plus-lg' /></span>
					</div>
				</div>

				<div className='browser-toolbar'>
					<span className='browser-nav' aria-hidden='true'>
						<i className='bi bi-arrow-left' />
						<i className='bi bi-arrow-right' />
						<i className='bi bi-arrow-clockwise' />
					</span>
					<span className='browser-omnibox'>
						<i className='bi bi-sliders2 browser-omnibox-info' aria-hidden='true' />
						<span className='browser-omnibox-url'>
							{onScreen.tabHost}<span className='browser-omnibox-path'>/watch/live</span>
						</span>
						<i className='bi bi-star browser-omnibox-star' aria-hidden='true' />
					</span>
					<span className='browser-toolbar-end' aria-hidden='true'>
						<i className='bi bi-puzzle' />
						<span className='browser-extension'>
							<img src={`${base}images/icon_white_on_transparent.svg`} alt='' />
						</span>
						<span className='browser-avatar' />
						<i className='bi bi-three-dots-vertical' />
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

			<div className='browser-popup' data-bs-theme='dark'>
				<div className='popup-container' ref={popupBodyRef}>
					<PopupHeader
						scroller={popupBodyRef}
						enabled
						interactive={false}
						toggleId='hero-enable-toggle'
						onToggleEnabled={noop}
						onOpenSettings={noop}
						onStartTour={noop}
					/>
					<PopupSectionTitle first>{t('main.sectionActiveLiveTabs')}</PopupSectionTitle>
					{ranked.map(entry => (
						<div key={entry.id} data-hero-card={entry.id} data-glide-key={entry.id}>
							<GameCard
								game={entry.game}
								excitementResult={entry.result}
								favoriteTeamIds={noFavorites}
								onToggleFavoriteTeam={noop}
								onOpenGameDetail={noop}
								interactive={false}
								bettingPrefs={{ bettingEnabled: false }}
								tabSlot={<HeroTabSlot label={copy.tabLabel.split('{number}').join(String(entry.index + 1)).split('{host}').join(heroGames[entry.index].tabHost)} />}
								leagueSlot={<LeagueMark league={entry.game.league} logos={emptyLeagueLogos} />}
							/>
						</div>
					))}
				</div>
			</div>

			<p className='browser-caption' aria-live='polite'>
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
			</p>

			{reduced && (
				<button type='button' className='browser-replay' onClick={() => { setReduced(false); restart(); }}>
					{copy.replay}
				</button>
			)}
		</div>
	);
};

const BrowserHero = ({ strings, copy }: { strings?: Record<string, string>; copy: HeroStrings }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<HeroWindow copy={copy} />
	</TranslationContext.Provider>
);

export default BrowserHero;
