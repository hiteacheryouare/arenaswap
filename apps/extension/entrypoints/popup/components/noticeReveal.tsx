import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionDuration } from '@arenaswap/ui/src/motion';

interface noticeRevealProps {
	show: boolean;
	animate: boolean;
	children: ReactNode;
}

const noticeReveal = ({ show, animate, children }: noticeRevealProps) => {
	const [present, setPresent] = useState(show);
	const [entering, setEntering] = useState(false);
	const shownChildren = useRef(children);
	if (show) shownChildren.current = children;

	if (show && !present) {
		setPresent(true);
		setEntering(animate);
	}
	if (!show && present && !animate) setPresent(false);

	useEffect(() => {
		if (show || !present) return;
		const timer = setTimeout(() => setPresent(false), motionDuration.base);
		return () => clearTimeout(timer);
	}, [show, present]);

	if (!present) return null;
	const state = show ? (entering ? ' is-entering' : '') : ' is-leaving';
	return (
		<div className={`notice-reveal${state}`} inert={!show}>
			<div className='notice-reveal-body'>{shownChildren.current}</div>
		</div>
	);
};

export default noticeReveal;
