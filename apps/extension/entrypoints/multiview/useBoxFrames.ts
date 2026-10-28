import type { ExtensionMessage, MultiviewFrameStatusMessage } from '@arenaswap/core/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';

interface frameSender {
	tab?: { id?: number };
	frameId?: number;
}

interface frameState {
	reportedAt: number;
	time: number;
	advancedAt?: number;
	paused: boolean;
}

// How long a stream can sit with its clock stuck before its box goes back off air.
export const stallMs = 3000;

// The games whose picture shows rather than the off-air card. A paused player stays on show, so
// whatever it paused for (a "still watching?" prompt) is not hidden. A frame that stops reporting
// has gone, and counts for nothing.
const onAirAt = (frames: ReadonlyMap<number, frameState>, gameByFrameId: ReadonlyMap<number, string>, now: number) => {
	const onAir = new Set<string>();
	for (const [frameId, frame] of frames) {
		const gameId = gameByFrameId.get(frameId);
		if (!gameId || frame.advancedAt === undefined || now - frame.reportedAt >= stallMs) continue;
		if (frame.paused || now - frame.advancedAt < stallMs) onAir.add(gameId);
	}
	return onAir;
};

const sameIds = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every(id => b.has(id));

// Read off the reports the frame script sends from every frame in this tab: which boxes have ever
// had a stream play, which are playing now, and which box the sound belongs to, answered back on
// each report.
export default (tabId: number | null) => {
	const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(() => new Set());
	const [onAirIds, setOnAirIds] = useState<ReadonlySet<string>>(() => new Set());
	const audibleRef = useRef<string | null>(null);
	const gameByFrameId = useRef(new Map<number, string>());
	const frames = useRef(new Map<number, frameState>());

	useEffect(() => {
		if (tabId === null) return;

		// A box's own frame is named for its game. A player frame nested inside it is traced up to that one.
		const resolveGame = async (frameId: number, status: MultiviewFrameStatusMessage): Promise<string | undefined> => {
			const known = gameByFrameId.current.get(frameId);
			if (known) return known;
			if (status.firstLevel) {
				gameByFrameId.current.set(frameId, status.name);
				return status.name;
			}
			let currentId = frameId;
			let current = await browser.webNavigation.getFrame({ tabId, frameId });
			while (current && current.parentFrameId > 0) {
				currentId = current.parentFrameId;
				current = await browser.webNavigation.getFrame({ tabId, frameId: currentId });
			}
			const gameId = gameByFrameId.current.get(currentId);
			if (gameId) gameByFrameId.current.set(frameId, gameId);
			return gameId;
		};

		const refresh = () => {
			const next = onAirAt(frames.current, gameByFrameId.current, Date.now());
			setOnAirIds(current => (sameIds(current, next) ? current : next));
		};

		const listener = (message: ExtensionMessage, sender: frameSender) => {
			if (message.type !== 'MULTIVIEW_FRAME_STATUS' || sender.tab?.id !== tabId || sender.frameId === undefined) return;
			const frameId = sender.frameId;
			return resolveGame(frameId, message).then(gameId => {
				if (!gameId) return {};
				const now = Date.now();
				const previous = frames.current.get(frameId);
				// Playing is not enough: a player stuck on a spinner reports playing with a clock that never moves.
				const advanced = message.playing && previous !== undefined && message.time > previous.time;
				frames.current.set(frameId, { reportedAt: now, time: message.time, advancedAt: advanced ? now : previous?.advancedAt, paused: message.paused });
				if (advanced) setReadyIds(ready => (ready.has(gameId) ? ready : new Set([...ready, gameId])));
				refresh();
				return { muted: gameId !== audibleRef.current };
			}).catch(() => ({}));
		};

		browser.runtime.onMessage.addListener(listener);
		const ticker = setInterval(refresh, 1000);
		return () => {
			browser.runtime.onMessage.removeListener(listener);
			clearInterval(ticker);
		};
	}, [tabId]);

	const setAudible = useCallback((gameId: string | null) => {
		audibleRef.current = gameId;
		if (tabId === null) return;
		for (const [frameId, frameGameId] of gameByFrameId.current) {
			const message: ExtensionMessage = { type: 'MULTIVIEW_MUTE', muted: frameGameId !== gameId };
			browser.tabs.sendMessage(tabId, message, { frameId }).catch(() => {});
		}
	}, [tabId]);

	return { readyIds, onAirIds, setAudible };
};
