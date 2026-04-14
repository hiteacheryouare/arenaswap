import { useEffect, useRef } from 'react';
import type { Game } from '@arenaswap/core/types';
import type { confettiInstance, confettiOptions } from 'canvas-confetti';
import { buildLiveGameSnapshots, findFavoriteTeamScoreConfettiBursts } from './scoreConfettiHelpers';

interface useFavoriteScoreConfettiProps {
	games: Game[];
	favoriteTeamIds: Set<string>;
}

const useFavoriteScoreConfetti = ({ games, favoriteTeamIds }: useFavoriteScoreConfettiProps) => {
	const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const confettiInstanceRef = useRef<confettiInstance | null>(null);
	const confettiLoadPromiseRef = useRef<Promise<confettiInstance> | null>(null);
	const snapshotSeededRef = useRef(false);
	const previousLiveSnapshotsRef = useRef(buildLiveGameSnapshots([]));

	const ensureConfettiInstance = async (): Promise<confettiInstance> => {
		if (confettiInstanceRef.current) return confettiInstanceRef.current;
		if (!confettiLoadPromiseRef.current) {
			confettiLoadPromiseRef.current = import('canvas-confetti').then(module => {
				const canvas = confettiCanvasRef.current;
				if (!canvas) throw new Error('ArenaSwap: Confetti canvas is not mounted.');
				const createdConfetti = module.default.create(canvas, { resize: true });
				confettiInstanceRef.current = createdConfetti;
				return createdConfetti;
			});
		}
		return confettiLoadPromiseRef.current;
	};

	const launchBurst = (nextOptions: confettiOptions) => {
		void ensureConfettiInstance()
			.then(confetti => confetti(nextOptions))
			.catch(err => {
				console.error('ArenaSwap: Failed to render confetti burst:', err);
			});
	};

	useEffect(() => {
		const nextLiveSnapshots = buildLiveGameSnapshots(games);
		if (!snapshotSeededRef.current) {
			previousLiveSnapshotsRef.current = nextLiveSnapshots;
			snapshotSeededRef.current = true;
			return;
		}

		const bursts = findFavoriteTeamScoreConfettiBursts(
			previousLiveSnapshotsRef.current,
			nextLiveSnapshots,
			favoriteTeamIds,
		);
		previousLiveSnapshotsRef.current = nextLiveSnapshots;
		if (bursts.length === 0) return;

		for (const burst of bursts) {
			launchBurst({
				particleCount: burst.particleCount,
				spread: burst.spread,
				colors: burst.colors,
				origin: burst.origin,
				startVelocity: 40,
				scalar: 1,
				disableForReducedMotion: true,
			});
		}
	}, [games, favoriteTeamIds]);

	useEffect(() => {
		return () => {
			if (!confettiInstanceRef.current) return;
			confettiInstanceRef.current.reset();
			confettiInstanceRef.current = null;
			confettiLoadPromiseRef.current = null;
		};
	}, []);

	return confettiCanvasRef;
};

export default useFavoriteScoreConfetti;
