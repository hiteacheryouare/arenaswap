import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import type { Game, Team } from '@arenaswap/core/types';

const team = (abbreviation: string, color: string, alternateColor: string, logo: string): Team => (
	{ id: abbreviation, name: abbreviation, abbreviation, score: 2, color, alternateColor, logo }
);

const sabres = team('BUF', '#FDB71A', '#00468B', 'https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/buf.png');
const flyers = team('PHI', '#0C2340', '#FE5823', 'https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/phi.png');
// A club with white and nothing else: one that publishes an alternate is drawn in that instead.
const whiteOnly = team('TOT', '#FFFFFF', '', 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png');

const game = (awayTeam: Team, homeTeam: Team, status: Game['status'] = 'in'): Game => ({
	id: 'g1', league: 'nhl', sportType: 'hockey', status, period: 2, clockSeconds: 300, awayTeam, homeTeam,
});

const props = {
	excitementResult: undefined,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

const white = 'rgb(255, 255, 255)';
const nearBlack = 'rgb(17, 24, 39)';

// Every crest answered locally, so the specs below assert which URL was asked for without depending on
// the network. The missing-variant case overrides this with a 404.
const stubCrest = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#888"/></svg>';

beforeEach(() => {
	cy.intercept('GET', 'https://a.espncdn.com/i/teamlogos/**', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' }, body: stubCrest });
});

describe('a live card painted in the two teams\' colours', () => {
	it('writes each side in the ink its own colour takes', () => {
		cy.mount(<LiveGameCard {...props} game={game(sabres, flyers)} />);
		cy.get('.team-column.is-away .team-abbreviation').should('have.css', 'color', nearBlack);
		cy.get('.team-column.is-home .team-abbreviation').should('have.css', 'color', white);
		cy.get('.game-score-value').first().should('have.css', 'color', nearBlack);
		cy.get('.game-score-value').last().should('have.css', 'color', white);
	});

	it('draws each crest in the variant made for a dark ground', () => {
		cy.mount(<LiveGameCard {...props} game={game(sabres, flyers)} />);
		cy.get('.team-column.is-away .team-crest img').should('have.attr', 'src', 'https://a.espncdn.com/i/teamlogos/nhl/500-dark/scoreboard/buf.png');
		cy.get('.team-column.is-home .team-crest img').should('have.attr', 'src', 'https://a.espncdn.com/i/teamlogos/nhl/500-dark/scoreboard/phi.png');
	});

	// The dark-ground cockerel is white, and so is the side it would be drawn on.
	it('keeps the published crest on a side painted near-white', () => {
		cy.mount(<LiveGameCard {...props} game={game(whiteOnly, flyers)} />);
		cy.get('.team-column.is-away .team-crest img').should('have.attr', 'src', whiteOnly.logo);
	});

	it('falls back to the published crest when there is no dark-ground variant', () => {
		// A URL no earlier test loaded, so the browser cannot answer it from its image cache.
		const uncached = { ...sabres, logo: `${sabres.logo}?case=missing-dark` };
		cy.intercept('GET', '**/500-dark/scoreboard/buf.png?case=missing-dark', { statusCode: 404 });
		cy.mount(<LiveGameCard {...props} game={game(uncached, flyers)} />);
		cy.get('.team-column.is-away .team-crest img').should('have.attr', 'src', uncached.logo);
	});

	it('keeps the meta lines on the colour and only the tab picker on the dark panel', () => {
		cy.mount(<LiveGameCard {...props} game={{ ...game(sabres, flyers), venueName: 'KeyBank Center' }} tabSlot={<div className='game-card-tab-assign'>tabs</div>} />);
		cy.get('.game-meta-venue').should('be.visible').and($venue => expect($venue.closest('.game-card-footer')).to.have.length(0));
		cy.get('.game-card-footer').children().should('have.length', 1).first().should('have.class', 'game-card-tab-assign');
	});

	// The gradient used to tile out under the 1px border, putting a sliver of each team's colour on
	// the other team's edge.
	it('lays the painted surface out to the outer edge of the border', () => {
		cy.mount(<LiveGameCard {...props} game={game(sabres, flyers)} />);
		cy.get('.game-card').should('have.css', 'background-origin').and('match', /^border-box(, border-box)*$/);
	});
});

describe('a final card', () => {
	it('keeps its plain plate and the published crests', () => {
		cy.mount(<FinalGameCard {...props} game={game(sabres, flyers, 'post')} />);
		cy.get('.game-card').should('not.have.class', 'is-team-colored');
		cy.get('.team-column.is-away .team-crest img').should('have.attr', 'src', sabres.logo);
	});
});

// Soccer lists the host first, so a Premier League card draws Brentford on the left and Liverpool on
// the right, in Brentford's ink and colour, while a hockey card keeps the visitor on the left.
describe('the order the two teams are drawn in', () => {
	const brentford = team('BRE', '#F42727', '#0F1C3F', 'https://a.espncdn.com/i/teamlogos/soccer/500/337.png');
	const liverpool = team('LIV', '#00A398', '#FFFFFF', 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png');
	const soccer = (status: Game['status'] = 'in'): Game => ({ ...game(liverpool, brentford, status), league: 'epl', sportType: 'soccer' });

	it('puts the home side on the left for soccer, on every card', () => {
		for (const [Card, status] of [[LiveGameCard, 'in'], [FinalGameCard, 'post']] as const) {
			cy.mount(<Card {...props} game={{ ...soccer(status), homeTeam: { ...brentford, score: 2 }, awayTeam: { ...liverpool, score: 1 } }} />);
			cy.get('.game-card-matchup > .team-column').first().should('have.class', 'is-home').find('.team-abbreviation').should('have.text', 'BRE');
			cy.get('.game-card-matchup > .team-column').last().should('have.class', 'is-away');
			cy.get('.game-score-row .game-score-value').first().should('contain.text', '2');
		}
	});

	it('runs the home colour from the left edge for soccer', () => {
		cy.mount(<LiveGameCard {...props} game={soccer()} />);
		cy.get('.game-card').should('have.css', 'background-image').and('contain', 'linear-gradient(to right, rgb(244, 39, 39) 0%');
	});

	it('keeps the visitor on the left everywhere else', () => {
		cy.mount(<LiveGameCard {...props} game={game(sabres, flyers)} />);
		cy.get('.game-card-matchup > .team-column').first().should('have.class', 'is-away');
	});
});
