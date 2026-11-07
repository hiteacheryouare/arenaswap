import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game } from '@arenaswap/core/types';
import { makeGame, makeScore } from '../../support/fixtures';

const popupWidth = 320;

const svgLogo = (fill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><rect width="300" height="80" fill="${fill}"/></svg>`)}`;
const brokenLogo = 'data:image/png;base64,AAAA';

// The shape of an ACC Network and an ESPN+ broadcast, from the 2026-11-06 college scoreboard, plus a
// regional network that sends no artwork at all.
const game: Game = makeGame('net', {
	league: 'ncaab',
	broadcasts: ['ACC Network', 'ESPNU', 'Local TV'],
	broadcastLogos: {
		'ACC Network': { logo: svgLogo('#013ca6'), darkLogo: svgLogo('#ffffff') },
		ESPNU: { logo: svgLogo('#d00000') },
	},
});

const mountCard = (subject: Game) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${popupWidth}px` }}>
			<LiveGameCard
				game={subject}
				excitementResult={makeScore(subject.id, 60)}
				favoriteTeamIds={new Set()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
			/>
		</div>,
	);
};

describe('network logos on a live card', () => {
	it('shows a network\'s white artwork and writes the rest out', () => {
		mountCard(game);
		cy.get('.game-meta-networks img.network-logo').should('have.length', 1)
			.and('have.attr', 'alt', 'ACC Network')
			.and('have.attr', 'src', svgLogo('#ffffff'));
		// ESPNU has only its colour artwork, which would vanish into a team colour, so it stays text.
		cy.get('.game-meta-networks').should('contain.text', 'ESPNU').and('contain.text', 'Local TV');
	});

	it('falls back to the name when a logo will not load', () => {
		mountCard({ ...game, broadcastLogos: { 'ACC Network': { darkLogo: brokenLogo } } });
		cy.get('.game-meta-networks img').should('not.exist');
		cy.get('.game-meta-networks').should('contain.text', 'ACC Network');
	});

	it('keeps the logo at the height of the line it sits in', () => {
		mountCard(game);
		cy.get('.game-meta-networks img.network-logo').should($logo => {
			expect($logo[0].getBoundingClientRect().height, 'logo height').to.be.within(10, 13);
		});
	});
});
