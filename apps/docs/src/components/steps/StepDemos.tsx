import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { LeagueId } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import { leagueMarkOnColor } from '@arenaswap/ui/src/components/gameCardShared';
import { PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import SelectDropdown from '@arenaswap/ui/src/components/selectDropdown';
import TabFavicon from '@arenaswap/ui/src/components/tabFavicon';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import { TranslationContext, islandTranslator } from '../../i18n/islandStrings';
import { heroGames, heroTickCount } from '../hero/heroGames';
import { scoreBoardAt } from '../hero/heroTimeline';
import StepBrowser from './StepBrowser';
import type { StepTab } from './StepBrowser';
import { assignGameIndex, framesAt, loopHoldMs, stepBeats, stepPlayingAt } from './stepBeats';
import type { CursorFrame, CursorSpot } from './stepBeats';

// Each demo is drawn at one fixed size and scaled to its column, so the popup inside step 2 keeps the
// proportions of the real one at every width.
const stageWidth = 420;
const stageHeight = 432;
const fadeMs = 350;

const base = import.meta.env.BASE_URL;
const emptyLeagueLogos = {} as Record<LeagueId, string>;
const noFavorites = new Set<string>();
const noop = () => {};
const allTabs = heroGames.map((_, game) => ({ game }));

const spotSelectors: Record<Exclude<CursorSpot, 'rest'>, string> = {
	newTab: '[data-step-spot="newTab"]',
	toggle: '.game-card-tab-assign .form-control',
	// The first row of the menu is the placeholder.
	option: `.select-dropdown-menu .menu-item:nth-child(${assignGameIndex + 2})`,
};
const restPoint = { x: 56, y: 330 };

// The card shows its game at its best, whichever tick of the hero's timeline that is.
const peakOf = (index: number) => Array.from({ length: heroTickCount }, (_, tick) => scoreBoardAt(tick)[index])
	.reduce((best, entry) => (entry.result.total > best.result.total ? entry : best));

// Measured after every render rather than on a spot change: the new-tab button moves right each
// time a tab opens, so the same spot is somewhere else the second time round. Written to the element
// directly, since the position is read back out of layout.
const Cursor = ({ stageRef, frame, visible }: { stageRef: RefObject<HTMLDivElement | null>; frame: CursorFrame; visible: boolean }) => {
	const cursorRef = useRef<HTMLSpanElement>(null);

	useLayoutEffect(() => {
		const stage = stageRef.current;
		const cursor = cursorRef.current;
		if (!stage || !cursor) return;
		const place = ({ x, y }: { x: number; y: number }) => { cursor.style.transform = `translate(${x}px, ${y}px)`; };
		if (frame.spot === 'rest') {
			place(restPoint);
			return;
		}
		const box = stage.querySelector(spotSelectors[frame.spot])?.getBoundingClientRect();
		// A target that has just closed, like the menu after a pick, leaves the pointer where it was.
		if (!box?.width) return;
		const stageBox = stage.getBoundingClientRect();
		const scale = stageBox.width / stageWidth;
		place({
			x: (box.left - stageBox.left + box.width / 2) / scale,
			y: (box.top - stageBox.top + box.height / 2) / scale,
		});
	});

	return (
		<span ref={cursorRef} className={`step-demo-cursor${frame.pressed ? ' is-pressed' : ''}${visible ? ' is-visible' : ''}`}>
			<svg viewBox='0 0 14 21' width='14' height='21'>
				<path d='M1 1v16.2l4-3.9 2.6 6.1 2.6-1.1-2.6-6h5.5z' />
			</svg>
		</span>
	);
};

const Stage = ({ children, cursor, cursorVisible = false }: { children: ReactNode; cursor?: CursorFrame; cursorVisible?: boolean }) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		const fit = () => box.style.setProperty('--step-scale', String(box.clientWidth / stageWidth));
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(box);
		return () => observer.disconnect();
	}, []);

	return (
		<div className='step-demo' ref={boxRef} style={{ aspectRatio: `${stageWidth} / ${stageHeight}` }}>
			<div className='step-demo-stage' ref={stageRef} style={{ width: stageWidth, height: stageHeight }}>
				{children}
				{cursor && <Cursor stageRef={stageRef} frame={cursor} visible={cursorVisible} />}
			</div>
		</div>
	);
};

const AssignPopup = ({ open, assigned }: { open: boolean; assigned: boolean }) => {
	const t = useT();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const entry = useMemo(() => peakOf(assignGameIndex), []);
	const options = useMemo(() => [
		{ value: '', label: t('tabAssign.placeholder') },
		...heroGames.map((script, index) => ({
			value: String(index),
			label: script.tabTitle,
			image: <TabFavicon url={`${base}images/leagues/${script.base.league}.png`} />,
		})),
	], [t]);

	return (
		<div className='step-demo-popup' data-bs-theme='dark'>
			<div className='popup-container' ref={scrollerRef}>
				<PopupHeader
					scroller={scrollerRef}
					enabled
					interactive={false}
					toggleId='step-demo-enable-toggle'
					onToggleEnabled={noop}
					onOpenSettings={noop}
					onStartTour={noop}
				/>
				<PopupSectionTitle first>{t(assigned ? 'main.sectionActiveLiveTabs' : 'main.sectionOtherLiveGames')}</PopupSectionTitle>
				<GameCard
					game={entry.game}
					excitementResult={entry.result}
					favoriteTeamIds={noFavorites}
					onToggleFavoriteTeam={noop}
					onOpenGameDetail={noop}
					interactive={false}
					bettingPrefs={{ bettingEnabled: false }}
					tabSlot={(
						<div className='game-card-tab-assign' data-card-control='true'>
							<SelectDropdown
								value={assigned ? String(assignGameIndex) : ''}
								options={options}
								onChange={noop}
								ariaLabel={t('tabAssign.placeholder')}
								open={open}
							/>
						</div>
					)}
					leagueSlot={<LeagueMark league={entry.game.league} logos={emptyLeagueLogos} onColor={leagueMarkOnColor(entry.game)} />}
				/>
			</div>
		</div>
	);
};

export interface Step {
	title: string;
	copy: string;
}

const lastBeat = stepBeats.length - 1;

const Steps = ({ steps }: { steps: Step[] }) => {
	const [beat, setBeat] = useState(0);
	const [running, setRunning] = useState(false);
	const [reduced, setReduced] = useState(false);
	const [fading, setFading] = useState(false);
	const rootRef = useRef<HTMLOListElement>(null);

	useEffect(() => {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			setReduced(query.matches);
			if (query.matches) setBeat(lastBeat);
		};
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, []);

	// Only plays while the steps are on screen in a visible tab, the same rule as the hero.
	useEffect(() => {
		if (reduced || !rootRef.current) return;
		let visible = false;
		const sync = () => setRunning(visible && document.visibilityState === 'visible');
		const observer = new IntersectionObserver(entries => {
			visible = entries[0].isIntersecting;
			sync();
		}, { threshold: 0.35 });
		observer.observe(rootRef.current);
		document.addEventListener('visibilitychange', sync);
		return () => {
			observer.disconnect();
			document.removeEventListener('visibilitychange', sync);
		};
	}, [reduced]);

	useEffect(() => {
		if (!running || reduced) return;
		if (fading) {
			const timer = setTimeout(() => {
				setBeat(0);
				setFading(false);
			}, fadeMs);
			return () => clearTimeout(timer);
		}
		const timer = beat < lastBeat
			? setTimeout(() => setBeat(beat + 1), stepBeats[beat + 1].at - stepBeats[beat].at)
			: setTimeout(() => setFading(true), loopHoldMs);
		return () => clearTimeout(timer);
	}, [running, reduced, beat, fading]);

	const frames = framesAt(beat);
	const playing = reduced ? -1 : stepPlayingAt(beat);
	const { open, assign, best } = frames;

	const openTabs: StepTab[] = allTabs.slice(0, open.tabCount).map((tab, index) => (
		{ ...tab, loading: open.loading && index === open.tabCount - 1 }
	));
	const bestTabs: StepTab[] = allTabs.map(tab => ({ ...tab, sound: tab.game === best.onScreen ? 'audible' : 'muted' }));

	const demos = [
		<Stage key='open' cursor={open.cursor} cursorVisible={playing === 0}>
			<StepBrowser tabs={openTabs} active={open.tabCount - 1} />
		</Stage>,
		<Stage key='assign' cursor={assign.cursor} cursorVisible={playing === 1}>
			<StepBrowser tabs={allTabs} active={allTabs.length - 1} popupOpen>
				<AssignPopup open={assign.open} assigned={assign.assigned} />
			</StepBrowser>
		</Stage>,
		<Stage key='best'>
			<StepBrowser tabs={bestTabs} active={best.onScreen} />
		</Stage>,
	];

	return (
		<ol className={`steps${fading ? ' is-fading' : ''}`} ref={rootRef}>
			{steps.map((step, index) => (
				<li key={step.title}>
					<div className='step-demo-frame' aria-hidden='true' inert>
						{demos[index]}
					</div>
					<h3>{step.title}</h3>
					<p>{step.copy}</p>
				</li>
			))}
		</ol>
	);
};

const StepDemos = ({ strings, steps }: { strings?: Record<string, string>; steps: Step[] }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<Steps steps={steps} />
	</TranslationContext.Provider>
);

export default StepDemos;
