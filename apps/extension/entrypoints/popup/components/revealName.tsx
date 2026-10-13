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
} from '../cardReveal';

// A club named in full and fitted to whatever box it is drawn in: the naming scene's bands, and the
// slot a crest would have taken for a club we were sent no crest for.
//
// The tricodes' own family, weight and tracking, but filled solid rather than outlined — which is
// one copy of the glyph instead of the tricode's two. The outline is the tricode's treatment and it
// stays the tricode's: this carries the words you have to read, and a hollow letterform at the size
// these are set at is a shape before it is a letter.
//
// Both lines are justified to one block width — "MIAMI" drawn larger than "MARLINS" so that the two
// span the same width — which is what makes this read as a lockup rather than as a caption. The
// sizes come out of `revealNameFit`, off each line's own measured advance: the type is as big as its
// box will take.
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
	// The lines' own advances in ems, which is the one thing here that has to come off the DOM and the
	// one thing that never changes once it has: an em is an em at any size. Kept so that a re-fit on a
	// card that reflowed is arithmetic rather than another measurement — and so that it survives the
	// name being drawn on one line, which leaves nothing in the DOM to measure two of.
	const ratios = useRef<number[] | null>(null);
	const [drawn, setDrawn] = useState<namingFit | null>(null);

	// `offsetWidth` rather than a client rect, because this box is transformed for the whole of its
	// exit and a rect would be read through that scale.
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
		// Both ways of setting it, and the bigger one wins. A club whose name is short enough that two
		// lines are bound by the box's height is named across the whole of it on one line instead.
		const stacked = revealNameFit(ratios.current, box.offsetWidth, box.offsetHeight, inset);
		const joined = ratios.current.length > 1
			? revealNameFit([revealNameJoinedRatio(ratios.current)], box.offsetWidth, box.offsetHeight, inset)
			: null;
		const next = joined && Math.max(...joined) > Math.max(...stacked)
			? { lines: [lines.join(' ')], sizes: joined }
			: { lines, sizes: stacked };
		setDrawn(held => (settled(held, next) ? held : next));
	}, [lines, inset]);

	// A layout effect, so the sizes are on the type in the frame the animation starts on rather than
	// one frame later — and observed after that, because the card reflows underneath a running
	// graphic: a PowerScore arriving on a later push grows a bar row, which grows the box this type is
	// fitted to. It measures on mount and on resize and at no other time, which is why callers key
	// this on the club's name: a name that changed under a mounted instance would keep the last one's
	// sizes.
	useLayoutEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		fit();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(fit);
		observer.observe(box);
		return () => observer.disconnect();
	}, [fit]);

	// The leading is the stylesheet's and the fit's at once, and it cannot be written down twice: the
	// fit measures the stack as the sum of the line boxes, so a stylesheet that set its own would size
	// the type for a block of a different height than the one it then draws. The lift is the same
	// arithmetic's other half — how far up the block goes so that the ink rather than the boxes is
	// what sits centred in the box.
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
