import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

const useRestoredScroll = (offsetRef: RefObject<number>): RefObject<HTMLDivElement | null> => {
	const scrollerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;

		// Assigning past the maximum clamps silently, so an offset deeper than the current content
		// lands at the bottom rather than throwing. Reading it straight back records the clamped
		// value, so the ref never holds an offset the list cannot reach.
		scroller.scrollTop = offsetRef.current ?? 0;
		offsetRef.current = scroller.scrollTop;

		const recordOffset = () => {
			offsetRef.current = scroller.scrollTop;
		};
		scroller.addEventListener('scroll', recordOffset, { passive: true });
		return () => {
			scroller.removeEventListener('scroll', recordOffset);
			// React runs layout cleanup before detaching the node, so this normally reads a real
			// offset. The guard is for the day it does not: a detached node reports 0, which would
			// overwrite whatever the listener had already recorded.
			if (scroller.isConnected) offsetRef.current = scroller.scrollTop;
		};
	}, [offsetRef]);

	return scrollerRef;
};

export default useRestoredScroll;
