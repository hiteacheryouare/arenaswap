import { useState } from 'react';

// Done in JSX rather than by DOM mutation so React keeps ownership of these nodes.
const withDots = (text: string) =>
	text.split('.').flatMap((part, i, parts) =>
		i < parts.length - 1
			? [part, <span key={i} className='as-dot'>.</span>]
			: [part],
	);

const items = [
	{
		q: 'What leagues does ArenaSwap support?',
		a: '30+ leagues across six sports: NBA, NFL, NHL, MLB, MLS, EPL, Champions League, La Liga, Bundesliga, Serie A, Liga MX, NCAAB, NCAAW, NCAAF, NCAA Hockey, WNBA, NWSL, NCAA Baseball, NCAA Softball, World Baseball Classic, FIFA World Cup, FIFA Women\'s World Cup, UFL, Europa League, and all relevant Olympic competitions.',
	},
	{
		q: 'How does tab switching work?',
		a: 'ArenaSwap continuously scores every live game using PowerScore: a composite rating based on closeness, late-game pressure, momentum, lead changes, and comeback factor. When a game\'s PowerScore pulls meaningfully ahead of what you\'re watching, ArenaSwap switches your tab to it. The gap required is adjustable via sensitivity settings.',
	},
	{
		q: 'Do I need an account or subscription?',
		a: 'No. ArenaSwap is completely free, requires no account, and collects no personal data. Everything runs locally in your browser. Live scores come directly from ESPN\'s public API.',
	},
	{
		q: 'Will it work with my streaming service?',
		a: 'Yes. Any stream that runs in a browser tab works. This includes ESPN+, Peacock, Paramount+, YouTube TV, Hulu Live, fuboTV, and anything else browser-based.',
	},
	{
		q: 'How does the PowerScore algorithm work?',
		a: 'PowerScore is a 0–100 scale combining five signals: Closeness, Late-Game Pressure, Momentum, Lead Changes, and Comeback Factor. Tension ramps toward the final buzzer, tied games get an overtime boost, and recent scoring spikes the score then fades. This means even low-scoring sports keep a moving graph. Games during stoppages (halftime, timeouts) receive a small penalty to avoid switching at the wrong moment.',
	},
	{
		q: 'Can I keep a specific game from being switched away?',
		a: 'Yes. You can unassign any tab from a game at any time. The extension immediately stops switching away from it. You can also lower the sensitivity setting to make switches less frequent overall.',
	},
	{
		q: 'Does it mute other tabs?',
		a: 'Yes. When ArenaSwap switches to a game, it unmutes that tab and mutes all other assigned tabs so you always hear the right broadcast.',
	},
	{
		q: 'Is the source code available?',
		a: 'Yes. ArenaSwap is open source. The full codebase, including the PowerScore algorithm package, is on GitHub.',
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
							{withDots(item.q)}
						</button>
					</h3>
					<div className={open === i ? 'd-block' : 'd-none'}>
						<div className='accordion-body text-[0.9rem] leading-[1.65] text-[var(--color-muted)]'>
							{withDots(item.a)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default FAQ;
