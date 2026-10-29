import { useRef, type RefObject } from 'react';
import MultiviewFlight from './multiviewFlight';
import useFlights from './useFlights';

const beams = [1, 2, 3, 4];

// The loop behind the boxes, in our colours the way a broadcast's studio loop is in theirs: orange
// beams sweeping across each other on their own clocks, and the wordmark's arrows flying through
// behind the boxes. Beams and arrows share one layer so the store art's grain falls on both.
const MultiviewBackdrop = ({ grid }: { grid: RefObject<HTMLElement | null> }) => {
	const backdropRef = useRef<HTMLDivElement>(null);
	const { flights, landed } = useFlights(backdropRef, grid);

	return (
		<div ref={backdropRef} className='multiview-backdrop' aria-hidden='true'>
			<div className='multiview-light'>
				{beams.map(beam => <div key={beam} className={`multiview-beam multiview-beam-${beam}`} />)}
				{flights.map(flight => <MultiviewFlight key={flight.id} flight={flight} onLanded={landed} />)}
			</div>
		</div>
	);
};

export default MultiviewBackdrop;
