import { useState } from 'react';

const items = [
	{
		q: 'What leagues does ArenaSwap support?',
		a: 'Currently: NBA, WNBA, NCAAB, NCAAW, NFL, NCAAF, NHL, NCAAMH, MLB, MLS, EPL, and FIFA World Cup — twelve leagues across basketball, football, hockey, baseball, and soccer. You can toggle each league on or off in settings.',
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
		a: 'PowerScore is a 100-point scale combining five signals: Closeness (28 pts), Late-Game Pressure (26 pts), Momentum (22 pts), Lead Changes (14 pts), and Comeback Factor (10 pts). The score builds with the game — an early close game scores low and tension ramps toward the final buzzer, with tied games getting an overtime boost in the final minute. Recent scoring spikes the live signals and then fades, so even low-scoring sports keep a moving graph. Games with frozen clocks (halftime, timeouts) receive a penalty to avoid switching during stoppages.',
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
					className={`accordion-item ${i === 0 ? 'rounded-t-xl' : i === items.length - 1 ? 'rounded-b-xl' : 'rounded-none'}`}
				>
					<h3 className='accordion-header'>
						<button
							className={`accordion-button text-[0.95rem] fw-semibold tracking-[-0.01em]${open === i ? '' : ' collapsed'}`}
							type='button'
							onClick={() => toggle(i)}
						>
							{item.q}
						</button>
					</h3>
					<div className={open === i ? 'd-block' : 'd-none'}>
						<div className='accordion-body text-[0.9rem] leading-[1.65] text-[var(--color-muted)]'>
							{item.a}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default FAQ;
