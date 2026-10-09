import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import ExtLiveGameCard from '../../entrypoints/popup/components/liveGameCard';

const popupWidth = 320;

const game = (status: Game['status']): Game => ({
	id: 'g1',
	status,
	league: 'nba',
	sportType: 'basketball',
	period: status === 'post' ? 4 : 2,
	clockSeconds: 300,
	startTime: '2026-10-12T00:00:00.000Z',
	venueName: 'TD Garden',
	odds: { details: 'BOS -3.5', overUnder: 221.5, provider: { name: 'Our Sources' } },
	homeTeam: { id: 'h', name: 'Boston Celtics', abbreviation: 'BOS', score: 50, color: '#007A33' },
	awayTeam: { id: 'a', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 48, color: '#006BB6' },
});

const result: PowerScoreResult = {
	gameId: 'g1', total: 42, closeness: 10, lateGame: 8, momentum: 6,
	leadChanges: 4, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0,
	stalled: false, reason: 'Close game',
};

const tabs = [{ id: 11, title: 'Game on the big screen', url: 'https://example.com/a' }] as any[];

const cardProps = (overrides: Partial<GameCardDisplayProps> = {}): GameCardDisplayProps => ({
	game: game('in'),
	excitementResult: result,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: cy.stub().as('toggleFavorite'),
	onOpenGameDetail: cy.stub().as('openDetail'),
	bettingPrefs: { bettingEnabled: true },
	...overrides,
});

const mountInPopup = (card: React.ReactNode) => {
	cy.viewport(popupWidth, 600);
	cy.mount(<div style={{ width: `${popupWidth}px` }}>{card}</div>);
	cy.document().its('fonts.ready');
};

const mountExtensionCard = (overrides: Partial<GameCardDisplayProps> = {}) => {
	mountInPopup(
		<ExtLiveGameCard
			{...cardProps(overrides)}
			openTabs={tabs}
			registry={[]}
			onRegistryChange={cy.stub().as('registryChange')}
			formatTabLabel={tab => tab.title ?? ''}
		/>,
	);
};

const kinds = [
	['live', (props: GameCardDisplayProps) => <LiveGameCard {...props} />, 'in'],
	['pre-game', (props: GameCardDisplayProps) => <PreGameCard {...props} />, 'pre'],
	['final', (props: GameCardDisplayProps) => <FinalGameCard {...props} />, 'post'],
] as const;

describe('game card is a group, not a button', () => {
	for (const [label, render, status] of kinds) {
		it(`labels the ${label} card with its matchup and keeps its text readable`, () => {
			mountInPopup(render(cardProps({ game: game(status) })));
			cy.get('.game-card').should('have.attr', 'role', 'group').and('have.attr', 'aria-label', 'PHI vs BOS');
			cy.get('.game-card').should('not.have.attr', 'tabindex');
			cy.get('.game-card [role="button"]').should('not.exist');
		});
	}

	it('leaves the live card scores, clock and status in the accessibility tree', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('.game-card').should('contain.text', '48').and('contain.text', '50')
			.and('contain.text', '5:00').and('contain.text', 'LIVE');
	});
});

const boxes = ($card: JQuery<HTMLElement>) => Array.from($card[0]!.querySelectorAll('*'))
	.filter(element => !element.classList.contains('game-card-details-button'))
	.map(element => JSON.stringify(element.getBoundingClientRect()));

describe('the details button', () => {
	for (const [label, render, status] of kinds) {
		it(`opens the ${label} card's details on click and from the keyboard`, () => {
			mountInPopup(render(cardProps({ game: game(status) })));
			cy.contains('button', 'Open details for PHI vs BOS').as('details');
			cy.get('@details').click({ force: true });
			cy.get('@openDetail').should('have.been.calledOnceWith', 'g1');
			cy.get('@details').focus();
			cy.press(Cypress.Keyboard.Keys.SPACE);
			cy.get('@openDetail').should('have.been.calledTwice');
		});
	}

	it('is the first Tab stop, with the stars and the tab picker after it', () => {
		mountExtensionCard();
		cy.get('body').focus();
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.focused().should('have.class', 'game-card-details-button');
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.focused().should('have.attr', 'data-team-star');
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.focused().should('have.attr', 'data-team-star');
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.focused().should('have.class', 'game-meta-attribution');
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.focused().should('have.class', 'form-select');
	});

	it('still opens details when the card is clicked anywhere that is not a control', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('.game-score-row').click();
		cy.get('@openDetail').should('have.been.calledOnceWith', 'g1');
	});

	it('draws the card focus ring when the button is reached by keyboard', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('.game-card').should('have.css', 'outline-style', 'none');
		cy.get('body').focus();
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.get('.game-card').should('have.css', 'outline-style', 'solid').and('have.css', 'outline-width', '2px');
	});

	it('moves nothing in the card', () => {
		mountExtensionCard();
		cy.get('.game-card').then($card => {
			const before = boxes($card);
			$card.find('.game-card-details-button').remove();
			expect(boxes($card)).to.deep.equal(before);
			expect($card[0]!.getBoundingClientRect().height).to.be.greaterThan(100);
		});
	});
});

describe('controls inside the card', () => {
	it('can each be focused on their own', () => {
		mountExtensionCard();
		cy.get('[data-team-star]').each($star => {
			cy.wrap($star).focus().should('have.focus');
		});
		cy.get('.game-meta-attribution').focus().should('have.focus');
		cy.get('.game-card-tab-assign button.form-select').focus().should('have.focus');
	});

	it('do not open details when clicked', () => {
		mountExtensionCard();
		cy.get('[data-team-star]').first().click();
		cy.get('@toggleFavorite').should('have.been.calledOnceWith', 'nba', 'a');
		cy.get('.game-card-tab-assign button.form-select').click();
		cy.contains('.dropdown-item', 'Game on the big screen').click();
		cy.get('@registryChange').should('have.been.calledOnce');
		cy.get('.game-meta-attribution').click();
		cy.get('@openDetail').should('not.have.been.called');
	});

	it('do not open details when Space is pressed on them', () => {
		mountExtensionCard();
		cy.get('[data-team-star]').first().focus();
		cy.press(Cypress.Keyboard.Keys.SPACE);
		cy.get('@toggleFavorite').should('have.been.calledOnce');
		cy.get('@openDetail').should('not.have.been.called');
	});
});

describe('interactive={false}', () => {
	for (const [label, render, status] of kinds) {
		it(`leaves nothing to focus on the ${label} card`, () => {
			mountInPopup(render(cardProps({ game: game(status), interactive: false })));
			cy.get('.game-card-details-button').should('not.exist');
			cy.get('.game-card').should('not.have.class', 'game-card-clickable');
			cy.get('.game-card').then($card => {
				const candidates = $card[0]!.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]');
				candidates.forEach(element => {
					element.focus();
					expect(document.activeElement, `${element.outerHTML.slice(0, 60)} takes focus`).not.to.equal(element);
				});
			});
		});
	}

	it('ignores a click on the card', () => {
		mountInPopup(<LiveGameCard {...cardProps({ interactive: false })} />);
		cy.get('.game-score-row').click();
		cy.get('@openDetail').should('not.have.been.called');
	});

	it('keeps the matchup label and the readable text', () => {
		mountInPopup(<LiveGameCard {...cardProps({ interactive: false })} />);
		cy.get('.game-card').should('have.attr', 'aria-label', 'PHI vs BOS').and('contain.text', '48');
	});
});
