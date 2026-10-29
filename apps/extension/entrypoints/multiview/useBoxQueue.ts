import type { MultiviewBox } from '@arenaswap/core/types';
import { useEffect, useState } from 'react';
import { startBoxes } from './boxQueue';

const sameStarts = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>) => (
	a.size === b.size && [...a].every(([gameId, at]) => b.get(gameId) === at)
);

// The games whose boxes have started loading their stream.
export default (boxes: readonly MultiviewBox[], readyIds: ReadonlySet<string>): ReadonlySet<string> => {
	const [startedAt, setStartedAt] = useState<ReadonlyMap<string, number>>(() => new Map());
	const waiting = boxes.some(box => !startedAt.has(box.gameId));

	useEffect(() => {
		const update = () => setStartedAt(current => {
			const next = startBoxes(boxes, current, readyIds, Date.now());
			return sameStarts(current, next) ? current : next;
		});
		update();
		if (!waiting) return;
		const timer = setInterval(update, 1000);
		return () => clearInterval(timer);
	}, [boxes, readyIds, waiting]);

	return new Set(startedAt.keys());
};
