import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Game, Team } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import { revealDelayMs, revealDurationMs, revealLeanRatio, revealRate, type revealMode } from '../cardReveal';

interface gameCardRevealProps {
	game: Game;
	mode: revealMode;
	index: number;
	children: ReactNode;
}

interface revealLanding {
	awayDx: number;
	awayDy: number;
	homeDx: number;
	homeDy: number;
	lean: number;
}

const crestCentre = (crest: Element, box: DOMRect) => {
	const rect = crest.getBoundingClientRect();
	return {
		x: rect.left - box.left + rect.width / 2,
		y: rect.top - box.top + rect.height / 2,
	};
};

// Two layers per side, clipped along the same leaning edge from opposite directions: the crest is
// only drawn where the bar has already been, the tricode only where it has not. They are exact
// complements, so every pixel of the card is showing one or the other at every instant and the
// trade happens under the bar rather than as a dissolve near it.
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
			<span className='game-card-reveal-abbr'>{team.abbreviation}</span>
		</span>
	</>
);

const gameCardReveal = ({ game, mode, index, children }: gameCardRevealProps) => {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const [landing, setLanding] = useState<revealLanding | null>(null);
	const [done, setDone] = useState(false);
	const delay = revealDelayMs(index, mode);

	// In a layout effect rather than an effect: this runs after the card is in the DOM but before
	// the browser paints, so the offsets are already on the element in the animation's first frame.
	// Measured rather than derived, because where a crest sits in a card is a fact about the card's
	// own flex row — it moves with the locale, the sport and whether there is a tab picker.
	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const [awayCrest, homeCrest] = wrapper.querySelectorAll('.game-card .team-crest');
		if (!awayCrest || !homeCrest) return;
		const box = wrapper.getBoundingClientRect();
		const away = crestCentre(awayCrest, box);
		const home = crestCentre(homeCrest, box);
		setLanding({
			awayDx: away.x - box.width * 0.25,
			awayDy: away.y - box.height / 2,
			homeDx: home.x - box.width * 0.75,
			homeDy: home.y - box.height / 2,
			// Half the horizontal run of a leaning edge across this card, so the seam and both wipe
			// edges hold the same angle on a card of any height rather than only on the one they
			// were eyeballed against.
			lean: (box.height * revealLeanRatio) / 2,
		});
	}, [mode]);

	// Per card rather than for the list: the first card has finished long before the last one
	// starts, and until its stage is gone it is a layer sitting over a card you can already click.
	useLayoutEffect(() => {
		if (mode === 'none') return;
		const timer = setTimeout(() => setDone(true), delay + revealDurationMs(mode));
		return () => clearTimeout(timer);
	}, [mode, delay]);

	if (mode === 'none' || done) return <>{children}</>;

	// The pair `buildGameCardStyle` resolves, down to the fallback, so the halves collapse onto
	// rails of exactly the colour already painted underneath them. A finished game is the one flat
	// card in the product and has no rails, so its colour retreats the whole way instead.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#dee2e6', '#dee2e6');

	return (
		<div
			ref={wrapperRef}
			className={`game-card-reveal${game.status === 'post' ? ' is-railless' : ''}`}
			style={{
				'--reveal-away': awayColor,
				'--reveal-home': homeColor,
				'--reveal-delay': `${delay}ms`,
				'--reveal-rate': revealRate(mode),
				'--reveal-lean': `${landing?.lean ?? 0}px`,
				'--reveal-away-dx': `${landing?.awayDx ?? 0}px`,
				'--reveal-away-dy': `${landing?.awayDy ?? 0}px`,
				'--reveal-home-dx': `${landing?.homeDx ?? 0}px`,
				'--reveal-home-dy': `${landing?.homeDy ?? 0}px`,
			} as CSSProperties}
		>
			<div className='game-card-reveal-stage' aria-hidden='true'>
				<span className='game-card-reveal-base' />
				<span className='game-card-reveal-half is-away' />
				<span className='game-card-reveal-half is-home' />
				{/* Judged against the colour it is about to be drawn on rather than against the card's
				    white, which is the whole reason these are not the card's own crests scaled up. */}
				<RevealSide team={game.awayTeam} surface={awayColor} side='away' />
				<RevealSide team={game.homeTeam} surface={homeColor} side='home' />
			</div>
			{children}
			<div className='game-card-reveal-sweeps' aria-hidden='true'>
				<span className='game-card-reveal-sweep is-away' />
				<span className='game-card-reveal-sweep is-away is-chaser' />
				<span className='game-card-reveal-sweep is-home' />
				<span className='game-card-reveal-sweep is-home is-chaser' />
			</div>
		</div>
	);
};

export default gameCardReveal;
