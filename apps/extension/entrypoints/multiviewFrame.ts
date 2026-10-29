import type { ExtensionMessage, MultiviewFrameStatusMessage } from '@arenaswap/core/types';
import { browser } from 'wxt/browser';

const reportIntervalMs = 1000;

const playingVideo = (): HTMLVideoElement | undefined => {
	const videos = [...document.querySelectorAll('video')];
	const playing = videos.filter(video => !video.paused && video.readyState >= 2);
	return (playing.length > 0 ? playing : videos)
		.toSorted((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0];
};

// Registered for every frame on every site while a Multiview tab is open, so it leaves at once
// unless the page at the top is ours.
export default defineUnlistedScript({
	include: ['chrome', 'edge'],
	main() {
		if (window === window.top) return;
		const ancestors = location.ancestorOrigins;
		const topOrigin = ancestors[ancestors.length - 1];
		// A player frame can hide its ancestors behind a no-referrer policy. It asks once, and only
		// keeps reporting if the Multiview page answers.
		const unsure = topOrigin === undefined || topOrigin === 'null';
		if (topOrigin !== new URL(browser.runtime.getURL('/')).origin && !unsure) return;

		let muted = true;
		let answered = false;
		const audibleVolume = new WeakMap<HTMLMediaElement, number>();

		// Silenced with the volume, never with `muted`: Chrome pauses muted video in a tab that is not
		// showing, which is every box while Multiview gets ready. Players reset their own volume, so it
		// is put back whenever one plays or touches it.
		const enforceMute = () => {
			for (const element of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
				if (element.muted) element.muted = false;
				if (muted && element.volume !== 0) {
					audibleVolume.set(element, element.volume);
					element.volume = 0;
				}
				if (!muted && element.volume === 0) element.volume = audibleVolume.get(element) ?? 1;
				if (!muted && element.paused) element.play().catch(() => {});
			}
		};

		const report = async () => {
			const video = playingVideo();
			const status: MultiviewFrameStatusMessage = {
				type: 'MULTIVIEW_FRAME_STATUS',
				name: window.name,
				firstLevel: window.parent === window.top,
				href: location.href,
				playing: video !== undefined && !video.paused && video.readyState >= 2,
				paused: video?.paused ?? true,
				time: video?.currentTime ?? 0,
			};
			try {
				const reply = await browser.runtime.sendMessage(status) as { muted?: boolean } | undefined;
				if (typeof reply?.muted === 'boolean') {
					answered = true;
					muted = reply.muted;
					enforceMute();
				}
			} catch {}
			if (unsure && !answered) clearInterval(timer);
		};

		browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
			if (message.type !== 'MULTIVIEW_MUTE') return;
			muted = message.muted;
			enforceMute();
		});

		document.addEventListener('play', enforceMute, true);
		document.addEventListener('volumechange', enforceMute, true);
		const timer = setInterval(() => void report(), reportIntervalMs);
	},
});
