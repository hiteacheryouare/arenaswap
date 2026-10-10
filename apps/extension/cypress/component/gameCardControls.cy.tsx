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
		it(`makes the ${label} card a group named by its matchup`, () => {
			mountInPopup(render(cardProps({ game: game(status) })));
			cy.get('.game-card').should('have.attr', 'role', 'group').and('have.attr', 'aria-label', 'PHI vs BOS');
			cy.get('.game-card').should('not.have.attr', 'tabindex');
			cy.get('.game-card [role="button"]').should('not.exist');
		});
	}

	it('does not hide the score, clock or status from assistive tech behind a button role', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		for (const selector of ['.game-score-row', '.game-clock', '.live-status-label']) {
			cy.get(selector).then($element => {
				expect($element[0]!.closest('[role="button"], [aria-hidden="true"], [inert]'), selector).to.equal(null);
			});
		}
	});

	it('names the PowerScore bar', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('[role="progressbar"]').should('have.attr', 'aria-label', 'PowerScore');
	});
});

const boxes = ($card: JQuery<HTMLElement>) => Array.from($card[0]!.querySelectorAll('*'))
	.filter(element => !element.closest('.game-card-details-button'))
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

	it('draws a 2px ring 2px outside the card when the button is reached by keyboard', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('.game-card-details-button').should('have.css', 'outline-style', 'none');
		cy.get('body').focus();
		cy.press(Cypress.Keyboard.Keys.TAB);
		cy.get('.game-card-details-button').should('have.css', 'outline-style', 'solid')
			.and('have.css', 'outline-width', '2px').and('have.css', 'outline-offset', '2px');
		cy.get('.game-card').then($card => {
			const card = $card[0]!.getBoundingClientRect();
			const button = $card.find('.game-card-details-button')[0]!.getBoundingClientRect();
			expect(JSON.stringify(button)).to.equal(JSON.stringify(card));
		});
	});

	it('never takes a click from the card', () => {
		mountInPopup(<LiveGameCard {...cardProps()} />);
		cy.get('.game-card-details-button').should('have.css', 'pointer-events', 'none');
		cy.get('.game-card').then($card => {
			const box = $card[0]!.getBoundingClientRect();
			const hit = document.elementFromPoint(box.left + (box.width / 2), box.top + (box.height / 2));
			expect(hit?.closest('.game-card-details-button')).to.equal(null);
		});
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
			cy.get('.game-card').should('not.have.class', 'game-card-clickable').and('have.class', 'game-card-lift');
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

	it('keeps the matchup label', () => {
		mountInPopup(<LiveGameCard {...cardProps({ interactive: false })} />);
		cy.get('.game-card').should('have.attr', 'aria-label', 'PHI vs BOS');
	});

	it('keeps the hover lift and shadow but not the pointer cursor', () => {
		mountInPopup(<LiveGameCard {...cardProps({ interactive: false })} />);
		cy.get('.game-card').should('have.css', 'transition-property').and('contain', 'transform');
		cy.get('.game-card').should('not.have.css', 'cursor', 'pointer');
		cy.get('.game-card').then($card => {
			const lift = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules))
				.filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText.includes('.game-card-lift:hover'));
			expect(lift.length, 'a hover rule for .game-card-lift').to.be.greaterThan(0);
			expect(lift[0]!.style.transform).to.equal('translateY(-1px)');
			expect($card).to.have.length(1);
		});
	});
});
