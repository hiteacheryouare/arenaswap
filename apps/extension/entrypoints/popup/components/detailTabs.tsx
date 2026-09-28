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

// Bootstrap's own tab plugin owns the active classes, the roving tabindex, `aria-selected` and the
// arrow keys. Its keydown handler is bound per instance and its auto-init runs on `window.load`,
// long before a popup mounts, so every button is instantiated here.
//
// The active classes are rendered once, off position, and never recomputed: React diffs against its
// last render rather than the live DOM, which is what lets Bootstrap own them from then on.
const detailTabs = ({ tabs, tabId, paneId }: detailTabsProps) => {
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-bs-toggle="tab"]');
		for (const button of buttons ?? []) Tab.getOrCreateInstance(button);
	}, [tabs.length]);

	return (
		<ul className='nav nav-underline dt-tabs' role='tablist' ref={listRef}>
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
