import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Game, Team } from '@arenaswap/core/types';
import {
	revealNameFit,
	revealNameJoinedRatio,
	revealNameLift,
	revealNameLineHeight,
	revealNameLines,
} from '../cardReveal';

// The naming scene: the card splits horizontally, each club takes a band of its own colour the full
// width of the card, and the two of them are named in full across it — "Miami Marlins", "Washington
// Commanders", which is the one thing an in-stadium matchup graphic says out loud that this one never
// did. The poster after it carries tricodes, and a tricode is decoded rather than read.
//
// A horizontal split, in a graphic whose every other cut leans: that is the point of it. The scene
// before this has the two colours side by side on the leaning seam, and this one lays them one above
// the other — so a name gets the whole width of the card instead of half of it, and the poster then
// pivots the split back by wiping its own leaning halves over these. Which is a wipe you can see for
// the first time: the poster's away half growing over the bottom band and its home half over the top
// one are the two places in the graphic where colour arrives over colour that is not already its own.
//
// Bands and names are siblings rather than the name being a child of its band, and only for the
// exit: a band is clipped to its own half, and the name leaves by collapsing across the centre line
// towards the slot its tricode appears on.
const namingBands = (['away', 'home'] as const).map(side => (
	<span key={side} className={`game-card-reveal-opening-band is-${side}`} />
));

// The tricodes' own family, weight and tracking, but filled solid rather than outlined — which is
// one copy of the glyph instead of the tricode's two. The outline is the tricode's treatment and it
// stays the tricode's: this beat carries the words you have to read, and a hollow letterform at the
// size these are set at is a shape before it is a letter.
//
// Both lines are justified to one block width — "MIAMI" drawn larger than "MARLINS" so that the two
// span the same width — which is what makes this read as a lockup rather than as a caption. The
// sizes come out of `revealNameFit`, off each line's own measured advance: the type is as big as its
// band will take, so most clubs are named across the whole card.
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

const OpeningName = ({ side, team }: { side: 'away' | 'home'; team: Team }) => {
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
		// lines are bound by the band's height is named across the whole card on one line instead.
		const stacked = revealNameFit(ratios.current, box.offsetWidth, box.offsetHeight);
		const joined = ratios.current.length > 1
			? revealNameFit([revealNameJoinedRatio(ratios.current)], box.offsetWidth, box.offsetHeight)
			: null;
		const next = joined && Math.max(...joined) > Math.max(...stacked)
			? { lines: [lines.join(' ')], sizes: joined }
			: { lines, sizes: stacked };
		setDrawn(held => (settled(held, next) ? held : next));
	}, [lines]);

	// A layout effect, so the sizes are on the type in the frame the animation starts on rather than
	// one frame later — and observed after that, because the card reflows underneath a running
	// graphic: a PowerScore arriving on a later push grows a bar row, which grows the band, which is
	// the box this type is fitted to. It measures on mount and on resize and at no other time, which
	// is why the club's name is this component's key up in the scene: a name that changed under a
	// mounted instance would keep the last one's sizes.
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
	// what sits centred in the band.
	return (
		<span
			ref={boxRef}
			className={`game-card-reveal-opening-name is-${side}`}
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

const revealNamingScene = ({ game }: { game: Game }) => (
	<>
		{namingBands}
		<OpeningName key={game.awayTeam.name} side='away' team={game.awayTeam} />
		<OpeningName key={game.homeTeam.name} side='home' team={game.homeTeam} />
	</>
);

export default revealNamingScene;
