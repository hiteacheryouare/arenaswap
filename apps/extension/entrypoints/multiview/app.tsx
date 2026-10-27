import { i18n } from '#i18n';
import type { CSSProperties } from 'react';
import type { ExtensionMessage, MultiviewLineup } from '@arenaswap/core/types';
import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import MultiviewBackdrop from './multiviewBackdrop';
import MultiviewBox from './multiviewBox';
import { multiviewGridFor, placeBoxes } from './multiviewLayout';
import useBoxFrames from './useBoxFrames';

const App = () => {
	const [tabId, setTabId] = useState<number | null>(null);
	// Undefined while asking. Null means the background did not open this tab, as when the browser
	// brings an old one back on restart.
	const [lineup, setLineup] = useState<MultiviewLineup | null | undefined>(undefined);
	const { readyIds, setAudible } = useBoxFrames(tabId);

	useEffect(() => {
		const load = async () => {
			const tab = await browser.tabs.getCurrent();
			const reply = await browser.runtime.sendMessage({ type: 'GET_MULTIVIEW' } satisfies ExtensionMessage) as MultiviewLineup | null;
			setTabId(tab?.id ?? null);
			setLineup(reply ?? null);
		};
		load().catch(() => setLineup(null));
	}, []);

	useEffect(() => {
		if (tabId === null) return;
		const listener = (message: ExtensionMessage) => {
			if (message.type === 'MULTIVIEW_UPDATED' && message.tabId === tabId) setLineup(message);
		};
		browser.runtime.onMessage.addListener(listener);
		return () => browser.runtime.onMessage.removeListener(listener);
	}, [tabId]);

	const boxes = lineup?.boxes ?? [];
	const shownIds = boxes.map(box => box.gameId).filter(gameId => readyIds.has(gameId));
	const shownKey = shownIds.join(',');
	// The big box waits for its own stream. Until then the best game already playing stands in.
	const featuredId = lineup?.featuredGameId && shownIds.includes(lineup.featuredGameId) ? lineup.featuredGameId : shownIds[0] ?? null;

	useEffect(() => {
		if (tabId === null) return;
		const message: ExtensionMessage = { type: 'MULTIVIEW_READY', gameIds: shownKey ? shownKey.split(',') : [] };
		browser.runtime.sendMessage(message).catch(() => {});
	}, [tabId, shownKey]);

	useEffect(() => setAudible(featuredId), [featuredId, setAudible]);

	const gamesById = useMemo(() => new Map((lineup?.games ?? []).map(game => [game.id, game])), [lineup]);

	if (lineup === undefined) return null;
	if (lineup === null) {
		return (
			<main className='multiview'>
				<MultiviewBackdrop showMark />
				<p className='multiview-empty'>{i18n.t('multiview.empty')}</p>
			</main>
		);
	}

	const grid = multiviewGridFor(shownIds.length);
	const placements = placeBoxes(shownIds, featuredId);
	const stage = { column: `1 / span ${grid.span}`, row: `1 / span ${grid.span}` };

	return (
		<main className='multiview'>
			<MultiviewBackdrop showMark={shownIds.length === 0} />
			<div className='multiview-grid' style={{ '--multiview-columns': grid.columns, '--multiview-rows': grid.rows } as CSSProperties}>
				{boxes.map(box => (
					<MultiviewBox key={box.gameId} box={box} game={gamesById.get(box.gameId)} placement={placements.get(box.gameId)} stage={stage} />
				))}
			</div>
		</main>
	);
};

export default App;
