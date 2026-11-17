import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import PlayerShot from './playerShot';

interface dueUpPanelProps {
	game: Game;
	awayColor: string;
	homeColor: string;
}

const dueUpPanel = ({ game, awayColor, homeColor }: dueUpPanelProps) => {
	const hitters = game.dueUp ?? [];
	if (hitters.length === 0) return null;

	const discColor = game.inningEnded
		? awayColor
		: game.topOfInning === undefined ? '' : game.topOfInning ? awayColor : homeColor;

	return (
		<section className='gd-play-panel'>
			<div className='gd-play-heading'>{i18n.t('detail.dueUpHeading')}</div>
			<ul className='list-unstyled m-0'>
				{hitters.map((hitter, index) => (
					<li key={`${index}-${hitter.name}`} className='gd-dueup-row d-flex align-items-center gap-3'>
						<PlayerShot url={hitter.headshot} name={hitter.name} color={discColor} className='gd-pregame-leader-shot' />
						<span className='gd-dueup-who d-flex align-items-baseline flex-grow-1 min-w-0'>
							<span className='fantasy-player-name text-truncate' title={hitter.name}>{hitter.name}</span>
							{hitter.position && <span className='fantasy-player-position flex-shrink-0'>{hitter.position}</span>}
						</span>
						{hitter.summary && <span className='fantasy-player-line gd-dueup-line text-truncate' title={hitter.summary}>{hitter.summary}</span>}
					</li>
				))}
			</ul>
		</section>
	);
};

export default dueUpPanel;
