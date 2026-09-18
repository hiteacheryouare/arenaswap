import type { Game } from '@arenaswap/core/types';

// The two clubs named in full over the opening beat — "Miami Marlins", "Washington Commanders" —
// which is the one thing an in-stadium matchup graphic says out loud that this one never did. The
// poster after it carries tricodes, and a tricode is a thing you decode rather than read.
//
// ESPN's `displayName`, which is already the full name and is carried as `Team.name`. Not assembled
// from the nickname and anything else: the club is "Penn State Nittany Lions" and the nickname alone
// is "Nittany Lions", so there is nothing to join and no place name to slice off.
//
// A sibling of the colour fields rather than a child of one, because each field is `teamCrest`'s own
// wrapper and takes no children. It carries the same geometry and the same seam clip as the field it
// names, so a long name is cut by the seam rather than crossing it, and the text inside is held clear
// of the lean so nothing is ever actually cut.
//
// Its own file, and rendered as a pair rather than one per side, to keep this to a single line in
// `gameCardReveal` — that file is being worked on elsewhere.
const revealOpeningNames = ({ game }: { game: Game }) => (
	<>
		{([['away', game.awayTeam], ['home', game.homeTeam]] as const).map(([side, team]) => (
			<span key={side} className={`game-card-reveal-opening-name is-${side}`}>
				<span className='game-card-reveal-opening-name-text'>{team.name}</span>
			</span>
		))}
	</>
);

export default revealOpeningNames;
