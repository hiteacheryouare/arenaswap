import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Crest from '@arenaswap/ui/src/components/crest';
import { heroGames } from '../hero/heroGames';

const base = import.meta.env.BASE_URL;

const tabs = [
	...heroGames.map(script => ({ title: script.tabTitle, host: script.tabHost, video: script.video, poster: script.poster, league: script.base.league })),
	{ title: 'Golden State at Indiana', host: 'wnba.com', video: 'multiview/wnba', poster: 'multiview/wnba', league: 'wnba' },
];

const roarMs = 1000;
const cursorLeavesMs = 350;
const clickMs = 1300;
const pressMs = 180;
const beatMs = 2400;

const otherTab = (current: number) => (current + 1 + Math.floor(Math.random() * (tabs.length - 1))) % tabs.length;

interface TabShuffleProps {
	label: string;
}

const TabShuffle = ({ label }: TabShuffleProps) => {
	const rootRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<(HTMLSpanElement | null)[]>([]);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const cursorRef = useRef<HTMLSpanElement>(null);
	const [active, setActive] = useState(0);
	const [roaring, setRoaring] = useState<number | null>(null);
	const [target, setTarget] = useState<number | null>(null);
	const [pressed, setPressed] = useState(false);
	const [running, setRunning] = useState(false);
	const activeRef = useRef(active);

	useEffect(() => {
		activeRef.current = active;
	}, [active]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const observer = new IntersectionObserver(([entry]) => setRunning(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!running) return;
		const timers: number[] = [];

		const beat = () => {
			const next = otherTab(activeRef.current);
			setRoaring(next);
			timers.push(window.setTimeout(() => setTarget(next), cursorLeavesMs));
			timers.push(window.setTimeout(() => setRoaring(null), roarMs));
			timers.push(window.setTimeout(() => {
				setPressed(true);
				setActive(next);
			}, clickMs));
			timers.push(window.setTimeout(() => setPressed(false), clickMs + pressMs));
			timers.push(window.setTimeout(beat, beatMs));
		};

		timers.push(window.setTimeout(beat, 600));
		return () => timers.forEach(timer => window.clearTimeout(timer));
	}, [running]);

	useEffect(() => {
		videoRefs.current.forEach((video, index) => {
			if (!video) return;
			if (running && index === active) {
				if (!video.src) video.src = video.dataset.src ?? '';
				video.play().catch(() => {});
			} else {
				video.pause();
			}
		});
	}, [active, running]);

	useLayoutEffect(() => {
		const root = rootRef.current;
		const cursor = cursorRef.current;
		const tab = target === null ? null : tabRefs.current[target];
		if (!root || !cursor) return;
		const rootBox = root.getBoundingClientRect();
		if (!tab) {
			cursor.style.transform = `translate(${rootBox.width * 0.62}px, ${rootBox.height * 0.7}px)`;
			return;
		}
		const box = tab.getBoundingClientRect();
		cursor.style.transform = `translate(${box.left - rootBox.left + box.width * 0.45}px, ${box.top - rootBox.top + box.height * 0.55}px)`;
	}, [target]);

	return (
		<div className='about-shuffle' ref={rootRef} role='img' aria-label={label}>
			<div className='browser' data-bs-theme='dark' aria-hidden='true'>
				<div className='browser-titlebar'>
					<span className='browser-lights'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{tabs.map((tab, index) => (
							<span
								key={tab.video}
								ref={element => { tabRefs.current[index] = element; }}
								className={`browser-tab${index === active ? ' is-active' : ''}${index === roaring ? ' is-roaring' : ''}`}
							>
								<Crest logo={`${base}images/leagues/${tab.league}.png`} abbreviation='' icon='bi-globe2' className='browser-tab-favicon' />
								<span className='browser-tab-title'>{tab.title}</span>
								{index === active && <i className='bi bi-volume-up-fill about-shuffle-sound' />}
								<span className='browser-tab-close'><i className='bi bi-x-lg' /></span>
								<span className='browser-tab-flare' />
							</span>
						))}
						<span className='browser-newtab'><i className='bi bi-plus-lg' /></span>
					</div>
				</div>

				<div className='browser-toolbar'>
					<span className='browser-nav'>
						<i className='bi bi-arrow-left' />
						<i className='bi bi-arrow-right' />
						<i className='bi bi-arrow-clockwise' />
					</span>
					<span className='browser-omnibox'>
						<i className='bi bi-sliders2 browser-omnibox-info' />
						<span className='browser-omnibox-url'>
							{tabs[active]!.host}<span className='browser-omnibox-path'>/watch/live</span>
						</span>
					</span>
				</div>

				<div className='browser-viewport'>
					{tabs.map((tab, index) => (
						<video
							key={tab.video}
							ref={element => { videoRefs.current[index] = element; }}
							className={`browser-video${index === active ? ' is-active' : ''}`}
							data-src={`${base}video/${tab.video}.mp4`}
							poster={`${base}video/${tab.poster}.jpg`}
							muted
							loop
							playsInline
							preload='none'
							tabIndex={-1}
						/>
					))}
				</div>
			</div>

			<span ref={cursorRef} className={`about-shuffle-cursor${running ? ' is-visible' : ''}${pressed ? ' is-pressed' : ''}`} aria-hidden='true'>
				<svg viewBox='0 0 14 21' width='14' height='21'>
					<path d='M1 1v16.2l4-3.9 2.6 6.1 2.6-1.1-2.6-6h5.5z' />
				</svg>
			</span>
		</div>
	);
};

export default TabShuffle;
