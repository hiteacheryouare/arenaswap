import { useEffect, useRef, useState } from 'react';

const signals = [
	{
		name: 'Closeness',
		desc: 'How tight is the margin? A tied game scores maximum points. The wider the gap, the lower the score.',
		max: 30,
		color: '#22c55e',
	},
	{
		name: 'Late-Game Pressure',
		desc: 'Excitement compounds as the clock winds down. Exponential boost in the final minutes — overtime maxes the scale.',
		max: 30,
		color: '#F75C03',
	},
	{
		name: 'Momentum',
		desc: 'Unanswered scoring runs shift the energy of a game. An 8-2 run in basketball or a 3-goal stretch in hockey drives this score up.',
		max: 20,
		color: '#2274A5',
	},
	{
		name: 'Lead Changes',
		desc: 'Back-and-forth games are more exciting than one-sided affairs. Multiple lead changes in recent history push this score to its ceiling.',
		max: 12,
		color: '#F1C40F',
	},
	{
		name: 'Comeback',
		desc: 'Is the trailing team clawing back? A big deficit being erased is one of the most thrilling narratives in sports.',
		max: 8,
		color: '#D90368',
	},
];

const exampleValues = [28, 26, 14, 10, 6];

const PowerScore = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [animated, setAnimated] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setAnimated(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.3 }
		);
		if (ref.current) observer.observe(ref.current);
		return () => observer.disconnect();
	}, []);

	const total = exampleValues.reduce((a, b) => a + b, 0);

	return (
		<div ref={ref}>
			<div style={{ marginBottom: '2rem' }}>
				<div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
					<span style={{
						fontFamily: "'Lekton', monospace",
						fontSize: '3.5rem',
						fontWeight: 700,
						color: '#F75C03',
						letterSpacing: '-0.03em',
						lineHeight: 1,
					}}>
						{total}
					</span>
					<span style={{ color: 'var(--color-muted)', fontSize: '1rem' }}>/ 100</span>
				</div>
				<p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
					Example: tied NBA game with 2 minutes left, active momentum
				</p>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
				{signals.map((signal, i) => {
					const pct = animated ? (exampleValues[i] / signal.max) * 100 : 0;
					return (
						<div key={signal.name} style={{ transitionDelay: `${i * 0.12}s` }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
								<div>
									<span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
										{signal.name}
									</span>
									<span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
										(max {signal.max} pts)
									</span>
								</div>
								<span style={{
									fontFamily: "'Lekton', monospace",
									fontWeight: 700,
									fontSize: '0.9rem',
									color: signal.color,
								}}>
									{exampleValues[i]}
								</span>
							</div>
							<div className='ps-bar-track'>
								<div
									className='ps-bar-fill'
									style={{
										background: signal.color,
										width: `${pct}%`,
										transition: animated
											? `width 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s`
											: 'none',
									}}
								/>
							</div>
							<p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.4rem', lineHeight: 1.55, marginBottom: 0 }}>
								{signal.desc}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default PowerScore;
