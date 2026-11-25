import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Team } from '@arenaswap/core/types';
import {
	revealNameFit,
	revealNameInsetPx,
	revealNameJoinedRatio,
	revealNameLift,
	revealNameLineHeight,
	revealNameLines,
} from '../../cardReveal';

interface namingFit {
	lines: string[];
	sizes: number[];
}

const settled = (held: namingFit | null, next: namingFit) => (
	held !== null
		&& held.lines.length === next.lines.length
		&& held.lines.every((line, index) => line === next.lines[index])
		&& held.sizes.every((size, index) => Math.abs(size - (next.sizes[index] ?? 0)) < 0.05)
);

interface revealNameProps {
	team: Team;
	className: string;
	inset?: number;
}

const RevealName = ({ team, className, inset = revealNameInsetPx }: revealNameProps) => {
	const boxRef = useRef<HTMLSpanElement | null>(null);
	const lines = useMemo(() => revealNameLines(team.name, team.nickname), [team.name, team.nickname]);
	const ratios = useRef<number[] | null>(null);
	const [drawn, setDrawn] = useState<namingFit | null>(null);

	const fit = useCallback(() => {
		const box = boxRef.current;
		if (!box) return;
		if (!ratios.current) {
			const measured = [...box.querySelectorAll<HTMLElement>('.game-card-reveal-opening-name-line')]
				.map(line => {
					const size = parseFloat(getComputedStyle(line).fontSize);
					return size > 0 ? line.offsetWidth / size : 0;
				});
			if (measured.length !== lines.length || measured.some(ratio => !(ratio > 0))) return;
			ratios.current = measured;
		}
		const stacked = revealNameFit(ratios.current, box.offsetWidth, box.offsetHeight, inset);
		const joined = ratios.current.length > 1
			? revealNameFit([revealNameJoinedRatio(ratios.current)], box.offsetWidth, box.offsetHeight, inset)
			: null;
		const next = joined && Math.max(...joined) > Math.max(...stacked)
			? { lines: [lines.join(' ')], sizes: joined }
			: { lines, sizes: stacked };
		setDrawn(held => (settled(held, next) ? held : next));
	}, [lines, inset]);

	useLayoutEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		fit();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(fit);
		observer.observe(box);
		return () => observer.disconnect();
	}, [fit]);

	return (
		<span
			ref={boxRef}
			className={className}
			style={{
				'--reveal-name-leading': revealNameLineHeight,
				'--reveal-name-lift': `${revealNameLift(drawn?.sizes ?? [])}px`,
			} as CSSProperties}
		>
			<span className='game-card-reveal-opening-name-type'>
				{(drawn?.lines ?? lines).map((line, index) => (
					<span
						key={`${line}-${index}`}
						className='game-card-reveal-opening-name-line'
						style={drawn?.sizes[index] ? { '--reveal-name-size': `${drawn.sizes[index]}px` } as CSSProperties : undefined}
					>
						{line}
					</span>
				))}
			</span>
		</span>
	);
};

export default RevealName;
