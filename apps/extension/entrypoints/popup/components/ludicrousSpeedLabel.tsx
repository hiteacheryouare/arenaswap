import { useEffect, useState, type CSSProperties } from 'react';

const landingMs = 1200;

interface ludicrousSpeedLabelProps {
	text: string;
	// Only a drag onto the top level lands it; opening the popup already at Ludicrous Speed shouldn't.
	landing: boolean;
}

const ludicrousSpeedLabel = ({ text, landing }: ludicrousSpeedLabelProps) => {
	const [isLanding, setIsLanding] = useState(landing);

	useEffect(() => {
		if (!isLanding) return;
		const timer = setTimeout(() => setIsLanding(false), landingMs);
		return () => clearTimeout(timer);
	}, [isLanding]);

	if (!isLanding) return <span className={landing ? 'ludicrous-speed landed' : 'ludicrous-speed'}>{text}</span>;

	return (
		<span className='ludicrous-speed landing'>
			<span className='visually-hidden'>{text}</span>
			<span aria-hidden='true'>
				{[...text].map((letter, index) => (
					<span key={index} className='ludicrous-speed-letter' style={{ '--letter': index } as CSSProperties}>{letter}</span>
				))}
			</span>
		</span>
	);
};

export default ludicrousSpeedLabel;
