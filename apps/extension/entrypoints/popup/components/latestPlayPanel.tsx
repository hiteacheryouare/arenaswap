import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';

interface latestPlayPanelProps {
	game: Game;
	// The pair the charts use, which is lifted to read against the page rather than the stage.
	awayColor: string;
	homeColor: string;
}

// The play that just happened, in our sources' own words, first in the live stack because it is
// the most time-sensitive thing on the screen.
const latestPlayPanel = ({ game, awayColor, homeColor }: latestPlayPanelProps) => {
	if (!game.lastPlay) return null;

	// Whose play it was. With nobody named the rule goes and the indent stays, so the text doesn't
	// shift sideways between plays.
	const accent = game.lastPlayTeamId === game.homeTeam.id
		? homeColor
		: game.lastPlayTeamId === game.awayTeam.id ? awayColor : undefined;

	return (
		<section className='card dt-card dt-play' aria-labelledby='dt-play-title'>
			<h3 className='dt-card-title dt-play-heading' id='dt-play-title'>{i18n.t('detail.latestPlayHeading')}</h3>
			<div
				className={`dt-play-body${accent ? ' has-accent' : ''}`}
				style={accent ? { borderLeftColor: accent } : undefined}
			>
				{/* A penalty arrives as two sentences joined by a newline, and both are worth reading. */}
				<p className='dt-play-text'>{game.lastPlay}</p>
				{game.lastPlayDrive && <p className='dt-play-drive'>{game.lastPlayDrive}</p>}
			</div>
		</section>
	);
};

export default latestPlayPanel;
