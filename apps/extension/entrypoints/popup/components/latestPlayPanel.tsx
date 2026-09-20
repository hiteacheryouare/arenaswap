import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';

interface latestPlayPanelProps {
	game: Game;
	// The dark-readable pair the charts already use, not the hero's raw accents: this bar sits on
	// the #0d1117 shell, where a navy primary is very nearly invisible.
	awayColor: string;
	homeColor: string;
}

// The play that just happened, in ESPN's own words. This used to sit on the list card, directly
// above the venue and the networks, where it read as one more line of venue chrome rather than as
// the live thing on the screen. It earns a heading here instead.
//
// Takes the dark rule-separated treatment the info panel and the charts use, not the breakdown's
// white card — everything below the hero reads as one dark column of sections.
const latestPlayPanel = ({ game, awayColor, homeColor }: latestPlayPanelProps) => {
	if (!game.lastPlay) return null;

	// Same shape as the section titles in the game list: a 3px rule down the left with the text
	// indented off it. The colour is the one thing that differs — whose play it was, rather than
	// the product orange — which is why it is set inline rather than in the stylesheet.
	const accent = game.lastPlayTeamId === game.homeTeam.id
		? homeColor
		: game.lastPlayTeamId === game.awayTeam.id ? awayColor : undefined;

	return (
		<section className='gd-play-panel'>
			<div className='gd-play-heading'>{i18n.t('detail.latestPlayHeading')}</div>
			{/* The bar wraps the play rather than the heading: it marks who did this, and the
			    heading is the same words whoever did. Falls back to no bar at all when ESPN names
			    nobody, rather than to a grey one that would read as a team. */}
			<div
				className={`gd-play-body${accent ? ' has-accent' : ''}`}
				style={accent ? { borderLeftColor: accent } : undefined}
			>
				{/* `pre-line` rather than a map: a penalty arrives as two sentences joined by a
				    newline, and both halves are worth reading. */}
				<div className='gd-play-text'>{game.lastPlay}</div>
				{game.lastPlayDrive && (
					<div className='gd-play-drive'>{game.lastPlayDrive}</div>
				)}
			</div>
		</section>
	);
};

export default latestPlayPanel;
