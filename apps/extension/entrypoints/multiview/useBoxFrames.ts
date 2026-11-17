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

export const stallMs = 3000;

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

export default (tabId: number | null, boxedIds?: readonly string[]) => {
	const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(() => new Set());
	const [onAirIds, setOnAirIds] = useState<ReadonlySet<string>>(() => new Set());
	const [hrefs, setHrefs] = useState<ReadonlyMap<string, string>>(() => new Map());
	const audibleRef = useRef<string | null>(null);
	const gameByFrameId = useRef(new Map<number, string>());
	const frames = useRef(new Map<number, frameState>());

	useEffect(() => {
		if (tabId === null) return;

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
				if (message.firstLevel) setHrefs(current => (current.get(gameId) === message.href ? current : new Map([...current, [gameId, message.href]])));
				const now = Date.now();
				const previous = frames.current.get(frameId);
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

	const boxedKey = boxedIds?.join(',');
	useEffect(() => {
		if (boxedKey === undefined) return;
		const boxed = new Set(boxedKey.split(',').filter(Boolean));
		for (const [frameId, gameId] of gameByFrameId.current) {
			if (boxed.has(gameId)) continue;
			gameByFrameId.current.delete(frameId);
			frames.current.delete(frameId);
		}
		setReadyIds(current => ([...current].every(id => boxed.has(id)) ? current : new Set([...current].filter(id => boxed.has(id)))));
		setHrefs(current => ([...current.keys()].every(id => boxed.has(id)) ? current : new Map([...current].filter(([id]) => boxed.has(id)))));
	}, [boxedKey]);

	const setAudible = useCallback((gameId: string | null) => {
		audibleRef.current = gameId;
		if (tabId === null) return;
		for (const [frameId, frameGameId] of gameByFrameId.current) {
			const message: ExtensionMessage = { type: 'MULTIVIEW_MUTE', muted: frameGameId !== gameId };
			browser.tabs.sendMessage(tabId, message, { frameId }).catch(() => {});
		}
	}, [tabId]);

	return { readyIds, onAirIds, hrefs, setAudible };
};
