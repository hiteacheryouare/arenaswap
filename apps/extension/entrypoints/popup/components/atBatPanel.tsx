import { i18n } from '#i18n';
import type { AtBatPlayer, Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { playerInitials } from './pregameLabels';

const AtBatSide = ({ player, roleLabel, side, teamColor }: {
	player: AtBatPlayer;
	roleLabel: string;
	teamColor?: string;
	side: 'away' | 'home';
}) => (
	<div className={`gd-atbat-side gd-atbat-${side}`}>
		<span className='gd-atbat-face'>
			<Crest
				logo={player.headshot}
				abbreviation={playerInitials(player.name)}
				className='gd-atbat-face-crest'
				teamColor={teamColor}
				loading='lazy'
			/>
		</span>
		<span className='gd-atbat-text'>
			<span className='gd-atbat-role'>{roleLabel}</span>
			<span className='gd-atbat-name' title={player.name}>{player.name}</span>
			{player.summary && <span className='gd-atbat-line' title={player.summary}>{player.summary}</span>}
		</span>
	</div>
);

const atBatPanel = ({ game }: { game: Game }) => {
	if (!game.atBat) return null;
	const { pitcher, batter } = game.atBat;

	const awayIsBatting = game.topOfInning !== false;
	const left = awayIsBatting
		? { player: batter, roleLabel: i18n.t('detail.atBatLabel') }
		: { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') };
	const right = awayIsBatting
		? { player: pitcher, roleLabel: i18n.t('detail.pitchingLabel') }
		: { player: batter, roleLabel: i18n.t('detail.atBatLabel') };

	return (
		<div className='gd-atbat-panel'>
			<AtBatSide {...left} side='away' teamColor={game.awayTeam.color} />
			<span className='gd-atbat-versus'>{i18n.t('gameCard.vs')}</span>
			<AtBatSide {...right} side='home' teamColor={game.homeTeam.color} />
		</div>
	);
};

export default atBatPanel;
