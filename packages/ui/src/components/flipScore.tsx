import { useState, useEffect, useRef } from 'react';

interface flipScoreProps {
	value: number;
	className?: string;
}

interface flipState {
	current: number;
	outgoing: number | null;
	animKey: number;
}

const flipScore = ({ value, className = '' }: flipScoreProps) => {
	const prevRef = useRef(value);
	const [state, setState] = useState<flipState>({ current: value, outgoing: null, animKey: 0 });

	useEffect(() => {
		if (value !== prevRef.current) {
			const prev = prevRef.current;
			prevRef.current = value;
			setState(s => ({ current: value, outgoing: prev, animKey: s.animKey + 1 }));
			const timer = setTimeout(() => setState(s => ({ ...s, outgoing: null })), 350);
			return () => clearTimeout(timer);
		}
	}, [value]);

	return (
		<span className={`flip-score ${className}`}>
			{state.outgoing !== null && (
				<span key={`out-${state.animKey}`} className='flip-score-digit flip-score-digit-out' aria-hidden='true'>
					{state.outgoing}
				</span>
			)}
			<span key={`in-${state.animKey}`} className={`flip-score-digit${state.outgoing !== null ? ' flip-score-digit-in' : ''}`}>
				{state.current}
			</span>
		</span>
	);
};

export default flipScore;
