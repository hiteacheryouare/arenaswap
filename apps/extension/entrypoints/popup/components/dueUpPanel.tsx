import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import PlayerShot from './playerShot';

interface dueUpPanelProps {
	game: Game;
	// The dark-readable pair the charts use, because the disc is the batting club's colour under
	// the player's portrait and this section sits on the #0d1117 shell.
	awayColor: string;
	homeColor: string;
}

// Wears the latest play and info panels' section skin (`gd-play-panel`), so the heading, the rule
// above it and the first-child reset in a tab pane all come with it rather than being restated.
const dueUpPanel = ({ game, awayColor, homeColor }: dueUpPanelProps) => {
	const hitters = game.dueUp ?? [];
	if (hitters.length === 0) return null;

	// The hitters belong to whoever is batting. With no half-inning to read there is no honest
	// colour to give them, and an empty one falls back to the disc's neutral grey.
	const discColor = game.topOfInning === undefined ? '' : game.topOfInning ? awayColor : homeColor;

	return (
		<section className='gd-play-panel'>
			<div className='gd-play-heading'>{i18n.t('detail.dueUpHeading')}</div>
			<ul className='list-unstyled m-0'>
				{hitters.map((hitter, index) => (
					<li key={`${index}-${hitter.name}`} className='gd-dueup-row d-flex align-items-center gap-2'>
						<PlayerShot url={hitter.headshot} name={hitter.name} color={discColor} className='gd-dueup-shot' />
						<span className='d-flex align-items-baseline gap-1 flex-grow-1 min-w-0'>
							<span className='gd-dueup-name text-truncate'>{hitter.name}</span>
							{hitter.position && <span className='gd-dueup-position flex-shrink-0'>{hitter.position}</span>}
						</span>
						{hitter.summary && <span className='gd-dueup-line text-truncate'>{hitter.summary}</span>}
					</li>
				))}
			</ul>
		</section>
	);
};

export default dueUpPanel;
