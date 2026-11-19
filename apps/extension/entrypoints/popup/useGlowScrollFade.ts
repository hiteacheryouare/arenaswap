import { useEffect } from 'react';
import type { RefObject } from 'react';

export const glowFadeDistancePx = 120;

// Written onto the two glow layers rather than the container, so a scroll frame restyles them and
// not every card underneath.
const useGlowScrollFade = (scrollerRef: RefObject<HTMLElement | null>) => {
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const layers = scroller.querySelectorAll<HTMLElement>('.popup-glow, .popup-header');
		let written = '';

		const fade = () => {
			const out = String(Math.round(Math.min(1, scroller.scrollTop / glowFadeDistancePx) * 1000) / 1000);
			if (out === written) return;
			written = out;
			layers.forEach(layer => layer.style.setProperty('--glow-out', out));
		};

		fade();
		scroller.addEventListener('scroll', fade, { passive: true });
		return () => scroller.removeEventListener('scroll', fade);
	}, [scrollerRef]);
};

export default useGlowScrollFade;
