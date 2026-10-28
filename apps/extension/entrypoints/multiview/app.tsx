import { i18n } from '#i18n';
import type { CSSProperties } from 'react';
import type { ExtensionMessage, MultiviewLineup } from '@arenaswap/core/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import MultiviewBackdrop from './multiviewBackdrop';
import MultiviewBox from './multiviewBox';
import { multiviewGridFor, placeBoxes } from './multiviewLayout';
import useBoxFrames from './useBoxFrames';
import useBoxMoves from './useBoxMoves';

const App = () => {
	const [tabId, setTabId] = useState<number | null>(null);
	// Undefined while asking. Null means the background did not open this tab, as when the browser
	// brings an old one back on restart.
	const [lineup, setLineup] = useState<MultiviewLineup | null | undefined>(undefined);
	const { readyIds, onAirIds, setAudible } = useBoxFrames(tabId);
	const gridRef = useRef<HTMLDivElement>(null);

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
	const boxIds = boxes.map(box => box.gameId);
	const readyKey = boxIds.filter(gameId => readyIds.has(gameId)).join(',');
	const featuredId = lineup?.featuredGameId && boxIds.includes(lineup.featuredGameId) ? lineup.featuredGameId : boxIds[0] ?? null;

	useEffect(() => {
		if (tabId === null) return;
		const message: ExtensionMessage = { type: 'MULTIVIEW_READY', gameIds: readyKey ? readyKey.split(',') : [] };
		browser.runtime.sendMessage(message).catch(() => {});
	}, [tabId, readyKey]);

	useEffect(() => setAudible(featuredId), [featuredId, setAudible]);

	const placements = placeBoxes(boxIds, featuredId);
	useBoxMoves(gridRef, [...placements].map(([gameId, where]) => `${gameId} ${where.column} ${where.row}`).join(','));

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

	const grid = multiviewGridFor(boxIds.length);

	return (
		<main className='multiview'>
			<MultiviewBackdrop showMark={boxIds.length === 0} />
			<div ref={gridRef} className='multiview-grid' style={{ '--multiview-columns': grid.columns, '--multiview-rows': grid.rows } as CSSProperties}>
				{boxes.map(box => {
					const placement = placements.get(box.gameId);
					return placement && <MultiviewBox key={box.gameId} box={box} game={gamesById.get(box.gameId)} placement={placement} onAir={onAirIds.has(box.gameId)} played={readyIds.has(box.gameId)} audible={box.gameId === featuredId} />;
				})}
			</div>
		</main>
	);
};

export default App;
