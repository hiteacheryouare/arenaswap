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
import useBoxQueue from './useBoxQueue';
import usePageShown from './usePageShown';

const closeTab = async () => {
	const tab = await browser.tabs.getCurrent();
	if (tab?.id !== undefined) await browser.tabs.remove(tab.id);
};

const App = () => {
	const [tabId, setTabId] = useState<number | null>(null);
	// Undefined while asking. Null means the background did not open this tab, as when the browser
	// brings an old one back on restart.
	const [lineup, setLineup] = useState<MultiviewLineup | null | undefined>(undefined);
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

	const boxes = useMemo(() => lineup?.boxes ?? [], [lineup]);
	const boxIds = boxes.map(box => box.gameId);
	const { readyIds, onAirIds, hrefs, setAudible } = useBoxFrames(tabId, boxIds);
	const startedIds = useBoxQueue(boxes, readyIds);
	const pageShown = usePageShown();
	const isStray = (gameId: string) => {
		const href = hrefs.get(gameId);
		return boxes.some(other => other.gameId !== gameId && other.url === href);
	};
	const readyKey = boxIds.filter(gameId => readyIds.has(gameId)).join(',');
	const featuredId = lineup?.featuredGameId && boxIds.includes(lineup.featuredGameId) ? lineup.featuredGameId : boxIds[0] ?? null;
	const visibleIds = lineup?.solo && featuredId !== null ? [featuredId] : boxIds;

	useEffect(() => {
		if (tabId === null) return;
		const message: ExtensionMessage = { type: 'MULTIVIEW_READY', gameIds: readyKey ? readyKey.split(',') : [] };
		browser.runtime.sendMessage(message).catch(() => {});
	}, [tabId, readyKey]);

	useEffect(() => setAudible(featuredId), [featuredId, setAudible]);

	const placements = placeBoxes(visibleIds, featuredId);
	useBoxMoves(gridRef, [...placements].map(([gameId, where]) => `${gameId} ${where.column} ${where.row}`).join(','));

	const gamesById = useMemo(() => new Map((lineup?.games ?? []).map(game => [game.id, game])), [lineup]);

	if (lineup === undefined) return null;
	if (lineup === null) {
		return (
			<main className='multiview multiview-closed flex-column text-center'>
				<img className='multiview-closed-mark' src='/images/full_logo_white_on_transparent.svg' alt='ArenaSwap' />
				<h1 className='multiview-closed-title'>{i18n.t('multiview.closedTitle')}</h1>
				<p className='multiview-empty'>{i18n.t('multiview.empty')}</p>
				<button type='button' className='btn btn-solid theme-primary' onClick={() => void closeTab()}>{i18n.t('multiview.closeTab')}</button>
			</main>
		);
	}

	const grid = multiviewGridFor(visibleIds.length);
	const soloPlacement = { column: '1', row: '1' };

	return (
		<main className='multiview'>
			<MultiviewBackdrop grid={gridRef} />
			<div ref={gridRef} className='multiview-grid' style={{ '--multiview-columns': grid.columns, '--multiview-rows': grid.rows } as CSSProperties}>
				{boxes.map(box => {
					const placement = placements.get(box.gameId);
					return <MultiviewBox key={box.gameId} box={box} game={gamesById.get(box.gameId)} placement={placement ?? soloPlacement} hidden={!placement} onAir={onAirIds.has(box.gameId)} played={readyIds.has(box.gameId)} audible={box.gameId === featuredId} started={startedIds.has(box.gameId)} stray={isStray(box.gameId)} pageShown={pageShown} />;
				})}
			</div>
		</main>
	);
};

export default App;
