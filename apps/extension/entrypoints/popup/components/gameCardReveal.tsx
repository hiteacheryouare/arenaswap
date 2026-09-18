import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Game, Team } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import RevealOpeningNames from './revealOpeningNames';
import {
	revealAbbrScale,
	revealDelayMs,
	revealHoldScale,
	revealLean,
	revealOpenCrestShare,
	revealRate,
	revealSkewDeg,
	revealSpineStartMs,
	revealStageBleedPx,
	revealSweepRun,
	revealTotalMs,
	type revealMode,
} from '../cardReveal';

interface gameCardRevealProps {
	game: Game;
	mode: revealMode;
	index: number;
	skipping: boolean;
	children: ReactNode;
}

interface revealLanding {
	awayDx: number;
	awayDy: number;
	homeDx: number;
	homeDy: number;
	lean: number;
	skew: number;
	crestSize: number;
	hold: number;
	sweepRun: number;
	// The card's own height, which the opening pair are sized off rather than the stage's: they are
	// drawn to overhang the card, so it is the thing the overhang is a fraction of.
	cardHeight: number;
}

const crestCentre = (rect: DOMRect, box: DOMRect) => ({
	x: rect.left - box.left + rect.width / 2,
	y: rect.top - box.top + rect.height / 2,
});

// Two layers per side, clipped along the same leaning edge from opposite directions: the crest is
// only drawn where the bar has already been, the tricode only where it has not. They are exact
// complements, so every pixel of the card is showing one or the other at every instant and the
// trade happens under the bar rather than as a dissolve near it.
//
// The tricode is two copies of itself. An outline of live text is not a stroke on that text: a
// stroke follows every contour the font draws, including the ones a filled glyph covers up, and DM
// Sans builds an N out of overlapping stems — so `-webkit-text-stroke` on its own draws the
// diagonal on through both of them and every junction comes out cross-hatched. The back copy is the
// glyph solid white and stroked wider than itself; the front copy is the same glyph in the colour
// behind it, laid exactly over the back one. What is left showing is the stroke outside the
// silhouette, which is the outline and nothing else.
const RevealSide = ({ team, surface, side }: { team: Team; surface: string; side: 'away' | 'home' }) => (
	<>
		<span className={`game-card-reveal-wipe is-${side}`}>
			<span className='game-card-reveal-crest'>
				<TeamCrest
					logo={team.logo}
					abbreviation={(team.abbreviation || '?').slice(0, 3)}
					background={surface}
					discClassName='game-card-reveal-crest-plate'
					crestClassName='game-card-reveal-crest-logo'
					fallback='blank'
					loading='eager'
				/>
			</span>
		</span>
		<span className={`game-card-reveal-mask is-${side}`}>
			<span className='game-card-reveal-abbr'>
				<span className='game-card-reveal-abbr-edge'>{team.abbreviation}</span>
				<span className='game-card-reveal-abbr-face'>{team.abbreviation}</span>
			</span>
		</span>
	</>
);

// The beat that runs ahead of the poster: each crest on a disc of its own team's colour, both drawn
// past the edges of the card so the stage's clip cuts them, arriving from their own outer side and
// settling as the colour comes over them. Its own layer rather than the poster's, which is clipped to
// hide its crests until a bar has passed — these have to be visible from the first frame, and they sit
// under the colour halves so that the halves growing over them is the whole of the transition. Nothing
// fades into anything: the pair are still shrinking towards the hold when the colour takes them.
//
// Each crest's colour goes across its own half of the card at full size rather than into a disc behind
// it, and `teamCrest`'s own wrapper is that field — which is what keeps the colour right without this
// file deciding it. Handed the team's colour as its surface, the component comes back bare when the
// artwork reads on it and the stylesheet paints the team colour; when it does not, it sets its tinted
// plate inline and the field becomes that instead. Either way the crest ends up on the colour a disc
// would have given it, spread across the card.
const RevealOpening = ({ game, awayColor, homeColor }: { game: Game; awayColor: string; homeColor: string }) => (
	<div className='game-card-reveal-opening' aria-hidden='true'>
		{([['away', game.awayTeam, awayColor], ['home', game.homeTeam, homeColor]] as const).map(([side, team, surface]) => (
			<TeamCrest
				key={side}
				logo={team.logo}
				abbreviation={(team.abbreviation || '?').slice(0, 3)}
				background={surface}
				discClassName={`game-card-reveal-opening-field is-${side}`}
				crestClassName='game-card-reveal-opening-logo'
				fallback='blank'
				loading='eager'
			/>
		))}
		<RevealOpeningNames game={game} />
	</div>
);

const gameCardReveal = ({ game, mode, index, skipping, children }: gameCardRevealProps) => {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const [landing, setLanding] = useState<revealLanding | null>(null);
	const [done, setDone] = useState(false);
	const delay = revealDelayMs(index, mode);
	const spineStart = revealSpineStartMs(index, mode);

	// Measured rather than derived, because where a crest sits in a card and how big it is are facts
	// about the card's own flex row — they move with the locale, the sport and whether there is a tab
	// picker.
	const measure = useCallback(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const [awayCrest, homeCrest] = wrapper.querySelectorAll('.game-card .team-crest');
		if (!awayCrest || !homeCrest) return;
		const box = wrapper.getBoundingClientRect();
		const awayRect = awayCrest.getBoundingClientRect();
		const away = crestCentre(awayRect, box);
		const home = crestCentre(homeCrest.getBoundingClientRect(), box);
		const crestSize = awayRect.width;
		// Half the horizontal run of the leaning edges across the stage, which is what every part of
		// the graphic that leans is cut or skewed by. The stage's height, not the card's: it bleeds a
		// pixel past the card at each end, and the same run over a taller box is a shallower angle.
		// Bounded by the card's width rather than left to the height alone — see `revealLeanWidthCap`.
		const stageHeight = box.height + revealStageBleedPx * 2;
		const lean = revealLean(stageHeight, box.width);
		setLanding({
			awayDx: away.x - box.width * 0.25,
			awayDy: away.y - box.height / 2,
			homeDx: home.x - box.width * 0.75,
			homeDy: home.y - box.height / 2,
			lean,
			skew: revealSkewDeg(lean, stageHeight),
			crestSize,
			hold: revealHoldScale(box.width, box.height, crestSize),
			sweepRun: revealSweepRun(box.width, lean),
			cardHeight: box.height,
		});
	}, []);

	// In a layout effect rather than an effect: this runs after the card is in the DOM but before the
	// browser paints, so the offsets are already on the element in the animation's first frame.
	//
	// Observed rather than taken once, because the card reflows underneath a running graphic. Two
	// ways, both ordinary: a game's PowerScore arrives on a later push and `liveGameCard` grows a bar
	// row it was not drawing, and a scheduled game going live swaps `PreGameCard` for `LiveGameCard`
	// under the same key. Measured once, every offset below is then stale by the height of that
	// change — the crest lands short of the card's own crest and jumps the rest at the handoff, and
	// the seam is cut at an angle the bars are no longer skewed by.
	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		measure();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measure);
		observer.observe(wrapper);
		return () => observer.disconnect();
	}, [mode, measure]);

	// Per card rather than for the list: the first card has finished long before the last one
	// starts, and until its stage is gone it is a layer sitting over a card you can already click.
	useLayoutEffect(() => {
		if (mode === 'none') return;
		const timer = setTimeout(() => setDone(true), delay + revealTotalMs(mode));
		return () => clearTimeout(timer);
	}, [mode, delay]);

	if (mode === 'none' || done) return <>{children}</>;

	// The pair `buildGameCardStyle` resolves, down to the fallback, so the colour that retreats off
	// each edge is the colour of the rail the card has been drawing underneath it the whole time.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#dee2e6', '#dee2e6');

	return (
		<div
			ref={wrapperRef}
			className={`game-card-reveal${skipping ? ' is-skipping' : ''}`}
			style={{
				'--reveal-away': awayColor,
				'--reveal-home': homeColor,
				'--reveal-delay': `${delay}ms`,
				'--reveal-spine': `${spineStart}ms`,
				'--reveal-rate': revealRate(mode),
				'--reveal-lean': `${landing?.lean ?? 0}px`,
				'--reveal-skew': `${landing?.skew ?? 0}deg`,
				'--reveal-crest': `${landing?.crestSize ?? 0}px`,
				'--reveal-hold': landing?.hold ?? 1,
				'--reveal-sweep-run': `${landing?.sweepRun ?? 0}px`,
				'--reveal-open-crest': `${(landing?.cardHeight ?? 0) * revealOpenCrestShare}px`,
				'--reveal-abbr-scale': revealAbbrScale(game.awayTeam.abbreviation, game.homeTeam.abbreviation),
				'--reveal-away-dx': `${landing?.awayDx ?? 0}px`,
				'--reveal-away-dy': `${landing?.awayDy ?? 0}px`,
				'--reveal-home-dx': `${landing?.homeDx ?? 0}px`,
				'--reveal-home-dy': `${landing?.homeDy ?? 0}px`,
			} as CSSProperties}
		>
			{/* Outside the stage rather than in it: it goes under the crests the stage carries. Square,
			    like everything else in here — the wrapper holds the one rounded clip. */}
			<span className='game-card-reveal-base' aria-hidden='true' />
			{mode === 'full' && <RevealOpening game={game} awayColor={awayColor} homeColor={homeColor} />}
			<div className='game-card-reveal-stage' aria-hidden='true'>
				<span className='game-card-reveal-half is-away' />
				<span className='game-card-reveal-half is-home' />
				{/* Judged against the colour it is about to be drawn on rather than against the card's
				    white, which is the whole reason these are not the card's own crests scaled up.
				    No `monoMarks`, unlike the detail screens, so a crest that does not read on its own
				    team colour goes to the tinted plate rather than to ESPN's white mark. Deliberate and
				    not an oversight: the marks are only on `/teams`, which the popup's state does not
				    carry, and the maintainer's call was that the plate is what this should draw. */}
				<RevealSide team={game.awayTeam} surface={awayColor} side='away' />
				<RevealSide team={game.homeTeam} surface={homeColor} side='home' />
			</div>
			{children}
			{/* Three to a side rather than two. A broadcast wipe is cut as a group travelling one path —
			    the thick bar turns the ground over and the thin ones run behind it on the same line — and
			    a third costs nothing in kind, since all of them translate and none of them touch layout.
			    A thirty-game Saturday opens with 48 of these instead of 32, all on the compositor. */}
			<div className='game-card-reveal-sweeps' aria-hidden='true'>
				<span className='game-card-reveal-sweep is-away' />
				<span className='game-card-reveal-sweep is-away is-chaser' />
				<span className='game-card-reveal-sweep is-away is-chaser is-trailer' />
				<span className='game-card-reveal-sweep is-home' />
				<span className='game-card-reveal-sweep is-home is-chaser' />
				<span className='game-card-reveal-sweep is-home is-chaser is-trailer' />
			</div>
		</div>
	);
};

export default gameCardReveal;
