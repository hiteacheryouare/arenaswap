import { revealFullRate, revealOpenMs, revealSettleMs } from '../../entrypoints/popup/cardReveal';
import { liveState, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

// A tricode on a live card is under the open animation for as long as the animation runs, and on a
// first open of the day — which every spec here is, since Cypress clears `localStorage` between
// tests — that is the whole of the long cut. The poster does not put the lettering up until 3991ms
// in, so the default 4s retry budget was a coin flip on it and lost the moment the beats ahead of the
// poster grew. Taken off `revealSettleMs` rather than written down, because this is the third pass to
// move that figure.
const revealClear = revealSettleMs('full') + 2000;

// And the frame the wipe bars are actually over the card on, which is the middle of the pass: the
// poster puts it 1500ms in and it runs for 1000, so this is 500ms into it. Derived for the same
// reason — written as a flat 2000 and then 3000, it has twice ended up naming a frame where every bar
// was still parked off the card, which is the one state this spec must not measure.

describe('popup boots', () => {
	it('serves the built bundle with styles, fonts and translations', () => {
		cy.openPopup();

		// Translated, not a raw messages.json key — proves browser.i18n is wired.
		cy.contains('Welcome to ArenaSwap').should('be.visible');
		cy.get('body').should('have.css', 'background-color', 'rgb(13, 17, 23)');
		cy.get('body').should('have.css', 'font-family').and('contain', 'DM Sans');
		cy.background().its('sent').should('deep.include', { type: 'GET_STATE', forceRefresh: false });
	});

	it('renders games out of the fake background once onboarding is stored', () => {
		cy.openPopup({
			state: liveState(),
			tabs: openTabs,
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.contains('Welcome to ArenaSwap').should('not.exist');
		cy.contains(sixersThunder.homeTeam.abbreviation, { timeout: revealClear }).should('be.visible');
	});

	// The frame is 320px wide and nothing in it is ever meant to move sideways, but two of the things
	// that animate at open reach outside it: the view shell arrives on `translateX(14px)`, and the
	// reveal parks its wipe bars a bar width and a lean clear of the card's right edge. A transform
	// and an absolutely positioned box both count towards scrollable overflow, so between them the
	// popup could be dragged 29px to the right for the length of the open animation. Measured here
	// rather than in a component test because the thing that scrolls is the popup's own frame.
	it('never scrolls sideways while the open animation plays', () => {
		cy.openPopup({
			state: liveState(),
			tabs: openTabs,
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		// The first frame, where the shell is still sliding in and every bar is parked off the card.
		cy.get('.game-card-reveal').should('exist');
		cy.document().should(doc => {
			expect(doc.documentElement.scrollWidth, 'scroll width at the first frame')
				.to.be.at.most(doc.documentElement.clientWidth);
		});
		// And mid-pass, where the bars are over the card and the crests are at their largest.
		cy.wait(revealOpenMs('full') + (1500 + 500) * revealFullRate);
		cy.document().should(doc => {
			expect(doc.documentElement.scrollWidth, 'scroll width mid-sweep')
				.to.be.at.most(doc.documentElement.clientWidth);
			// The clip is on one axis, and stays that way: a popup that cannot be scrolled down is a
			// worse bug than the one above. Asserted on the axis rather than on scroll height,
			// because a two-game slate fits the frame and would pass by having nothing to scroll.
			const root = doc.querySelector('.popup-root')!;
			expect(getComputedStyle(root).overflowX, 'x axis').to.equal('clip');
			expect(getComputedStyle(root).overflowY, 'y axis').to.equal('visible');
		});
	});

	it('delivers a live score push to the running popup', () => {
		cy.openPopup({
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.contains(sixersThunder.homeTeam.abbreviation).should('not.exist');
		cy.pushScores(liveState());
		cy.contains(sixersThunder.homeTeam.abbreviation, { timeout: revealClear }).should('be.visible');
	});
});
