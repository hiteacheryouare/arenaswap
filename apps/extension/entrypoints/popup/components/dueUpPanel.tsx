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

// Our sources name the next hitters only between half-innings, so this takes the at-bat panel's
// place on the screen until the first pitch, and the two are almost never up together.
//
// Wears the latest play and info panels' section skin (`gd-play-panel`), so the heading, the rule
// above it and the first-child reset in a tab pane all come with it rather than being restated. The
// text is the Your Players rows' (`fantasy-player-*`), so the two lists on one screen match.
const dueUpPanel = ({ game, awayColor, homeColor }: dueUpPanelProps) => {
	const hitters = game.dueUp ?? [];
	if (hitters.length === 0) return null;

	// These are the hitters of the half about to start. "End 8th" carries no half-inning, only
	// `inningEnded`, and it is the bottom that just finished, so the away side is up next; "Mid 8th"
	// arrives as `topOfInning: false`, so the home side is. An empty colour is the disc's grey.
	const discColor = game.inningEnded
		? awayColor
		: game.topOfInning === undefined ? '' : game.topOfInning ? awayColor : homeColor;

	return (
		<section className='gd-play-panel'>
			<div className='gd-play-heading'>{i18n.t('detail.dueUpHeading')}</div>
			<ul className='list-unstyled m-0'>
				{hitters.map((hitter, index) => (
					<li key={`${index}-${hitter.name}`} className='gd-dueup-row d-flex align-items-center gap-2'>
						<PlayerShot url={hitter.headshot} name={hitter.name} color={discColor} className='gd-pregame-leader-shot' />
						<span className='gd-dueup-who d-flex align-items-baseline flex-grow-1 min-w-0'>
							<span className='fantasy-player-name text-truncate'>{hitter.name}</span>
							{hitter.position && <span className='fantasy-player-position flex-shrink-0'>{hitter.position}</span>}
						</span>
						{hitter.summary && <span className='fantasy-player-line gd-dueup-line text-truncate'>{hitter.summary}</span>}
					</li>
				))}
			</ul>
		</section>
	);
};

export default dueUpPanel;
