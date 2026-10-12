// Runs in every document before its own scripts, popups included.
//
// Chrome's virtual time already drives timers, requestAnimationFrame and Date, but CSS animations,
// transitions and the Web Animations API follow the compositor's wall clock. `filmScrub` pauses
// every one of them and sets its current time from the virtual clock, so a two-second render and a
// two-hour render produce the same frames. Math.random is seeded for the same reason: confetti.
const pageClockSource = `(() => {
	let seed = 0x2f6b1d;
	Math.random = () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	const scrubDocument = (doc, now) => {
		for (const animation of doc.getAnimations()) {
			if (animation.filmDone) continue;
			if (animation.filmStart === undefined) animation.filmStart = now;
			const timing = animation.effect && animation.effect.getComputedTiming ? animation.effect.getComputedTiming() : null;
			const local = (now - animation.filmStart) * (animation.playbackRate || 1);
			animation.pause();
			if (timing && Number.isFinite(timing.endTime) && local >= timing.endTime) {
				animation.filmDone = true;
				animation.finish();
			} else {
				animation.currentTime = local;
			}
		}
		for (const frame of doc.querySelectorAll('iframe')) {
			try {
				if (frame.contentDocument) scrubDocument(frame.contentDocument, now);
			} catch {}
		}
	};

	if (window === window.top) window.filmScrub = () => scrubDocument(document, performance.now());
})();`;

export default pageClockSource;
