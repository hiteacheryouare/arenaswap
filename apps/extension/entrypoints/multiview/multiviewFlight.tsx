import { useId, useLayoutEffect, useRef } from 'react';
import type { flight } from './multiviewFlights';

const easing = 'cubic-bezier(0.65, 0, 0.35, 1)';

// One of the wordmark's arrows: the line draws out behind its head, stays whole until the head is off
// the page, then pulls in after it. A dashed one is a fixed dashed line shown through a moving mask.
const MultiviewFlight = ({ flight, onLanded }: { flight: flight; onLanded: (id: number) => void }) => {
	const maskId = `flight${useId().replace(/[^\w-]/g, '')}`;
	const lineRef = useRef<SVGPathElement>(null);
	const headRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const line = lineRef.current;
		const head = headRef.current;
		if (!line || !head) return;
		const length = line.getTotalLength();
		line.style.strokeDasharray = `${length} ${length}`;
		const draw = length / flight.speed * 1000;
		const timing = { duration: draw * (1 + flight.retract), fill: 'both' } as const;
		const arrives = 1 / (1 + flight.retract);

		const lineMotion = line.animate([
			{ strokeDashoffset: length, easing },
			{ strokeDashoffset: 0, offset: arrives, easing },
			{ strokeDashoffset: -length },
		], timing);
		const headMotion = head.animate([
			{ offsetDistance: '0%', easing },
			{ offsetDistance: '100%', offset: arrives },
			{ offsetDistance: '100%' },
		], timing);
		headMotion.onfinish = () => onLanded(flight.id);
		return () => {
			lineMotion.cancel();
			headMotion.cancel();
		};
	}, [flight, onLanded]);

	const className = flight.orange ? 'multiview-flight multiview-flight-orange' : 'multiview-flight';
	return (
		<div className={className} style={{ opacity: flight.strength }}>
			<svg className='multiview-flight-trail'>
				{flight.dashed ? (
					<>
						<mask id={maskId} maskUnits='userSpaceOnUse' x='-100%' y='-100%' width='300%' height='300%'>
							<path ref={lineRef} className='multiview-flight-reveal' d={flight.path} />
						</mask>
						<path className='multiview-flight-line multiview-flight-dashes' d={flight.path} mask={`url(#${maskId})`} />
					</>
				) : (
					<path ref={lineRef} className='multiview-flight-line' d={flight.path} />
				)}
			</svg>
			<div ref={headRef} className='multiview-flight-head' style={{ offsetPath: `path('${flight.path}')` }}>
				<svg viewBox='0 0 15 20'>
					<path d='M2 2 L13 10 L2 18' />
				</svg>
			</div>
		</div>
	);
};

export default MultiviewFlight;
