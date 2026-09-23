import { i18n } from '#i18n';
import type { AtBatPlayer, Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { playerInitials } from './pregameLabels';

// The live counterpart to the pre-game probables block. Once the first pitch is thrown
// `Team.probableStarter` stops being true, and this is the pair that replaces it.
//
// Sits on the hero's scrimmed band of team colour rather than on a light card, so it gets a
// translucent plate and white ink instead of the .gd-setup treatment used lower down the screen.
const AtBatSide = ({ player, roleLabel, side }: {
	player: AtBatPlayer;
	roleLabel: string;
	// Which half of the panel this player occupies, which is the side of the hero their team is on
	// — not which of the two roles they are playing.
	side: 'away' | 'home';
}) => (
	<div className={`gd-atbat-side gd-atbat-${side}`}>
		<span className='gd-atbat-face'>
			{/* Crest already does the URL-keyed retry and the initials fallback, which is what
			    covers the players ESPN has drawn no portrait for. */}
			<Crest
				logo={player.headshot}
				abbreviation={playerInitials(player.name)}
				className='gd-atbat-face-crest'
				loading='lazy'
			/>
		</span>
		<span className='gd-atbat-text'>
			<span className='gd-atbat-role'>{roleLabel}</span>
			<span className='gd-atbat-name'>{player.name}</span>
			{player.summary && <span className='gd-atbat-line'>{player.summary}</span>}
		</span>
	</div>
);

const atBatPanel = ({ game }: { game: Game }) => {
	if (!game.atBat) return null;
	const { pitcher, batter } = game.atBat;

	/* Each player stands under his own club. The hero puts the away team on the left and the home
	   team on the right, and the halves of an inning decide who is doing what: the visitors bat in
	   the top, the home side bats in the bottom. So the pair swaps ends at the half rather than
	   holding a fixed pitcher-left layout that would put a man on the wrong team's side for half
	   the game.

	   `topOfInning` is undefined only when ESPN has not said, which is not a state a live at-bat
	   reaches — treat it as the top, matching how the inning caret reads it. */
	const awayIsBatting = game.topOfInning !== false;
	const left = awayIsBatting
		? { player: batter, roleLabel: i18n.t('detail.atBatLabel') }
		: { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') };
	const right = awayIsBatting
		? { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') }
		: { player: batter, roleLabel: i18n.t('detail.atBatLabel') };

	return (
		<div className='gd-atbat-panel'>
			<AtBatSide {...left} side='away' />
			<span className='gd-atbat-versus'>{i18n.t('gameCard.vs')}</span>
			<AtBatSide {...right} side='home' />
		</div>
	);
};

export default atBatPanel;
