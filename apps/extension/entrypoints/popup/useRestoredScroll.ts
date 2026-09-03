import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

// The popup has no router. Navigation is a `view` string, and `app.tsx` keys the view shell on it,
// so every trip out of a view unmounts that view's scroller along with the `scrollTop` sitting on
// it. That offset is DOM state, not React state, so nothing preserves it for us.
//
// The offset is therefore parked in a ref the app owns, which outlives any one mount of the view.
// Restoring happens in a layout effect rather than an effect: layout effects run before paint, so
// the list is never drawn at the top and then jumped.
//
// The offset is captured twice, and both halves earn their place. A scroll listener covers the
// normal case without depending on React's teardown order. A read at cleanup covers the frame the
// view is left in: scroll events are dispatched asynchronously, so a scroll immediately before the
// view goes away never reaches the listener.
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
