import { Tooltip } from 'bootstrap';
import { useEffect, useRef } from 'react';

interface signalTooltipIconProps {
	text: string;
}

const SignalTooltipIcon = ({ text }: signalTooltipIconProps) => {
	const btnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!btnRef.current) return;
		const tooltip = new Tooltip(btnRef.current, {
			title: text,
			placement: 'auto',
			trigger: 'hover focus',
			container: 'body',
		});
		return () => tooltip.dispose();
	}, [text]);

	return (
		<button
			ref={btnRef}
			type='button'
			className='signal-tooltip-btn'
			aria-label={text}
		>
			<i className='bi bi-question-circle' />
		</button>
	);
};

export default SignalTooltipIcon;
