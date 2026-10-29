import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import planFlight, { type flight, type flightArea } from './multiviewFlights';

const mostAtOnce = 1;
const firstAfter = 1200;
const nextAfter = () => 8000 + Math.random() * 7000;

const gridArea = (grid: HTMLElement | null): flightArea | null =>
	grid && grid.childElementCount > 0 ? { x: grid.offsetLeft, y: grid.offsetTop, width: grid.offsetWidth, height: grid.offsetHeight } : null;

// Sends a wordmark arrow across the backdrop every 8 to 15 seconds, one at a time. The
// grid is read at launch, so a flight takes the margins the boxes leave at that moment.
export default (page: RefObject<HTMLElement | null>, grid: RefObject<HTMLElement | null>) => {
	const [flights, setFlights] = useState<flight[]>([]);
	const nextId = useRef(0);

	const landed = useCallback((id: number) => setFlights(current => current.filter(flight => flight.id !== id)), []);

	useEffect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let timer: ReturnType<typeof setTimeout>;
		const launch = () => {
			const root = page.current;
			if (root && !document.hidden) {
				const area = { x: 0, y: 0, width: root.clientWidth, height: root.clientHeight };
				const next = planFlight(nextId.current++, area, gridArea(grid.current));
				setFlights(current => current.length < mostAtOnce ? [...current, next] : current);
			}
			timer = setTimeout(launch, nextAfter());
		};
		timer = setTimeout(launch, firstAfter);
		return () => clearTimeout(timer);
	}, [page, grid]);

	return { flights, landed };
};
