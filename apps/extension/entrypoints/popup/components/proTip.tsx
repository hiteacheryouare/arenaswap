import { useState } from 'react';

type proTipContext = 'main' | 'setup' | 'detail' | 'general';

interface proTipProps {
	context?: proTipContext;
	chance?: number;
}

const tipsByContext: Record<proTipContext, string[]> = {
	general: [
		'Toggle the switch in the top right to pause ArenaSwap without losing your settings.',
		'ArenaSwap works best with two or more game tabs open at once.',
		'Click any game card to dive into its PowerScore breakdown.',
		'Mixing sports? Enable extra leagues in Settings to swap across all of them at once.',
		'Giraffes and hedgehogs are cool. So is watching every game at once.',
	],
	main: [
		'Star your favorite teams to pin their games to the top of the list.',
		'Assign a tab from the dropdown beside each game so ArenaSwap knows where to swap.',
		'A higher PowerScore wins the swap; keep an eye on the colored badges.',
		'Turn on “Show upcoming games” in Settings to pre-assign tabs before the game starts.',
		'No live games yet? Demo Mode in Settings lets you watch ArenaSwap work with fake games.',
	],
	setup: [
		'Lower the Cooldown to swap more aggressively during chaotic finishes.',
		'Bump the Favorite Team Bonus to make sure your team almost always wins the swap.',
		'Increase Switch Delay to give yourself a beat before the tab actually changes.',
		'Demo Mode runs simulated games, perfect for tuning sliders without waiting for live action.',
		'Sensitivity controls how big a PowerScore lead is needed before ArenaSwap swaps.',
	],
	detail: [
		'PowerScore mixes closeness, late-game pressure, momentum, lead changes, and comebacks.',
		'A clock-stall penalty kicks in when the game clock barely moves between updates.',
		'0-0 games take a small PowerScore hit in sports where 0-0 isn\'t exciting.',
		'Hover the charts to inspect specific moments in the game.',
		'A favorite team in the matchup adds bonus points to the PowerScore.',
	],
};

const pickTip = (context: proTipContext): string | null => {
	const pool = [...tipsByContext.general, ...tipsByContext[context]];
	if (pool.length === 0) return null;
	return pool[Math.floor(Math.random() * pool.length)];
};

const proTip = ({ context = 'general', chance = 0.2 }: proTipProps) => {
	const [tip] = useState<string | null>(() => (Math.random() < chance ? pickTip(context) : null));
	if (!tip) return null;
	return (
		<div className="pb-2">
			<div
				className='alert alert-info d-flex align-items-start gap-2 py-2 px-3 mt-2 mb-0 lh-sm dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800'
				role='alert'
			>
				<i className='bi bi-lightbulb-fill shrink-0 mt-1' />
				<div>
					<span className='fw-bold'>Pro tip:</span> {tip}
				</div>
			</div>
		</div>
	);
};

export default proTip;
