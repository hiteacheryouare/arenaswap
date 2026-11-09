import { useLayoutEffect, useRef, type CSSProperties } from 'react';

export interface revealRoll {
	text: string;
	height: number;
	look: CSSProperties;
}

const rolledSelector = '.game-card .game-score-value, .game-card .game-card-ps-score';

export const measureRolls = (wrapper: HTMLElement): revealRoll[] => (
	[...wrapper.querySelectorAll<HTMLElement>(rolledSelector)].map(node => {
		const style = getComputedStyle(node);
		return {
			text: node.textContent?.trim() ?? '',
			height: node.getBoundingClientRect().height,
			look: {
				justifyContent: style.justifyContent,
				fontFamily: style.fontFamily,
				fontSize: style.fontSize,
				fontWeight: style.fontWeight,
				fontFeatureSettings: style.fontFeatureSettings,
				fontVariantNumeric: style.fontVariantNumeric,
				letterSpacing: style.letterSpacing,
				color: style.color,
				textShadow: style.textShadow,
			},
		};
	})
);

const rollStartMs = 240;
const rollRowStepMs = 70;
const rollColumnStepMs = 50;
const rollStepCap = 3;

const RevealScoreRoll = ({ rolls }: { rolls: revealRoll[] }) => {
	const layerRef = useRef<HTMLDivElement | null>(null);

	// Pinned to the real numbers every frame rather than once: the score font can swap in, or a push
	// can change a score, after the first frame, and the real number re-centres while the copy would not.
	useLayoutEffect(() => {
		const layer = layerRef.current;
		const wrapper = layer?.closest('.game-card-reveal');
		if (!layer || !wrapper) return;
		let frame = 0;
		const follow = () => {
			const box = layer.getBoundingClientRect();
			const targets = wrapper.querySelectorAll<HTMLElement>(rolledSelector);
			[...layer.children].forEach((roll, index) => {
				const rect = targets[index]?.getBoundingClientRect();
				if (!rect || !(roll instanceof HTMLElement)) return;
				roll.style.left = `${rect.left - box.left}px`;
				roll.style.width = `${rect.width}px`;
				roll.style.top = `${rect.top - box.top}px`;
			});
			frame = requestAnimationFrame(follow);
		};
		follow();
		return () => cancelAnimationFrame(frame);
	}, []);

	return (
		<div ref={layerRef} className='game-card-reveal-rolls'>
			{rolls.map((roll, row) => {
				const chars = [...roll.text];
				const number = /\d+/.exec(roll.text);
				const first = number?.index ?? -1;
				const last = first + (number?.[0].length ?? 0) - 1;
				return (
					<span
						key={row}
						className='game-card-reveal-roll'
						style={{ ...roll.look, '--reveal-roll-line': `${roll.height}px` } as CSSProperties}
					>
						{chars.map((char, position) => {
							if (position < first || position > last) return <span key={position}>{char}</span>;
							const column = position - first;
							// The ones column spins a full turn first, so a low score still reads as a roll.
							const sequence = [...(position === last ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : []), ...Array.from({ length: Number(char) + 1 }, (_, n) => n)];
							const delay = rollStartMs + Math.min(row, rollStepCap) * rollRowStepMs + Math.min(column, rollStepCap) * rollColumnStepMs;
							return (
								<span key={position} className='game-card-reveal-roll-column'>
									<span className='game-card-reveal-roll-size'>{char}</span>
									<span
										className='game-card-reveal-roll-strip'
										style={{ '--reveal-roll-steps': sequence.length - 1, '--reveal-roll-at': `${delay}ms` } as CSSProperties}
									>
										{sequence.map((value, index) => <span key={index}>{value}</span>)}
									</span>
								</span>
							);
						})}
					</span>
				);
			})}
		</div>
	);
};

export default RevealScoreRoll;
