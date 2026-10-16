import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Collapse } from 'bootstrap';
import { isSectionCollapsed, rememberSectionCollapsed, type breakdownSectionId } from '../../../utils/breakdownFolds';

interface breakdownSectionProps {
	id: breakdownSectionId;
	heading: string;
	// Stays visible while the rows are folded away.
	total: ReactNode;
	children: ReactNode;
}

// Bootstrap's collapse plugin owns the open state, the way detailTabs leaves its tabs to the tab
// plugin: the classes and aria-expanded are rendered once from the stored fold and never recomputed,
// so a re-render on the next poll leaves whatever the plugin has set alone.
const BreakdownSection = ({ id, heading, total, children }: breakdownSectionProps) => {
	const [startsCollapsed] = useState(() => isSectionCollapsed(id));
	const bodyId = `powerscore-section-${useId().replace(/[^\w-]/g, '')}`;
	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const body = bodyRef.current!;
		const onShow = () => rememberSectionCollapsed(id, false);
		const onHide = () => rememberSectionCollapsed(id, true);
		body.addEventListener('show.bs.collapse', onShow);
		body.addEventListener('hide.bs.collapse', onHide);
		return () => {
			body.removeEventListener('show.bs.collapse', onShow);
			body.removeEventListener('hide.bs.collapse', onHide);
			const instance = Collapse.getInstance(body);
			if (!body.classList.contains('collapsing')) {
				instance?.dispose();
				return;
			}
			// The plugin still finishes a fold on a detached element, so leaving the game mid-fold
			// has to wait for it: disposing now nulls the element its own timer is about to touch.
			const disposeAfter = () => instance?.dispose();
			body.addEventListener('shown.bs.collapse', disposeAfter, { once: true });
			body.addEventListener('hidden.bs.collapse', disposeAfter, { once: true });
		};
	}, [id]);

	return (
		<>
			<button
				type='button'
				className={`powerscore-breakdown-section-heading${startsCollapsed ? ' collapsed' : ''}`}
				data-bs-toggle='collapse'
				data-bs-target={`#${bodyId}`}
				aria-controls={bodyId}
				aria-expanded={!startsCollapsed}
			>
				{heading}
				<i className='bi bi-chevron-down powerscore-section-chevron' aria-hidden='true' />
			</button>
			<div ref={bodyRef} id={bodyId} className={`powerscore-breakdown-section-body collapse${startsCollapsed ? '' : ' show'}`}>
				{children}
			</div>
			{total}
		</>
	);
};

export default BreakdownSection;
