import type { CSSProperties } from 'react';
import type { Game } from '@arenaswap/core/types';
import { revealNameScale } from '../cardReveal';

// The two clubs named in full over the opening beat — "Miami Marlins", "Washington Commanders" —
// which is the one thing an in-stadium matchup graphic says out loud that this one never did. The
// poster after it carries tricodes, and a tricode is a thing you decode rather than read.
//
// ESPN's `displayName`, which is already the full name and is carried as `Team.name`. Not assembled
// from the nickname and anything else: the club is "Penn State Nittany Lions" and the nickname alone
// is "Nittany Lions", so there is nothing to join and no place name to slice off.
//
// Set as big as the tricodes it precedes, and in the same two copies for the same reason: an outline
// of live text is not a stroke on that text, because a stroke follows every contour the font draws
// including the ones a filled glyph hides. The back copy is the glyph solid white and stroked wider
// than itself; the front copy is the same glyph in the colour behind it. What is left showing is the
// stroke outside the silhouette. One line per word, so what has to fit the half a card is the longest
// word rather than the longest name — see `revealNameScale`.
//
// A sibling of the colour fields rather than a child of one, because each field is `teamCrest`'s own
// wrapper and takes no children. It carries the same geometry and the same seam clip as the field it
// names, so a long name is cut by the seam rather than crossing it.
//
// Its own file, and rendered as a pair rather than one per side, to keep this to a single line in
// `gameCardReveal` — that file is being worked on elsewhere.
const revealOpeningNames = ({ game, awayColor, homeColor }: {
	game: Game;
	awayColor: string;
	homeColor: string;
}) => (
	<>
		{([['away', game.awayTeam, awayColor], ['home', game.homeTeam, homeColor]] as const).map(([side, team, surface]) => (
			<span
				key={side}
				className={`game-card-reveal-opening-name is-${side}`}
				style={{
					'--reveal-name-scale': revealNameScale(game.awayTeam.name, game.homeTeam.name),
					'--reveal-name-surface': surface,
				} as CSSProperties}
			>
				<span className='game-card-reveal-opening-name-type'>
					{(team.name ?? '').split(/\s+/).filter(Boolean).map((word, line) => (
						<span key={`${word}-${line}`} className='game-card-reveal-opening-name-line'>
							<span className='game-card-reveal-opening-name-edge'>{word}</span>
							<span className='game-card-reveal-opening-name-face'>{word}</span>
						</span>
					))}
				</span>
			</span>
		))}
	</>
);

export default revealOpeningNames;
