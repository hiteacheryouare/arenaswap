import { useState } from 'react';

export type slideDirection = 'forward' | 'back';

const useSlideDirection = (position: number): slideDirection | null => {
	const [previous, setPrevious] = useState(position);
	const [direction, setDirection] = useState<slideDirection | null>(null);
	if (position !== previous) {
		setPrevious(position);
		setDirection(position < previous ? 'back' : 'forward');
	}
	return direction;
};

export const slideClassName = (direction: slideDirection | null) => {
	if (!direction) return '';
	return direction === 'back' ? ' popup-slide-in is-returning' : ' popup-slide-in';
};

export default useSlideDirection;
