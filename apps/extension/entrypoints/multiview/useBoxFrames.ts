import type { ExtensionMessage, MultiviewFrameStatusMessage } from '@arenaswap/core/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';

interface frameSender {
	tab?: { id?: number };
	frameId?: number;
}

// Which boxes have a stream actually playing, read off the reports the frame script sends from every
// frame in this tab, and which box the sound belongs to, answered back on each report.
export default (tabId: number | null) => {
	const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(() => new Set());
	const audibleRef = useRef<string | null>(null);
	const gameByFrameId = useRef(new Map<number, string>());
	const lastTimeByFrameId = useRef(new Map<number, number>());

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

		const listener = (message: ExtensionMessage, sender: frameSender) => {
			if (message.type !== 'MULTIVIEW_FRAME_STATUS' || sender.tab?.id !== tabId || sender.frameId === undefined) return;
			const frameId = sender.frameId;
			return resolveGame(frameId, message).then(gameId => {
				if (!gameId) return {};
				const previous = lastTimeByFrameId.current.get(frameId);
				lastTimeByFrameId.current.set(frameId, message.time);
				// Playing is not enough: a player stuck on a spinner reports playing with a clock that never moves.
				if (message.playing && previous !== undefined && message.time > previous) {
					setReadyIds(ready => (ready.has(gameId) ? ready : new Set([...ready, gameId])));
				}
				return { muted: gameId !== audibleRef.current };
			}).catch(() => ({}));
		};

		browser.runtime.onMessage.addListener(listener);
		return () => browser.runtime.onMessage.removeListener(listener);
	}, [tabId]);

	const setAudible = useCallback((gameId: string | null) => {
		audibleRef.current = gameId;
		if (tabId === null) return;
		for (const [frameId, frameGameId] of gameByFrameId.current) {
			const message: ExtensionMessage = { type: 'MULTIVIEW_MUTE', muted: frameGameId !== gameId };
			browser.tabs.sendMessage(tabId, message, { frameId }).catch(() => {});
		}
	}, [tabId]);

	return { readyIds, setAudible };
};
