import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Crest from '@arenaswap/ui/src/components/crest';
import { multiviewGames } from '../landing/multiviewGames';

const base = import.meta.env.BASE_URL;
const stepMs = 2800;

interface Slot {
	left: number;
	top: number;
	width: number;
	height: number;
}

const featuredSlot: Slot = { left: 0, top: 0, width: 66.4, height: 100 };
const soloSlot: Slot = { left: 0, top: 0, width: 100, height: 100 };
const sideSlot = (row: number): Slot => ({ left: 67.6, top: row * 34.2, width: 32.4, height: 31.6 });

const slotStyle = ({ left, top, width, height }: Slot): CSSProperties => ({
	left: `${left}%`,
	top: `${top}%`,
	width: `${width}%`,
	height: `${height}%`,
});

const MultiviewSolo = () => {
	const rootRef = useRef<HTMLDivElement>(null);
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const [order, setOrder] = useState(() => multiviewGames.map((_, index) => index));
	const [solo, setSolo] = useState(false);
	const [running, setRunning] = useState(false);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const observer = new IntersectionObserver(([entry]) => setRunning(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		videoRefs.current.forEach(video => {
			if (!video) return;
			if (running) {
				if (!video.src) video.src = video.dataset.src ?? '';
				video.play().catch(() => {});
			} else {
				video.pause();
			}
		});
	}, [running]);

	useEffect(() => {
		if (!running) return;
		let step = 0;
		const timer = window.setInterval(() => {
			const phase = step % 3;
			if (phase === 0) setOrder(current => [...current.slice(1), current[0]!]);
			if (phase === 1) setSolo(true);
			if (phase === 2) setSolo(false);
			step += 1;
		}, stepMs);
		return () => window.clearInterval(timer);
	}, [running]);

	return (
		<div className='about-solo' ref={rootRef} aria-hidden='true'>
			<div className='about-solo-stage'>
			{multiviewGames.map((game, index) => {
				const place = order.indexOf(index);
				const featured = place === 0;
				const slot = featured ? (solo ? soloSlot : featuredSlot) : sideSlot(place - 1);
				return (
					<div
						key={game.video}
						className={`multiview-demo-box about-solo-box${featured ? ' is-audible' : ''}${solo && !featured ? ' is-folded' : ''}`}
						style={slotStyle(slot)}
					>
						<div className='multiview-demo-bar' style={{ '--left': game.left.color, '--right': game.right.color } as CSSProperties}>
							<span className='multiview-demo-team'>
								<Crest logo={game.left.logo} abbreviation={game.left.abbreviation} teamColor={game.left.color} />
								<span className='about-solo-abbr'>{game.left.abbreviation}</span>
							</span>
							{featured && <i className='bi bi-volume-up-fill multiview-demo-sound' />}
							<span className='multiview-demo-team'>
								<span className='about-solo-abbr'>{game.right.abbreviation}</span>
								<Crest logo={game.right.logo} abbreviation={game.right.abbreviation} teamColor={game.right.color} />
							</span>
						</div>
						<video
							ref={element => { videoRefs.current[index] = element; }}
							className='multiview-demo-video'
							data-src={`${base}video/${game.video}.mp4`}
							poster={`${base}video/${game.video}.jpg`}
							muted
							loop
							playsInline
							preload='none'
							tabIndex={-1}
						/>
					</div>
				);
			})}
			</div>
		</div>
	);
};

export default MultiviewSolo;
