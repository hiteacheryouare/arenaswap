import { useState, type ReactNode } from 'react';
import { isSectionCollapsed, rememberSectionCollapsed, type breakdownSectionId } from '../../../utils/breakdownFolds';

interface breakdownSectionProps {
	id: breakdownSectionId;
	heading: string;
	total: ReactNode;
	children: ReactNode;
}

const BreakdownSection = ({ id, heading, total, children }: breakdownSectionProps) => {
	const [startsOpen] = useState(() => !isSectionCollapsed(id));

	return (
		<>
			<details
				className='powerscore-breakdown-section'
				open={startsOpen}
				onToggle={event => rememberSectionCollapsed(id, !event.currentTarget.open)}
			>
				<summary className='powerscore-breakdown-section-heading'>
					{heading}
					<i className='bi bi-chevron-down powerscore-section-chevron' aria-hidden='true' />
				</summary>
				<div className='powerscore-breakdown-section-body'>
					{children}
				</div>
			</details>
			{total}
		</>
	);
};

export default BreakdownSection;
