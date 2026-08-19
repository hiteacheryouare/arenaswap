import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computePowerScore } from 'powerscore';
import type { ScoreSnapshot } from 'powerscore';
import { defaultCooldownSecs, defaultSensitivity, pollIntervalMs, sensitivityThresholds } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreResult } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import { LeagueSectionHeader, PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import { heroGameAt, heroGames, heroTickCount, heroTickMs } from './heroGames';

// A browser with five streams open and the extension running inside it.
//
// The tab strip, the address bar and the popup are drawn here; the game cards and the popup
// chrome are the shipped components from @arenaswap/ui. The switching is not choreographed:
// each tick scores all five games with `computePowerScore` and applies the shipped sensitivity
// threshold and cooldown, so the tab changes for the same reason it changes on your machine.
//
// The footage is real game footage under a free licence. /credits names every clip.

const switchThreshold = sensitivityThresholds[defaultSensitivity];
const cooldownTicks = Math.round((defaultCooldownSecs * 1000) / pollIntervalMs);
const holdTicksAtEnd = 3;
// prefers-reduced-motion lands here instead of tick 0: far enough in that both switches have
// already happened, so the still frame shows a finished story rather than an opening position.
const restingTick = 18;
// A fixed base instead of Date.now(), so the server render and the first client render agree.
// The scorer only ever reads differences between snapshot timestamps, so the absolute value is
// arbitrary; using the wall clock would make the hero a hydration mismatch.
const heroEpoch = 1_767_225_600_000;

const emptyLeagueLogos = {} as Record<LeagueId, string>;
const noFavorites = new Set<string>();
const noop = () => {};

interface Scored {
	id: string;
	game: Game;
	result: PowerScoreResult;
	index: number;
}

// The popup's tab dropdown, with the same markup TabAssignSelect renders. It is inert here:
// there are no real tabs to assign, and a select that changes nothing should not look like it
// might.
const HeroTabSlot = ({ label }: { label: string }) => (
	<div className='game-card-tab-assign' data-card-control='true'>
		<select className='form-select form-select-sm' value={label} disabled aria-label={label} onChange={noop}>
			<option>{label}</option>
		</select>
	</div>
);

const BrowserHero = () => {
	const t = useT();
	const [tick, setTick] = useState(0);
	const [running, setRunning] = useState(false);
	const [reduced, setReduced] = useState(false);
	const [onScreenIndex, setOnScreenIndex] = useState(0);
	const [lastSwitch, setLastSwitch] = useState<{ from: string; to: string } | null>(null);

	const rootRef = useRef<HTMLDivElement>(null);
	const popupBodyRef = useRef<HTMLDivElement>(null);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const historyRef = useRef(new Map<string, ScoreSnapshot[]>());
	const winProbRef = useRef(new Map<string, number[]>());
	const lastSwitchTickRef = useRef(-cooldownTicks);
	const onScreenRef = useRef(0);

	// Recomputed for the whole board every tick, exactly as a poll does. Building the history in
	// a ref rather than state keeps the scorer seeing one append per tick even when React
	// re-renders for another reason.
	const scored = useMemo<Scored[]>(() => {
		const now = heroEpoch + tick * pollIntervalMs;
		return heroGames.map((script, index) => {
			const id = script.base.id;
			const game = heroGameAt(script, tick);

			const snapshots = historyRef.current.get(id) ?? [];
			const last = snapshots[snapshots.length - 1];
			if (!last || last.homeScore !== game.homeTeam.score || last.awayScore !== game.awayTeam.score || snapshots.length <= tick) {
				snapshots.push({ gameId: id, timestamp: now, homeScore: game.homeTeam.score, awayScore: game.awayTeam.score });
			}
			historyRef.current.set(id, snapshots);

			// ESPN's win probability is not in this demo's data, so it is derived from the margin.
			// It only feeds the ±5 variance boost, and leaving it out would silently drop a signal
			// the popup does show.
			const probs = winProbRef.current.get(id) ?? [];
			const margin = game.homeTeam.score - game.awayTeam.score;
			probs.push(Math.min(0.97, Math.max(0.03, 0.5 + margin * 0.045)));
			winProbRef.current.set(id, probs);

			return { id, game, index, result: computePowerScore(game, snapshots, 0, probs) };
		});
	}, [tick]);

	const best = useMemo(() => scored.reduce((a, b) => (b.result.total > a.result.total ? b : a)), [scored]);

	// The switch rule, not a script: clear the sensitivity gap and be off cooldown.
	useEffect(() => {
		const current = scored[onScreenRef.current];
		if (best.index === onScreenRef.current) return;
		if (best.result.total - current.result.total < switchThreshold) return;
		if (tick - lastSwitchTickRef.current < cooldownTicks) return;

		lastSwitchTickRef.current = tick;
		onScreenRef.current = best.index;
		setOnScreenIndex(best.index);
		setLastSwitch({ from: heroGames[current.index].tabTitle, to: heroGames[best.index].tabTitle });
	}, [best, scored, tick]);

	const restart = useCallback(() => {
		historyRef.current = new Map();
		winProbRef.current = new Map();
		lastSwitchTickRef.current = -cooldownTicks;
		onScreenRef.current = 0;
		setOnScreenIndex(0);
		setLastSwitch(null);
		setTick(0);
	}, []);

	useEffect(() => {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			setReduced(query.matches);
			if (query.matches) {
				setTick(restingTick);
				onScreenRef.current = 2;
				setOnScreenIndex(2);
			}
		};
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, []);

	// Only runs while it is both on screen and in a visible tab. A hero animation that keeps
	// scoring games in a background tab is just a battery drain.
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

	// Play the tab you are on, pause the rest. Sources attach on first use so a visitor who
	// never scrolls past the hero downloads one clip instead of five.
	useEffect(() => {
		videoRefs.current.forEach((video, index) => {
			if (!video) return;
			const active = index === onScreenIndex;
			if (active && !video.getAttribute('src')) video.setAttribute('src', video.dataset.src ?? '');
			if (active && running) void video.play().catch(noop);
			else video.pause();
		});
	}, [onScreenIndex, running]);

	// The popup scrolls in real life too, and the card that just took over is usually below the
	// fold. Bringing it into view is this page's doing, not the extension's.
	useEffect(() => {
		const body = popupBodyRef.current;
		const block = body?.querySelector<HTMLElement>(`[data-hero-card="${heroGames[onScreenIndex].base.id}"]`);
		if (!body || !block) return;
		// Only when it is actually out of view. Scrolling unconditionally pushed the popup's own
		// header off the top on the very first frame, which made the demo open on a headless panel.
		const top = block.offsetTop;
		const bottom = top + block.offsetHeight;
		if (top >= body.scrollTop && bottom <= body.scrollTop + body.clientHeight) return;
		body.scrollTo({ top: Math.max(0, top - 12), behavior: reduced ? 'auto' : 'smooth' });
	}, [onScreenIndex, reduced]);

	const onScreen = heroGames[onScreenIndex];
	const scoreById = useMemo(() => new Map(scored.map(s => [s.id, s])), [scored]);
	const leagueOrder = useMemo(() => {
		const seen: LeagueId[] = [];
		heroGames.forEach(script => {
			if (!seen.includes(script.base.league)) seen.push(script.base.league);
		});
		return seen;
	}, []);

	return (
		<div className='browser-hero' ref={rootRef}>
			<div className='browser' role='group' aria-label='A browser with five live games open and ArenaSwap running'>

				<div className='browser-titlebar'>
					<span className='browser-lights' aria-hidden='true'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{heroGames.map((script, index) => (
							<span
								key={script.base.id}
								className={`browser-tab${index === onScreenIndex ? ' is-active' : ''}`}
								aria-current={index === onScreenIndex ? 'true' : undefined}
							>
								<img src={`/arenaswap/images/leagues/${script.base.league}.png`} alt='' className='browser-tab-favicon' />
								<span className='browser-tab-title'>{script.tabTitle}</span>
							</span>
						))}
					</div>
				</div>

				<div className='browser-toolbar'>
					<span className='browser-nav' aria-hidden='true'>
						<i className='bi bi-arrow-left' />
						<i className='bi bi-arrow-right' />
						<i className='bi bi-arrow-clockwise' />
					</span>
					<span className='browser-url'>
						<i className='bi bi-lock-fill' />
						{onScreen.tabHost}
					</span>
					<span className='browser-extension' aria-hidden='true'>
						<img src='/arenaswap/images/icon_white_on_transparent.svg' alt='' />
					</span>
				</div>

				<div className='browser-viewport'>
					{heroGames.map((script, index) => (
						<video
							key={script.base.id}
							ref={element => { videoRefs.current[index] = element; }}
							className={`browser-video${index === onScreenIndex ? ' is-active' : ''}`}
							data-src={`/arenaswap/video/${script.video}.mp4`}
							poster={`/arenaswap/video/${script.poster}.jpg`}
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
				<div className='popup-container' ref={popupBodyRef}>
					<PopupHeader
						logoSrc='/arenaswap/images/full_logo_white_on_transparent.svg'
						enabled
						onToggleEnabled={noop}
						onOpenSettings={noop}
						onStartTour={noop}
					/>
					<PopupSectionTitle first>{t('main.sectionActiveLiveTabs')}</PopupSectionTitle>
					{leagueOrder.map(league => (
						<div key={league} data-hero-card={heroGames.find(script => script.base.league === league)?.base.id}>
							<LeagueSectionHeader league={league} logos={emptyLeagueLogos} />
							{heroGames
								.filter(script => script.base.league === league)
								.map(script => {
									const entry = scoreById.get(script.base.id);
									if (!entry) return null;
									return (
										<div key={script.base.id}>
											<GameCard
												game={entry.game}
												excitementResult={entry.result}
												favoriteTeamIds={noFavorites}
												onToggleFavoriteTeam={noop}
												onOpenGameDetail={noop}
												bettingPrefs={{ bettingEnabled: false }}
												tabSlot={<HeroTabSlot label={`Tab ${entry.index + 1}: ${script.tabHost}`} />}
											/>
										</div>
									);
								})}
						</div>
					))}
				</div>
			</div>

			<p className='browser-caption' aria-live='polite'>
				{lastSwitch
					? <>ArenaSwap moved you off <b>{lastSwitch.from}</b> and onto <b>{lastSwitch.to}</b>.</>
					: <>You are watching <b>{onScreen.tabTitle}</b>, the best game on the board.</>}
			</p>

			{reduced && (
				<button type='button' className='browser-replay' onClick={() => { setReduced(false); restart(); }}>
					Play the demo
				</button>
			)}
		</div>
	);
};

export default BrowserHero;
