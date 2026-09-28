import { i18n } from '#i18n';
import type { AtBatPlayer, Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { playerInitials } from './pregameLabels';

// The live counterpart to the pre-game probables. Once the first pitch is thrown the probable
// starter stops being true, and this is the pair that replaces it.
const AtBatSide = ({ player, roleLabel, side }: {
	player: AtBatPlayer;
	roleLabel: string;
	// The half of the stage this player stands on, which is his team's side, not his role.
	side: 'away' | 'home';
}) => (
	<div className={`dt-atbat-side dt-atbat-${side}`}>
		<span className='dt-atbat-face'>
			<Crest
				logo={player.headshot}
				abbreviation={playerInitials(player.name)}
				className='dt-atbat-face-crest'
				loading='lazy'
			/>
		</span>
		<span className='dt-atbat-text'>
			<span className='dt-atbat-role'>{roleLabel}</span>
			<span className='dt-atbat-name'>{player.name}</span>
			{player.summary && <span className='dt-atbat-line'>{player.summary}</span>}
		</span>
	</div>
);

const atBatPanel = ({ game }: { game: Game }) => {
	if (!game.atBat) return null;
	const { pitcher, batter } = game.atBat;

	// The visitors bat in the top of the inning and the home side in the bottom, so the pair swaps
	// ends at the half and each man stays under his own club. An unknown half reads as the top,
	// matching the inning caret.
	const awayIsBatting = game.topOfInning !== false;
	const left = awayIsBatting
		? { player: batter, roleLabel: i18n.t('detail.atBatLabel') }
		: { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') };
	const right = awayIsBatting
		? { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') }
		: { player: batter, roleLabel: i18n.t('detail.atBatLabel') };

	return (
		<div className='dt-atbat'>
			<AtBatSide {...left} side='away' />
			<span className='dt-atbat-versus'>{i18n.t('gameCard.vs')}</span>
			<AtBatSide {...right} side='home' />
		</div>
	);
};

export default atBatPanel;
