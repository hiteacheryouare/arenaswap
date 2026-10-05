import { i18n } from '#i18n';
import { rosterInGame } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { Game } from '@arenaswap/core/types';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import PlayerShot from './playerShot';
import type { BoxScore } from './boxScoreParse';
import { rosterPlayerLines, type playerStatGroup } from './fantasyPlayerLines';
import { rosterHeadshot } from '../../../utils/fantasyRoster';

interface fantasyPlayersPanelProps {
	game: Game;
	roster: readonly FantasyRosterEntry[];
	boxScore: BoxScore;
}

const statText = (group: playerStatGroup): string => group.stats
	.map(stat => i18n.t('fantasy.statValue', { value: stat.value, label: i18n.t(stat.labelKey) }))
	.join(i18n.t('powerScore.reasonJoiner'));

const rosterPosition = (entry: FantasyRosterEntry): string => {
	if (entry.position === 'DST') return i18n.t('fantasy.positionDst');
	return entry.position === 'player' || entry.position === 'P' || entry.position === 'H' ? '' : entry.position;
};

// Your rostered players in this game, with their line from the box score once there is one.
const fantasyPlayersPanel = ({ game, roster, boxScore }: fantasyPlayersPanelProps) => {
	const players = rosterInGame(roster, game);
	if (players.length === 0) return null;
	const lines = rosterPlayerLines(game.sportType, boxScore, players);

	return (
		<section className='gd-play-panel fantasy-players-panel'>
			<div className='gd-play-heading'>{i18n.t('fantasy.yourPlayersHeading')}</div>
			<ul className='list-unstyled m-0'>
				{lines.map(({ entry, position, didNotPlay, groups }) => {
					const shownPosition = position || rosterPosition(entry);
					const team = entry.teamId === game.homeTeam.id ? game.homeTeam : game.awayTeam;
					return (
						<li key={entry.athleteId} className='fantasy-player-row'>
							{entry.position === 'DST'
								? <CrestDisc logo={team.logo} abbreviation={team.abbreviation.slice(0, 3)} discClassName='fantasy-player-crest-disc' crestClassName='fantasy-player-crest-logo' loading='lazy' />
								: <PlayerShot url={rosterHeadshot(entry)} name={entry.name} color='#e5e7eb' className='gd-pregame-leader-shot' />}
							<div className='min-w-0'>
								<div className='fantasy-player-name'>
									{entry.name}
									{shownPosition && <span className='fantasy-player-position'>{shownPosition}</span>}
								</div>
								{didNotPlay && <div className='fantasy-player-line'>{i18n.t('box.didNotPlay')}</div>}
								{groups.map(group => (
									<div key={group.headingKey} className='fantasy-player-line'>
										{groups.length > 1
											? i18n.t('fantasy.statGroup', { heading: i18n.t(group.headingKey), stats: statText(group) })
											: statText(group)}
									</div>
								))}
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
};

export default fantasyPlayersPanel;
