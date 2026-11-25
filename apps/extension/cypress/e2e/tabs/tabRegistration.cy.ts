import { bullsHeat, eaglesCowboys, liveState, makeScore, onboardedPrefs, openTabs, sixersThunder } from '../../support/fixtures';
import en from '../../../locales/en.json';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const cardFor = (abbreviation: string) => cy.contains('.game-card', abbreviation);
const tabPicker = (abbreviation: string) => cardFor(abbreviation).find('.game-card-tab-assign .form-control-caret');
const skipOpeningReveal = () => cy.get('body').trigger('pointerdown');

describe('registering a tab and watching the lead change', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState(), tabs: openTabs }));

	it('orders the list by PowerScore, highest first', () => {
		cy.get('.game-card-ps-score').should('have.length', 2);
		cy.get('.game-card-ps-score').first().should('have.text', '82 / 100');
		cy.get('.game-card-ps-score').last().should('have.text', '19 / 100');
	});

	it('assigns a tab to a game and tells the background about it', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);

		cy.background().its('registry').should('deep.equal', [
			{ tabId: openTabs[0].id, gameId: sixersThunder.id },
		]);
		cy.contains('.popup-section-title', 'Active Tabs').should('be.visible');
	});

	it('keeps one tab from serving two games at once', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);

		cardFor(bullsHeat.homeTeam.abbreviation)
			.find('.game-card-tab-assign')
			.contains('.menu-item', openTabs[0].title)
			.should('be.disabled');
	});

	it('releases the tab when the assignment is cleared', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);
		cy.background().its('registry').should('have.length', 1);

		tabPicker(sixersThunder.homeTeam.abbreviation).choose(en.tabAssign.placeholder);
		cy.background().its('registry').should('deep.equal', []);
	});

	it('keeps the open picker above the next card while its own card is hovered', () => {
		cy.document().then(doc => {
			const lift = doc.createElement('style');
			lift.textContent = '.game-card-clickable { transform: translateY(-1px); }';
			doc.head.appendChild(lift);
		});
		tabPicker(sixersThunder.homeTeam.abbreviation).click();

		cy.get('.menu.show').should('be.visible').then($menu => {
			const box = $menu[0]!.getBoundingClientRect();
			const topmost = $menu[0]!.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
			expect($menu[0]!.contains(topmost), 'the menu is what is on top').to.equal(true);
		});
	});

	it('re-sorts live when the background pushes a new leader', () => {
		cy.get('.game-card-ps-score').first().should('have.text', '82 / 100');
		skipOpeningReveal();

		cy.pushScores({
			scores: [makeScore(sixersThunder.id, 11), makeScore(bullsHeat.id, 94)],
		});

		cy.get('.game-card-ps-score').first().should('have.text', '94 / 100');
		cy.contains('.game-card', bullsHeat.homeTeam.abbreviation)
			.find('.game-card-ps-score').should('have.text', '94 / 100');
	});

	it('picks up a game that only appears in a later push', () => {
		cy.contains('.game-card', 'DAL').should('not.exist');

		const current = liveState();
		cy.pushScores({
			games: [...current.games, eaglesCowboys],
			scores: [...current.scores, makeScore(eaglesCowboys.id, 66)],
		});

		cy.contains('.game-card', 'DAL').should('exist');
		cy.get('.popup-container').scrollTo('bottom');
		cy.contains('.game-card', 'DAL').should('be.visible');
	});
});

const bootWithNotice = (finishedTabNotice: unknown) => cy.openPopup({
	local: { onboardingCompleted: true },
	sync: { prefs: onboardedPrefs() },
	session: { finishedTabNotice },
});

describe('the report on tabs handed back', () => {
	it('reports the tabs that were freed', () => {
		bootWithNotice({ freed: 2, closed: 0 });
		cy.contains('2 tabs are yours again.').should('be.visible');
	});

	it('reports the tabs that were closed, in the singular', () => {
		bootWithNotice({ freed: 0, closed: 1 });
		cy.contains('Closed the tab for 1 finished game.').should('be.visible');
	});

	it('reports both when the session did both', () => {
		bootWithNotice({ freed: 1, closed: 3 });
		cy.contains('1 tab is yours again.').should('be.visible');
		cy.contains('Closed the tabs for 3 finished games.').should('be.visible');
	});

	it('clears the notice once it has been shown', () => {
		bootWithNotice({ freed: 2, closed: 0 });
		cy.contains('2 tabs are yours again.').should('be.visible');
		cy.background().its('storage.session').should(store => {
			expect((store as Map<string, unknown>).has('finishedTabNotice')).to.equal(false);
		});
	});

	it('says nothing when nothing was handed back', () => {
		bootWithNotice(null);
		cy.get('.toast').should('not.exist');
	});
});
