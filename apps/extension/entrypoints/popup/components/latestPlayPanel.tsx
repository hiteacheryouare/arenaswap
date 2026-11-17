import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import { describeRedCard } from './gameSituation';

interface latestPlayPanelProps {
	game: Game;
	awayColor: string;
	homeColor: string;
}

const latestPlayPanel = ({ game, awayColor, homeColor }: latestPlayPanelProps) => {
	const redCards = game.redCardEvents ?? [];
	if (!game.lastPlay && redCards.length === 0) return null;

	const accentOf = (teamId: string | undefined) => (
		teamId === game.homeTeam.id ? homeColor : teamId === game.awayTeam.id ? awayColor : undefined
	);
	const accent = accentOf(game.lastPlayTeamId);

	return (
		<section className='gd-play-panel'>
			{game.lastPlay && (
				<>
					<div className='gd-play-heading'>{i18n.t('detail.latestPlayHeading')}</div>
					<div
						className={`gd-play-body${accent ? ' has-accent' : ''}`}
						style={accent ? { borderLeftColor: accent } : undefined}
					>
						<div className='gd-play-text'>{game.lastPlay}</div>
						{game.lastPlayDrive && (
							<div className='gd-play-drive'>{game.lastPlayDrive}</div>
						)}
					</div>
				</>
			)}
			{redCards.length > 0 && (
				<>
					<div className='gd-play-heading'>{i18n.t('detail.redCardsHeading')}</div>
					{redCards.map(card => {
						const cardAccent = accentOf(card.teamId);
						return (
							<div
								key={`${card.teamId}-${card.minute}-${card.player ?? ''}`}
								className={`gd-play-body gd-red-card${cardAccent ? ' has-accent' : ''}`}
								style={cardAccent ? { borderLeftColor: cardAccent } : undefined}
							>
								<div className='gd-play-text'>{describeRedCard(card, game, i18n.t)}</div>
							</div>
						);
					})}
				</>
			)}
		</section>
	);
};

export default latestPlayPanel;
