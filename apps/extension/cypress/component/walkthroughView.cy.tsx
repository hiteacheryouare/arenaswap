// The steps are mock popups, so they are mounted with the real stylesheets: unstyled, the mock
// crests fall back to their intrinsic 500px and the cards no longer fit the screen they describe.
import WalkthroughView from '../../entrypoints/popup/components/walkthroughView';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

describe('walkthroughView step navigation', () => {
	it('opens on step 1 — toggle', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('Step 1 of 8').should('exist');
		cy.contains('Turning it on & off').should('exist');
	});

	it('advances to step 2 when Next is clicked', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click();
		cy.contains('Step 2 of 8').should('exist');
		cy.contains('Meet PowerScore').should('exist');
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

		cy.get('.powerscore-progress-dot').eq(1).click();
		cy.contains('Closeness').should('exist');
		cy.contains('Scored from the current point margin').should('exist');

		// Signal sub-steps raise a full-bleed bloom over the orbit and its dots on a 150ms + 450ms
		// timer, and the whole overlay is the "tap anywhere to continue" target, so the dots are
		// deliberately unreachable while it is up. Step back off the signal sub-steps and wait for
		// the overlay to go rather than racing the bloom-in timer to the next dot.
		cy.contains('button', 'Back').click();
		cy.get('.ps-bloom-overlay').should('not.exist');

		cy.get('.powerscore-progress-dot').eq(11).click();
		cy.contains('Postseason Boost').should('exist');

		cy.contains('button', 'Back').click();
		cy.contains('Scoring Opportunity').should('exist');
	});

	it('advances to step 3 (tab-assign) after completing step 2', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click();
		}
		cy.contains('Step 3 of 8').should('exist');
		cy.contains('Assign tabs to games').should('exist');
	});

	it('goes back to step 2 from step 3', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Back').click(); // 3 -> 2 (should land on last sub-step of step 2)
		cy.contains('Step 2 of 8').should('exist');
		cy.contains('Postseason Boost').should('exist');
	});

	it('advances to step 4 (auto-switch demo)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.contains('Step 4 of 8').should('exist');
		cy.contains('Watch it work').should('exist');
	});

	it('goes back to step 3 from step 4', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.contains('button', 'Back').click(); // 4 -> 3
		cy.contains('Step 3 of 8').should('exist');
	});

	it('step 4 Next button is disabled until animation completes', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.get('button.btn-primary').last().should('be.disabled');
		cy.tick(2500);
		cy.get('button.btn-primary').last().should('not.be.disabled');
	});

	it('advances to step 5 after step 4 animation', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('Step 5 of 8').should('exist');
		cy.contains('Tune it your way').should('exist');
	});

	it('goes back to step 4 from step 5', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Back').click(); // 5 -> 4
		cy.contains('Step 4 of 8').should('exist');
	});

	it('advances to step 6 (game detail)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('Step 6 of 8').should('exist');
		cy.contains('Dive into any game').should('exist');
	});

	it('goes back to step 5 from step 6', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('button', 'Back').click(); // 6 -> 5
		cy.contains('Step 5 of 8').should('exist');
	});

	it('step 6 tap reveals PowerScore breakdown preview', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('PowerScore Breakdown').should('not.exist');
		cy.get('[role="button"]').first().click(); // tap mock game card
		cy.contains('PowerScore Breakdown').should('exist');
	});

	it('advances to step 7 (leagues & favorites)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('button', 'Next').click(); // 6 -> 7
		cy.contains('Step 7 of 8').should('exist');
		cy.contains('Leagues & favorites').should('exist');
	});

	it('step 7 tab switcher shows leagues and favorites content', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('button', 'Next').click(); // 6 -> 7
		cy.contains('Leagues').should('exist');
		cy.contains('Favorites').should('exist');
		cy.contains('button', 'Favorites').click();
		cy.contains('Philadelphia Eagles').should('exist');
	});

	it('advances to step 8 (re-access tour)', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('button', 'Next').click(); // 6 -> 7
		cy.contains('button', 'Next').click(); // 7 -> 8
		cy.contains('Step 8 of 8').should('exist');
		cy.contains('Coming back here').should('exist');
	});

	// Onboarding has just said "You're all set", so the tour finishes on its own last step.
	it('finishes the tour from step 8 without a second finish screen', () => {
		cy.clock();
		const spy = cy.spy().as('onComplete');
		cy.mount(<WalkthroughView onComplete={spy} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.contains('button', 'Next').click(); // 5 -> 6
		cy.contains('button', 'Next').click(); // 6 -> 7
		cy.contains('button', 'Next').click(); // 7 -> 8
		cy.contains('button', 'Done').click();
		cy.get('@onComplete').should('have.been.calledOnce');
	});
});

describe('walkthroughView settings preview', () => {
	// It showed NFL, NBA, NHL and MLB to someone who had just picked only soccer.
	it('previews the leagues picked in onboarding', () => {
		cy.clock();
		cy.mount(<WalkthroughView onComplete={() => {}} leagues={['epl', 'mls']} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		for (let i = 0; i < 12; i++) {
			cy.get('button.btn-primary').last().click(); // 2 -> 3
		}
		cy.contains('button', 'Next').click(); // 3 -> 4
		cy.tick(2500);
		cy.get('button.btn-primary').last().click(); // 4 -> 5
		cy.get('.badge.text-bg-primary').then(badges => [...badges].map(badge => badge.textContent))
			.should('deep.equal', ['EPL', 'MLS']);
	});
});

describe('walkthroughView skip', () => {
	// The clicked Next unmounts with its step, so focus would otherwise fall to <body>.
	it('hands focus to each new step\'s title', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('button', 'Next').click();
		cy.focused().should('have.attr', 'role', 'heading');
		cy.focused().should('have.text', 'Meet PowerScore');
	});

	it('leaves the tour from any step', () => {
		const spy = cy.spy().as('onComplete');
		cy.mount(<WalkthroughView onComplete={spy} />);
		cy.contains('button', 'Next').click(); // 1 -> 2
		cy.contains('Step 2 of 8').should('exist');
		cy.contains('button', 'Skip tour').click();
		cy.get('@onComplete').should('have.been.calledOnce');
	});

	// The link shares a line with the centred step counter, so every locale's pair is measured.
	it('keeps clear of the step counter in every locale', () => {
		cy.viewport(320, 560);
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.document().its('fonts.ready');
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.walkthrough-skip').then(([skip]: JQuery<HTMLElement>) => {
				const counter = document.querySelector<HTMLElement>('.popup-container > .text-uppercase')!;
				skip.textContent = locale.walkthrough.skipTour;
				counter.textContent = locale.stepToggle.step.replace('$1', '1').replace('$2', '8');
				const text = document.createRange();
				text.selectNodeContents(counter);
				const frame = counter.closest('.popup-container')!.getBoundingClientRect();
				const link = skip.getBoundingClientRect();
				const words = text.getBoundingClientRect();
				expect(link.left, `skip clears the counter in ${name}`).to.be.greaterThan(words.right + 4);
				expect(link.right, `skip stays inside the popup in ${name}`).to.be.at.most(frame.right);
				expect(Math.abs((link.top + link.bottom) / 2 - (words.top + words.bottom) / 2), `skip sits on the counter's line in ${name}`).to.be.lessThan(1);
			});
		});
	});
});

describe('walkthroughView step 1 interactive demo', () => {
	it('shows active status by default', () => {
		cy.mount(<WalkthroughView onComplete={() => {}} />);
		cy.contains('ArenaSwap is active').should('exist');
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
});
