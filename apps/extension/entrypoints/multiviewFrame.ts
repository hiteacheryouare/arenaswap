import type { ExtensionMessage, MultiviewFrameStatusMessage } from '@arenaswap/core/types';
import { browser } from 'wxt/browser';

const reportIntervalMs = 1000;
const wiggleDelayMs = 1000;

// Some players (Xfinity) keep their controls up until the mouse moves once, then hide them on their
// own idle timer. A stream that starts by itself never gets that first move, so it is faked.
const wigglePointer = (video: HTMLVideoElement) => {
	const bounds = video.getBoundingClientRect();
	const x = bounds.left + bounds.width / 2;
	const y = bounds.top + bounds.height / 2;
	const target = document.elementFromPoint(x, y) ?? video;
	for (const offset of [0, 1]) {
		const position = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x + offset, clientY: y + offset };
		target.dispatchEvent(new PointerEvent('pointermove', { ...position, pointerType: 'mouse', isPrimary: true }));
		target.dispatchEvent(new MouseEvent('mousemove', position));
	}
};

const playingVideo = (): HTMLVideoElement | undefined => {
	const videos = [...document.querySelectorAll('video')];
	const playing = videos.filter(video => !video.paused && video.readyState >= 2);
	return (playing.length > 0 ? playing : videos)
		.toSorted((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0];
};

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
		let playPending = false;
		let answered = false;
		const audibleVolume = new WeakMap<HTMLMediaElement, number>();

		// Silenced with the volume, never with `muted`: Chrome pauses muted video in a tab that is not
		// showing, which is every box while Multiview gets ready. Players reset their own volume, so it
		// is put back whenever one plays or touches it.
		const setMuted = (next: boolean) => {
			if (muted && !next) playPending = true;
			muted = next;
		};

		const enforceMute = () => {
			const elements = document.querySelectorAll<HTMLMediaElement>('video, audio');
			if (muted) playPending = false;
			for (const element of elements) {
				if (element.muted) element.muted = false;
				if (muted && element.volume !== 0) {
					audibleVolume.set(element, element.volume);
					element.volume = 0;
				}
				if (!muted && element.volume === 0) element.volume = audibleVolume.get(element) ?? 1;
				if (playPending && element.paused) element.play().catch(() => {});
			}
			if (elements.length > 0) playPending = false;
		};

		let reportedTime: number | undefined;
		let reportedAdvancing = false;
		let reporting = false;
		const reportProgress = () => {
			if (!reportedAdvancing && !reporting) void report();
		};

		let wiggleTimer: ReturnType<typeof setTimeout> | undefined;
		const scheduleWiggle = (event: Event) => {
			const video = event.target;
			if (!(video instanceof HTMLVideoElement)) return;
			clearTimeout(wiggleTimer);
			wiggleTimer = setTimeout(() => wigglePointer(video), wiggleDelayMs);
		};

		let listening = false;
		const listenForMedia = () => {
			if (listening) return;
			listening = true;
			document.addEventListener('play', enforceMute, true);
			document.addEventListener('volumechange', enforceMute, true);
			document.addEventListener('timeupdate', reportProgress, true);
			document.addEventListener('playing', scheduleWiggle, true);
		};

		const report = async () => {
			reporting = true;
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
			reportedAdvancing = status.playing && reportedTime !== undefined && status.time > reportedTime;
			reportedTime = status.time;
			try {
				const reply = await browser.runtime.sendMessage(status) as { muted?: boolean } | undefined;
				if (reply) answered = true;
				if (typeof reply?.muted === 'boolean') {
					listenForMedia();
					setMuted(reply.muted);
					enforceMute();
				}
			} catch {}
			reporting = false;
			if (unsure && !answered) clearInterval(timer);
		};

		browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
			if (message.type !== 'MULTIVIEW_MUTE') return;
			setMuted(message.muted);
			enforceMute();
		});

		if (!unsure) listenForMedia();
		const timer = setInterval(() => void report(), reportIntervalMs);
		void report();
	},
});
