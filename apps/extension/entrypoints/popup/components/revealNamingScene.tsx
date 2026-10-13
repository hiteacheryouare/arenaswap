import type { Game } from '@arenaswap/core/types';
import RevealName from './revealName';

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

const revealNamingScene = ({ game }: { game: Game }) => (
	<>
		{namingBands}
		<RevealName key={`away-${game.awayTeam.name}`} team={game.awayTeam} className='game-card-reveal-opening-name is-away' />
		<RevealName key={`home-${game.homeTeam.name}`} team={game.homeTeam} className='game-card-reveal-opening-name is-home' />
	</>
);

export default revealNamingScene;
