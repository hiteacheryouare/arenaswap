// The steps are mock popups, so they are mounted with the real stylesheets: the board components
// only look like the Games screen they describe with the real CSS behind them.
import WalkthroughView from '../../entrypoints/popup/components/walkthroughView';

const next = () => cy.get('.ob-foot button.btn-primary').click();

// Step 2 has twelve sub-steps; its Next walks every one of them before handing on to step 3.
const throughPowerScore = () => {
	for (let i = 0; i < 12; i++) {
		cy.get('button.btn-primary').last().click();
	}
};

// Needs cy.clock(): step 4 keeps Next disabled until its switch has played out.
const toStep = (step: number) => {
	if (step >= 2) next(); // 1 -> 2
	if (step >= 3) throughPowerScore(); // 2 -> 3
	if (step >= 4) next(); // 3 -> 4
	if (step >= 5) {
		cy.tick(2500);
		next(); // 4 -> 5
	}
	for (let current = 5; current < Math.min(step, 9); current++) next();
};

const progressShows = (done: number) => {
	cy.get('.ob-progress i').should('have.length', 8);
	cy.get('.ob-progress i.is-done').should('have.length', done);
};

describe('walkthroughView step navigation', () => {
	it('opens on step 1 — toggle', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('Step 1 of 8').should('exist');
		cy.contains('Turning it on & off').should('exist');
		progressShows(1);
		cy.contains('button', 'Back').should('not.exist');
	});

	it('advances to step 2 when Next is clicked', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click();
		cy.contains('Step 2 of 8').should('exist');
		cy.contains('Meet PowerScore').should('exist');
		progressShows(2);
	});

	it('goes back to step 1 from step 2', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		cy.contains('button', 'Back').click(); // 2 -> 1
		cy.contains('Step 1 of 8').should('exist');
	});

	it('navigates through step 2 PowerScore sub-steps and progress dots', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		cy.contains('Explore Formula').should('exist');
		cy.get('.powerscore-progress-dot').should('have.length', 12);
		cy.get('.powerscore-progress-dot').eq(0).should('have.attr', 'aria-current', 'step');

		cy.get('.powerscore-progress-dot').eq(1).click();
		cy.contains('Closeness').should('exist');
		cy.contains('Scored from the current point margin').should('exist');
		cy.get('.powerscore-progress-dot').eq(1).should('have.attr', 'aria-current', 'step');

		// Signal sub-steps raise a bloom over the orbit and its dots on a 150ms + 450ms timer, and the
		// whole bloom is the "tap anywhere to continue" target, so the dots are deliberately out of
		// reach while it is up. Back and Next sit below it and stay reachable.
		cy.contains('button', 'Back').click();
		cy.get('.ps-bloom-overlay').should('not.exist');

		cy.get('.powerscore-progress-dot').eq(11).click();
		cy.contains('Postseason Boost').should('exist');

		cy.contains('button', 'Back').click();
		cy.contains('Scoring opportunity').should('exist');
	});

	it('advances a signal from a tap on its bloom', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		cy.get('.powerscore-progress-dot').eq(1).click();
		cy.get('.ps-bloom-overlay').should('have.class', 'ps-bloom-visible').click();
		cy.get('.powerscore-progress-dot').eq(2).should('have.attr', 'aria-current', 'step');
		cy.get('.ps-bloom-overlay').should('contain.text', 'Late-game');
	});

	it('keeps Back and Next clear of the bloom', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		cy.get('.powerscore-progress-dot').eq(1).click();
		cy.get('.ps-bloom-overlay').should('have.class', 'ps-bloom-visible').then($bloom => {
			const bloomBottom = $bloom[0]!.getBoundingClientRect().bottom;
			cy.get('.ob-foot .btn').each($button => {
				expect($button[0]!.getBoundingClientRect().top).to.be.greaterThan(bloomBottom);
			});
		});
	});

	it('advances to step 3 (tab-assign) after completing step 2', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		throughPowerScore();
		cy.contains('Step 3 of 8').should('exist');
		cy.contains('Assign tabs to games').should('exist');
		progressShows(3);
	});

	it('goes back to step 2 from step 3', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		throughPowerScore(); // 2 -> 3
		cy.contains('button', 'Back').click(); // 3 -> 2 (should land on last sub-step of step 2)
		cy.contains('Step 2 of 8').should('exist');
		cy.contains('Postseason Boost').should('exist');
	});

	it('advances to step 4 (auto-switch demo)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(4);
		cy.contains('Step 4 of 8').should('exist');
		cy.contains('Watch it work').should('exist');
	});

	it('goes back to step 3 from step 4', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(4);
		cy.contains('button', 'Back').click(); // 4 -> 3
		cy.contains('Step 3 of 8').should('exist');
	});

	it('step 4 Next button is disabled until animation completes', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(4);
		cy.get('button.btn-primary').last().should('be.disabled');
		cy.tick(2500);
		cy.get('button.btn-primary').last().should('not.be.disabled');
	});

	it('advances to step 5 after step 4 animation', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(5);
		cy.contains('Step 5 of 8').should('exist');
		cy.contains('Tune it your way').should('exist');
	});

	it('goes back to step 4 from step 5', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(5);
		cy.contains('button', 'Back').click(); // 5 -> 4
		cy.contains('Step 4 of 8').should('exist');
	});

	it('advances to step 6 (game detail)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(6);
		cy.contains('Step 6 of 8').should('exist');
		cy.contains('Dive into any game').should('exist');
	});

	it('goes back to step 5 from step 6', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(6);
		cy.contains('button', 'Back').click(); // 6 -> 5
		cy.contains('Step 5 of 8').should('exist');
	});

	it('step 6 tap reveals PowerScore breakdown preview', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(6);
		cy.contains('PowerScore Breakdown').should('not.exist');
		cy.get('[role="button"]').first().click(); // tap mock game card
		cy.contains('PowerScore Breakdown').should('exist');
	});

	it('advances to step 7 (leagues & favorites)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(7);
		cy.contains('Step 7 of 8').should('exist');
		cy.contains('Leagues & favorites').should('exist');
	});

	it('step 7 tab switcher shows leagues and favorites content', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(7);
		cy.contains('Leagues').should('exist');
		cy.contains('Favorites').should('exist');
		cy.contains('button', 'Favorites').click();
		cy.contains('Philadelphia Eagles').should('exist');
	});

	it('advances to step 8 (re-access tour)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(8);
		cy.contains('Step 8 of 8').should('exist');
		cy.contains('Coming back here').should('exist');
		progressShows(8);
	});

	it('shows done screen after completing all 8 steps', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(8);
		cy.contains('button', 'Done').click(); // 8 -> done
		cy.contains('All set!').should('exist');
		progressShows(8);
	});

	it('calls onComplete when the done screen button is clicked', () => {
		cy.clock();
		const spy = cy.spy().as('onComplete');
		cy.mount(<WalkthroughView onComplete={spy} />);
		toStep(8);
		cy.contains('button', 'Done').click(); // 8 -> done
		cy.contains("Let's go").click();
		cy.get('@onComplete').should('have.been.called');
	});
});

describe('walkthroughView step 1 interactive demo', () => {
	it('shows active status by default', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('ArenaSwap is active').should('exist');
		cy.get('#wt-toggle-demo').should('be.checked');
	});

	it('toggles to paused when the demo checkbox is unchecked', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.get('#wt-toggle-demo').uncheck();
		cy.contains('Auto-switching paused').should('exist');
	});

	it('toggles back to active when re-checked', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.get('#wt-toggle-demo').uncheck();
		cy.get('#wt-toggle-demo').check();
		cy.contains('ArenaSwap is active').should('exist');
	});

	it('draws the real header, with only the switch live', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.get('.wt-screen .popup-header svg[aria-label="ArenaSwap"]').should('exist');
		cy.get('.wt-screen .popup-tools button').should('have.length', 3).each($button => cy.wrap($button).should('be.disabled'));
		cy.get('#wt-toggle-demo').should('not.be.disabled');
	});
});

describe('walkthroughView board demos', () => {
	it('links a tab from the picker on the step 3 game', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		next(); // 1 -> 2
		throughPowerScore(); // 2 -> 3
		cy.get('.wt-assign .as-row').should('exist');
		cy.get('.wt-assign .form-select').should('contain.text', 'Assign a tab').click();
		cy.get('.wt-assign .dropdown-item').contains('youtube.com/watch?v=Philly_stream').click();
		cy.get('.wt-assign .form-select .select-field-hint').should('have.text', 'Tab 1');
		cy.contains('link a browser tab here').should('exist');
	});

	it('moves the hotter game onto the stage and then switches to it', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(4);
		cy.get('.wt-board .as-stage').should('have.attr', 'data-game', 'tour-phi-nyg').and('contain.text', 'Watching, Tab 1');
		cy.get('.wt-board .as-row').should('have.attr', 'data-game', 'tour-phi-bos');
		cy.contains('watching the Eagles game...').should('exist');

		cy.tick(800);
		cy.get('.wt-board .as-stage').should('have.attr', 'data-game', 'tour-phi-bos').and('contain.text', 'Switching to Tab 2');
		cy.get('.wt-board .as-row').should('have.class', 'is-watched').and('contain.text', 'Watching, Tab 1');

		cy.tick(1000);
		cy.get('.wt-board .as-stage').should('contain.text', 'Watching, Tab 2');
		cy.get('.wt-board .as-row').should('not.have.class', 'is-watched');

		cy.tick(400);
		cy.contains('Did you see that?').should('exist');
	});

	it('shows a Ludicrous Speed sensitivity at the top of the step 5 slider', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(5);
		cy.get('#wt-sensitivity').should('have.value', '4');
		cy.contains('output', 'Balanced').should('exist');
		// React tracks the value it last rendered, so the change has to come through the native setter.
		cy.get('#wt-sensitivity').then($range => {
			const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
			setValue.call($range[0], '7');
			$range[0]!.dispatchEvent(new Event('input', { bubbles: true }));
		});
		cy.get('output.ludicrous-speed').should('have.text', 'Ludicrous Speed');
	});

	it('opens the step 6 game as its detail screen and comes back', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(6);
		cy.contains('tap to open').should('exist');
		cy.get('.wt-stage[role="button"]').focus().trigger('keydown', { key: 'Enter' });
		cy.get('.wt-hero').should('contain.text', 'Eagles').and('contain.text', 'Giants');
		cy.get('.wt-signal').should('have.length', 5);
		cy.contains('manual Game Boost').should('exist');

		cy.get('[aria-label="Back to games"]').click();
		cy.get('.wt-stage[role="button"]').should('exist');
		cy.contains('PowerScore Breakdown').should('not.exist');
	});

	it('flips a step 7 league and announces the favorite bonus once a team is starred', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(7);
		cy.get('[aria-label="Toggle NHL"]').should('not.be.checked').click().should('be.checked');

		cy.contains('button', 'Favorites').click().should('have.attr', 'aria-selected', 'true');
		cy.contains('Favorite teams active').should('not.exist');
		cy.get('[aria-label="Star Kansas City Chiefs"]').click();
		cy.get('[aria-label="Unstar Kansas City Chiefs"]').should('have.attr', 'aria-pressed', 'true');
		cy.contains('Favorite teams active').should('exist');
	});

	it('points at the tour button on step 8', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		toStep(8);
		cy.contains('.wt-callout', "that's the one").then($callout => {
			const callout = $callout[0]!.getBoundingClientRect();
			cy.get('.wt-reaccess .popup-tools > :nth-child(2)').should('have.attr', 'aria-label', 'Tour').then($tour => {
				const tour = $tour[0]!.getBoundingClientRect();
				expect(Math.abs((callout.left + callout.width / 2) - (tour.left + tour.width / 2))).to.be.lessThan(1);
			});
		});
	});
});
