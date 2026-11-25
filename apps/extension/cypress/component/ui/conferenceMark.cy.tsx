import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game } from '@arenaswap/core/types';
import { makeGame } from '../../support/fixtures';

const popupWidth = 320;

const big12: Game = makeGame('byu-utah', {
	league: 'ncaaf',
	sportType: 'football',
	status: 'pre',
	startTime: '2026-11-07T17:00:00Z',
	homeTeam: { id: '254', name: 'Utes', abbreviation: 'UTAH', score: 0, color: '#BE0000', rank: 3 },
	awayTeam: { id: '252', name: 'Cougars', abbreviation: 'BYU', score: 0, color: '#0047BA', rank: 9 },
	conference: { id: '4', shortName: 'Big 12', crestSlug: 'big_12' },
});

const cardProps = {
	excitementResult: undefined,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

const mount = (node: React.ReactNode) => {
	cy.viewport(popupWidth, 600);
	cy.mount(<div style={{ width: `${popupWidth}px` }}>{node}</div>);
};

describe('conference mark', () => {
	it('draws the conference crest on a white tile beside the league', () => {
		mount(<PreGameCard {...cardProps} game={big12} leagueSlot={<span className='game-card-league'>CFB</span>} />);
		cy.get('.game-card-status-row').should('contain.text', 'CFB').and('contain.text', 'Big 12');
		cy.get('.game-card-conference img').should('have.attr', 'src').and('match', /ncaa_conf\/500\/4\.png$/);
		cy.get('.game-card-conference > span:not(.crest)').should('have.class', 'visually-hidden');
		cy.get('.game-card-conference .crest').should('have.attr', 'title', 'Big 12');
	});

	it('uses the light-ground crest on a finished game\'s card', () => {
		mount(<FinalGameCard {...cardProps} game={{ ...big12, status: 'post' }} />);
		cy.get('.game-card-conference img').should('have.attr', 'src').and('match', /ncaa_conf\/500\/4\.png$/);
	});

	it('writes the name out when the crest will not load', () => {
		cy.intercept('GET', '**/ncaa_conf/500/uac.png', { statusCode: 404 });
		mount(<PreGameCard {...cardProps} game={{ ...big12, conference: { id: '99', shortName: 'UAC', crestSlug: 'uac' } }} />);
		cy.get('.game-card-conference .crest').should('have.attr', 'data-crest-state', 'failed');
		cy.get('.game-card-conference > span:not(.crest)').should('not.have.class', 'visually-hidden').and('be.visible').and('have.text', 'UAC');
	});

	it('steps aside when the round name already says it', () => {
		mount(<PreGameCard {...cardProps} game={{ ...big12, postseasonLabel: 'Big 12 Championship' }} />);
		cy.get('.game-card-conference').should('not.exist');
		cy.get('.game-postseason-label').should('have.text', 'Big 12 Championship');
	});

	it('is absent from a non-conference game', () => {
		mount(<PreGameCard {...cardProps} game={{ ...big12, conference: undefined }} />);
		cy.get('.game-card-conference').should('not.exist');
	});
});
