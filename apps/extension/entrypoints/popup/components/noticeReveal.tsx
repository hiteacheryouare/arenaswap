import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionDuration } from '@arenaswap/ui/src/motion';

interface noticeRevealProps {
	show: boolean;
	// Off while the list itself is first appearing, so a notice that lands with it does not push
	// the cards down a beat after they were drawn.
	animate: boolean;
	children: ReactNode;
}

const noticeReveal = ({ show, animate, children }: noticeRevealProps) => {
	const [present, setPresent] = useState(show);
	const [entering, setEntering] = useState(false);
	// Whatever made the notice go away has usually emptied the data it was drawn from, so the
	// last version that was shown is what folds away.
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
