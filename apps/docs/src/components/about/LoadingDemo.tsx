import { useState } from 'react';
import LoadingMessage from '@arenaswap/ui/src/components/loadingMessage';

interface LoadingDemoProps {
	lines: string[];
	label: string;
	another: string;
}

const LoadingDemo = ({ lines, label, another }: LoadingDemoProps) => {
	const [line, setLine] = useState(() => Math.floor(Math.random() * lines.length));

	const deal = () => setLine(current => (current + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length);

	return (
		<button type='button' className='popup-container doc-demo-popup-frame about-loading-frame' onClick={deal}>
			<LoadingMessage key={line} message={lines[line]!} label={label} />
			<span className='visually-hidden'>{another}</span>
		</button>
	);
};

export default LoadingDemo;
