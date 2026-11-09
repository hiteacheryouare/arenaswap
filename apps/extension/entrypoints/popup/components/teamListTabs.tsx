import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { i18n } from '#i18n';
import type { teamList } from './teamPickerRow';

interface teamListTabsProps {
	list: teamList;
	panelId: string;
	onChange: (list: teamList) => void;
}

const lists: readonly teamList[] = ['favorites', 'rivals'];

const labelFor = (list: teamList): string => (list === 'favorites' ? i18n.t('teamPicker.favoritesTab') : i18n.t('teamPicker.rivalsTab'));

export const teamListTabId = (list: teamList): string => `teamListTab-${list}`;

// The detail screen's strip and travelling underline. Both tabs show the same picker, so the
// open one is React state rather than Bootstrap's tab plugin, which wants a pane per tab.
const teamListTabs = ({ list, panelId, onChange }: teamListTabsProps) => {
	const listRef = useRef<HTMLUListElement>(null);

	useLayoutEffect(() => {
		const strip = listRef.current!;
		const place = () => {
			const tab = strip.querySelector<HTMLElement>('.nav-link.active');
			if (!tab) return;
			const stripBox = strip.getBoundingClientRect();
			const tabBox = tab.getBoundingClientRect();
			strip.style.setProperty('--gd-tab-x', `${tabBox.left - stripBox.left}px`);
			strip.style.setProperty('--gd-tab-width', `${tabBox.width}px`);
		};
		place();
		const observer = new ResizeObserver(place);
		observer.observe(strip);
		const ready = requestAnimationFrame(() => {
			strip.dataset.underline = 'ready';
		});
		return () => {
			observer.disconnect();
			cancelAnimationFrame(ready);
		};
	}, [list]);

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
		const jump = { Home: lists[0], End: lists[lists.length - 1] }[event.key];
		if (step === undefined && jump === undefined) return;
		event.preventDefault();
		const next = jump ?? lists[(lists.indexOf(list) + step! + lists.length) % lists.length]!;
		onChange(next);
		document.getElementById(teamListTabId(next))?.focus();
	};

	return (
		<ul className='nav nav-underline gd-tabs team-list-tabs mb-3' role='tablist' ref={listRef}>
			{lists.map(each => (
				<li className='nav-item' role='presentation' key={each}>
					<button
						type='button'
						role='tab'
						id={teamListTabId(each)}
						className={`nav-link${each === list ? ' active' : ''}`}
						aria-selected={each === list}
						aria-controls={panelId}
						tabIndex={each === list ? 0 : -1}
						onClick={() => onChange(each)}
						onKeyDown={onKeyDown}
					>
						{labelFor(each)}
					</button>
				</li>
			))}
		</ul>
	);
};

export default teamListTabs;
