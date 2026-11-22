import { useEffect, useRef, useState } from 'react';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import { TranslationContext, islandTranslator } from '../../i18n/islandStrings';
import type { ReplayFrame } from './demoGames';

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

const knicks = { id: '18', name: 'New York Knicks', abbreviation: 'NYK', logo: espnTeamLogo('nba/500/nyk'), color: '#006BB6', alternateColor: '#F58426' };
const celtics = { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' };

const stepMs = 1200;
const holdMs = 4500;
const tickMs = 100;

interface ReplayCardProps {
	frames: ReplayFrame[];
	strings?: Record<string, string>;
}

interface Moment {
	index: number;
	clockSeconds: number;
}

const momentAt = (frames: ReplayFrame[], elapsed: number): Moment => {
	const last = frames.length - 1;
	const step = Math.floor(elapsed / stepMs);
	if (step >= last) return { index: last, clockSeconds: frames[last]!.clockSeconds };
	const from = frames[step]!.clockSeconds;
	const to = frames[step + 1]!.clockSeconds;
	return { index: step, clockSeconds: Math.round(from - (from - to) * ((elapsed % stepMs) / stepMs)) };
};

const ReplayCard = ({ frames, strings }: ReplayCardProps) => {
	const rootRef = useRef<HTMLDivElement>(null);
	const last = frames.length - 1;
	const [moment, setMoment] = useState<Moment>({ index: last, clockSeconds: frames[last]!.clockSeconds });

	useEffect(() => {
		const root = rootRef.current;
		if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const loopMs = last * stepMs + holdMs;
		let elapsed = 0;
		let timer = 0;
		let onScreen = false;

		const tick = () => {
			if (document.hidden || !onScreen) return;
			elapsed = (elapsed + tickMs) % loopMs;
			setMoment(momentAt(frames, elapsed));
		};

		setMoment(momentAt(frames, 0));
		timer = window.setInterval(tick, tickMs);
		const observer = new IntersectionObserver(([entry]) => {
			onScreen = Boolean(entry?.isIntersecting);
		});
		observer.observe(root);

		return () => {
			window.clearInterval(timer);
			observer.disconnect();
		};
	}, [frames, last]);

	const frame = frames[moment.index]!;
	const game: Game = {
		id: 'nyk-bos',
		league: 'nba',
		sportType: 'basketball',
		status: 'in',
		period: 4,
		clockSeconds: moment.clockSeconds,
		venueName: 'TD Garden',
		awayTeam: { ...knicks, score: frame.away },
		homeTeam: { ...celtics, score: frame.home },
	};
	const result: PowerScoreResult = {
		gameId: game.id,
		total: frame.total,
		closeness: 0,
		lateGame: 0,
		momentum: 0,
		leadChanges: 0,
		comeback: 0,
		reason: '',
	};

	return (
		<TranslationContext.Provider value={islandTranslator(strings)}>
			<div className='ps-replay' ref={rootRef}>
				<LiveGameCard
					game={game}
					excitementResult={result}
					favoriteTeamIds={new Set()}
					onToggleFavoriteTeam={() => {}}
					onOpenGameDetail={() => {}}
					interactive={false}
					bettingPrefs={{ bettingEnabled: false }}
				/>
			</div>
		</TranslationContext.Provider>
	);
};

export default ReplayCard;
