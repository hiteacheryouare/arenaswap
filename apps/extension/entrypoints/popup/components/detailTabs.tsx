import { useEffect, useRef } from 'react';
import { Tab } from 'bootstrap';

export type DetailTabId = 'overview' | 'box' | 'standings';

export interface DetailTab {
	id: DetailTabId;
	label: string;
}

interface detailTabsProps {
	tabs: readonly DetailTab[];
	tabId: (id: DetailTabId) => string;
	paneId: (id: DetailTabId) => string;
}

// Bootstrap's own tab plugin, not a reimplementation of it. It owns the active classes, the
// roving tabindex, `aria-selected`, and the arrow/Home/End keys, so none of that is written here.
//
// Two things the declarative markup does not cover on its own. Importing `Tab` registers the
// click data-api at module scope, but the keydown handler is bound per instance in the
// constructor, and the plugin's own auto-init runs on `window.load` — long fired by the time a
// popup mounts. So every button is instantiated below.
//
// The active classes are rendered once, off the tab's position, and never recomputed. React
// diffs against its previous render rather than the live DOM, so a `className` whose value does
// not change between renders is left alone — which is what lets Bootstrap own it from there.
//
// `.nav-underline` rather than `.nav-tabs`, which the popup already skins for the light
// `.gd-setup` card the box score's switcher sits on: a lifted #f8fafc tab would be a white slab
// on this dark shell.
const detailTabs = ({ tabs, tabId, paneId }: detailTabsProps) => {
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-bs-toggle="tab"]');
		for (const button of buttons ?? []) Tab.getOrCreateInstance(button);
	}, [tabs.length]);

	return (
		<ul className='nav nav-underline gd-tabs' role='tablist' ref={listRef}>
			{tabs.map((tab, index) => (
				<li className='nav-item' role='presentation' key={tab.id}>
					<button
						type='button'
						role='tab'
						id={tabId(tab.id)}
						className={`nav-link${index === 0 ? ' active' : ''}`}
						data-bs-toggle='tab'
						data-bs-target={`#${paneId(tab.id)}`}
						aria-controls={paneId(tab.id)}
						aria-selected={index === 0}
					>
						{tab.label}
					</button>
				</li>
			))}
		</ul>
	);
};

export default detailTabs;
