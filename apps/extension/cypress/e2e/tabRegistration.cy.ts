import { bullsHeat, eaglesCowboys, liveState, makeScore, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const cardFor = (abbreviation: string) => cy.contains('[data-game]', abbreviation);
const tabPicker = (abbreviation: string) => cardFor(abbreviation).find('.game-card-tab-assign .form-select');
const powerOf = (abbreviation: string) => cardFor(abbreviation).find('.as-power-figure b');

describe('registering a tab and watching the lead change', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState(), tabs: openTabs }));

	it('puts the higher PowerScore on the stage and the lower one in a row', () => {
		cy.get('.as-stage').should('contain.text', sixersThunder.homeTeam.abbreviation);
		powerOf(sixersThunder.homeTeam.abbreviation).should('have.text', '82');
		cy.get('.as-row').should('contain.text', bullsHeat.homeTeam.abbreviation);
		powerOf(bullsHeat.homeTeam.abbreviation).should('have.text', '19');
	});

	it('assigns a tab to a game and tells the background about it', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);

		cy.background().its('registry').should('deep.equal', [
			{ tabId: openTabs[0].id, gameId: sixersThunder.id },
		]);
		// The picker now names the tab the game is on.
		tabPicker(sixersThunder.homeTeam.abbreviation).should('contain.text', 'Tab 1');
	});

	it('keeps one tab from serving two games at once', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);

		cardFor(bullsHeat.homeTeam.abbreviation)
			.find('.game-card-tab-assign')
			.contains('.dropdown-item', openTabs[0].title)
			.should('be.disabled');
	});

	it('releases the tab when the assignment is cleared', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).choose(openTabs[0].title);
		cy.background().its('registry').should('have.length', 1);

		tabPicker(sixersThunder.homeTeam.abbreviation).choose('No tab');
		cy.background().its('registry').should('deep.equal', []);
	});

	// Every game is a stacking context of its own (a pressed tile scales), so the game after it in the
	// list would paint over a menu escaping it. The transform is forced on; what is on top at the
	// menu's centre is then asked of the browser itself.
	it('keeps the open picker above the next game while its own game is pressed', () => {
		cy.document().then(doc => {
			const lift = doc.createElement('style');
			lift.textContent = '.as-stage, .as-tile, .as-row { transform: translateY(-1px); }';
			doc.head.appendChild(lift);
		});
		tabPicker(sixersThunder.homeTeam.abbreviation).click({ scrollBehavior: 'center' });

		cy.get('.dropdown-menu.show').should('be.visible').then($menu => {
			const box = $menu[0]!.getBoundingClientRect();
			const topmost = $menu[0]!.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
			expect($menu[0]!.contains(topmost), 'the menu is what is on top').to.equal(true);
		});
	});

	it('hands the stage to a new leader when the background pushes one', () => {
		cy.get('.as-stage .as-power-figure b').should('have.text', '82');

		// The blowout turns into the close game and the close one cools off.
		cy.pushScores({
			scores: [makeScore(sixersThunder.id, 11), makeScore(bullsHeat.id, 94)],
		});

		cy.get('.as-stage .as-power-figure b').should('have.text', '94');
		cy.get('.as-stage').should('contain.text', bullsHeat.homeTeam.abbreviation);
		powerOf(sixersThunder.homeTeam.abbreviation).should('have.text', '11');
	});

	it('picks up a game that only appears in a later push', () => {
		cy.contains('[data-game]', 'DAL').should('not.exist');

		const current = liveState();
		cy.pushScores({
			games: [...current.games, eaglesCowboys],
			scores: [...current.scores, makeScore(eaglesCowboys.id, 66)],
		});

		cy.contains('[data-game]', 'DAL').should('exist');
		cy.get('.popup-container').scrollTo('bottom');
		cy.contains('[data-game]', 'DAL').should('be.visible');
	});
});

// The background hands a finished game's tab back while the popup is shut, so the toast on the
// next open is the only place the user is told it happened.
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
		cy.contains("Closed 1 finished game's tab.").should('be.visible');
	});

	// Both counts are kept, because the setting can change between two polls.
	it('reports both when the session did both', () => {
		bootWithNotice({ freed: 1, closed: 3 });
		cy.contains('1 tab is yours again.').should('be.visible');
		cy.contains("Closed 3 finished games' tabs.").should('be.visible');
	});

	// It is news rather than state: a second open must not repeat it.
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
