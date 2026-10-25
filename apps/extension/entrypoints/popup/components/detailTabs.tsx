import { i18n } from '#i18n';
import { useEffect, useLayoutEffect, useRef } from 'react';
import NavOverflow from 'bootstrap/js/dist/nav-overflow.js';
import Tab from 'bootstrap/js/dist/tab.js';

export type DetailTabId = 'overview' | 'matchup' | 'box' | 'standings';

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
// That leaves one gap: a tab that goes away while it is open, as Matchup does at kickoff. With
// nothing active, the strip hands the reader to the first tab rather than an empty screen.
//
// `.nav-underline` rather than `.nav-tabs`, which the popup already skins for the light
// `.gd-setup` card the box score's switcher sits on: a lifted #f8fafc tab would be a white slab
// on this dark shell.
//
// Bootstrap's nav overflow folds whatever a long translation pushes off the strip into a menu. Its
// copies of the tabs are turned into plain menu items, and the hidden originals are disabled,
// because the tab plugin would otherwise count both in its arrow-key order and land on tabs that
// cannot take focus.
const settleOverflow = (wrapper: HTMLElement) => {
	for (const item of wrapper.querySelectorAll<HTMLElement>('.gd-tabs > .nav-item')) {
		const tab = item.querySelector<HTMLButtonElement>('[data-bs-toggle="tab"]');
		if (tab) tab.disabled = item.dataset.bsNavOverflow === 'true';
	}
	for (const copy of wrapper.querySelectorAll('.nav-overflow-menu .menu-item')) {
		for (const name of ['role', 'data-bs-toggle', 'aria-selected', 'aria-controls', 'tabindex', 'disabled']) copy.removeAttribute(name);
		copy.classList.remove('disabled');
	}
};

const detailTabs = ({ tabs, tabId, paneId }: detailTabsProps) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const tabKey = tabs.map(tab => tab.id).join();

	// Before paint, so the strip never shows a tab it is about to fold away. Rebuilt whenever the
	// tabs change, since the component only counts the items it found when it was created.
	useLayoutEffect(() => {
		const wrapper = wrapperRef.current!;
		const list = listRef.current!;
		const overflow = NavOverflow.getOrCreateInstance(wrapper, { moreText: false });
		const toggle = wrapper.querySelector<HTMLButtonElement>('.nav-overflow-toggle');
		toggle?.setAttribute('aria-label', i18n.t('detail.moreTabs'));
		toggle?.closest('.nav-item')?.setAttribute('role', 'presentation');

		const settle = () => settleOverflow(wrapper);
		// Observers are called in the order they were made, so this runs after each of the
		// component's own passes.
		const observer = new ResizeObserver(settle);
		observer.observe(wrapper);

		const pick = (event: MouseEvent) => {
			const target = (event.target as Element).closest('.nav-overflow-menu .menu-item')?.getAttribute('data-bs-target');
			const tab = target ? list.querySelector<HTMLButtonElement>(`:scope > .nav-item > [data-bs-target="${target}"]`) : null;
			if (!tab) return;
			void Tab.getOrCreateInstance(tab).show();
			toggle?.focus();
		};
		// The menu's copies are taken when it folds, so a change of tab has to refresh them.
		const refresh = () => {
			overflow.update();
			settle();
		};
		wrapper.addEventListener('click', pick);
		wrapper.addEventListener('shown.bs.tab', refresh);
		settle();

		return () => {
			observer.disconnect();
			wrapper.removeEventListener('click', pick);
			wrapper.removeEventListener('shown.bs.tab', refresh);
			overflow.dispose();
		};
	}, [tabKey]);

	useEffect(() => {
		const buttons = [...listRef.current?.querySelectorAll<HTMLButtonElement>('[data-bs-toggle="tab"]') ?? []];
		for (const button of buttons) Tab.getOrCreateInstance(button);
		if (buttons.length > 0 && !buttons.some(button => button.classList.contains('active'))) Tab.getOrCreateInstance(buttons[0]!).show();
	}, [tabKey]);

	return (
		<div className='nav-overflow gd-tabs-overflow' ref={wrapperRef}>
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
		</div>
	);
};

export default detailTabs;
