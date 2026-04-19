import { useState } from 'react';

const items = [
	{
		q: 'What leagues does ArenaSwap support?',
		a: 'Currently: NBA, WNBA, NFL, NHL, PWHL, MLB, MLS, NCAAB, NCAAF, and NCAAMH — ten leagues across basketball, football, hockey, baseball, and soccer. You can toggle each league on or off in settings.',
	},
	{
		q: 'Do I need an account or subscription?',
		a: 'No. ArenaSwap is completely free, requires no account, and collects no personal data. Everything runs locally in your browser. Scores come directly from ESPN\'s public API.',
	},
	{
		q: 'Will it work with my streaming service?',
		a: 'Yes — as long as your stream runs in a browser tab, ArenaSwap can switch to it. This includes ESPN+, Peacock, Paramount+, YouTube TV, Hulu, and any other browser-based stream.',
	},
	{
		q: 'How often does ArenaSwap update?',
		a: 'Live game data is polled every 15 seconds. When no games are live, the extension shifts into a low-power dormant mode and checks less frequently to save resources.',
	},
	{
		q: 'How does the PowerScore algorithm work?',
		a: 'PowerScore is a 100-point scale combining five signals: Closeness (30 pts), Late-Game Pressure (30 pts), Momentum (20 pts), Lead Changes (12 pts), and Comeback Factor (8 pts). Games with frozen clocks (halftime, timeouts) receive a penalty to avoid switching during stoppages.',
	},
	{
		q: 'Can I stop ArenaSwap from switching during a specific game?',
		a: 'Yes. You can unassign a tab from a game at any time using the dropdown in the popup, which removes it from automatic switching. You can also adjust the sensitivity to reduce how often switches happen.',
	},
	{
		q: 'Does it mute other tabs?',
		a: 'Yes. When ArenaSwap switches to a game, it unmutes that tab and mutes all other assigned tabs — so you always hear the right broadcast.',
	},
	{
		q: 'Is the source code available?',
		a: 'Yes, ArenaSwap is open source. You can find the full codebase on GitHub, including the PowerScore algorithm package.',
	},
];

const FAQ = () => {
	const [open, setOpen] = useState<number | null>(null);

	const toggle = (i: number) => setOpen(prev => prev === i ? null : i);

	return (
		<div className='accordion' id='faq-accordion'>
			{items.map((item, i) => (
				<div
					key={i}
					className='accordion-item'
					style={{ borderRadius: i === 0 ? '0.75rem 0.75rem 0 0' : i === items.length - 1 ? '0 0 0.75rem 0.75rem' : '0' }}
				>
					<h3 className='accordion-header'>
						<button
							className={`accordion-button${open === i ? '' : ' collapsed'}`}
							type='button'
							onClick={() => toggle(i)}
							style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.01em' }}
						>
							{item.q}
						</button>
					</h3>
					<div style={{ display: open === i ? 'block' : 'none' }}>
						<div className='accordion-body' style={{ fontSize: '0.9rem', color: 'var(--color-muted)', lineHeight: 1.65 }}>
							{item.a}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default FAQ;
