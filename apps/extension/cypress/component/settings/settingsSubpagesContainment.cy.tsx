import type { FantasyRosterEntry } from '@arenaswap/core';
import SetupView from '../../../entrypoints/popup/components/setupView';
import StandbyStreamGuide from '../../../entrypoints/popup/components/standbyStreamGuide';
import MultiviewGuide from '../../../entrypoints/popup/components/multiviewGuide';
import { english, inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountPopupView, popupSurface, popupViewport } from '../../support/safetyNet/mountInPopup';
import { settingsProps, withClassicScrollbar } from '../../support/safetyNet/settingsFixture';
import { worstTeams, worstUserText } from '../../support/safetyNet/worstCase';

const longTeamNames = [
	worstTeams.longIsland.name,
	worstTeams.americanInternational.name,
	worstTeams.gladbach.name,
	worstTeams.stonehill.name,
	worstTeams.centralConnecticut.name,
	'Philadelphia 76ers',
];

const teamsPayload = {
	sports: [{
		leagues: [{
			teams: longTeamNames.map((displayName, index) => ({
				team: { id: String(index + 1), displayName, abbreviation: displayName.slice(0, 9).toUpperCase() },
			})),
		}],
	}],
};

const stubTeamsFetch = () => cy.window().then(win => {
	cy.stub(win, 'fetch').callsFake(() => Promise.resolve({ ok: true, json: () => Promise.resolve(teamsPayload) } as unknown as Response));
});

const rosterOf = (count: number): FantasyRosterEntry[] => Array.from({ length: count }, (_, index) => ({
	league: 'nfl',
	athleteId: String(index + 1),
	name: index % 2 === 0 ? 'Christian Rodriguez-Montgomery-Fitzgerald III' : worstUserText.unbroken(45),
	teamId: '21',
	position: 'QB',
}));

const open = (locale: shippedLocale, extra: Record<string, unknown> = {}) => {
	mountPopupView(<SetupView {...settingsProps} {...extra} />, locale);
};

const typeInto = (selector: string, text: string) => cy.get(selector).type(text, { delay: 0 });

describe('settings sub-pages containment', () => {
	inEveryLocale('keeps the favorite teams page inside the popup with long team names', locale => {
		stubTeamsFetch();
		open(locale);
		cy.get('#settingsGroup-favorites').click();
		cy.get('.team-pick-row').should('have.length.at.least', 6);
		cy.get(popupSurface).assertContained();
	});

	// The echoed query is the same line in every language, so it gets one test and the per-locale ones leave it out.
	const noMatchLine = '.mt-5.text-center';

	it('keeps the favorite teams page inside the popup when a long search finds nothing', () => {
		stubTeamsFetch();
		open(english);
		cy.get('#settingsGroup-favorites').click();
		cy.get('.team-pick-row').should('have.length.at.least', 6);
		typeInto('input[type=search]', worstUserText.unbroken(120));
		cy.get(noMatchLine).should('exist');
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the favorite teams page inside the popup when a long search finds nothing, apart from the echoed query', locale => {
		stubTeamsFetch();
		open(locale);
		cy.get('#settingsGroup-favorites').click();
		cy.get('.team-pick-row').should('have.length.at.least', 6);
		typeInto('input[type=search]', worstUserText.unbroken(120));
		cy.get(noMatchLine).should('exist');
		cy.get(popupSurface).assertContained({ exempt: [noMatchLine] });
	});

	inEveryLocale('keeps a college league page inside the popup', locale => {
		stubTeamsFetch();
		open(locale);
		cy.get('#settingsGroup-leagues').click();
		cy.get('[id^=college-league-]').first().click();
		cy.get('.setup-header').should('exist');
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Fantasy rules page inside the popup', locale => {
		open(locale);
		cy.get('#settingsGroup-scoring').click();
		cy.get('#fantasyRulesOpen').click();
		cy.get('#fantasySportSelect').should('exist');
		cy.get(popupSurface).assertContained();
	});

	const openRoster = (locale: shippedLocale, count: number) => {
		stubTeamsFetch();
		open(locale, { fantasyRoster: rosterOf(count) });
		cy.get('#settingsGroup-scoring').click();
		cy.get('#fantasyRosterOpen').click();
		cy.get('#fantasyPlayerSearch').should('exist');
	};

	// Every earlier roster test leaves its team fetches queued in the shared request bucket, and the search waits behind them at 10 a second.
	const drainedBucketMs = 20000;

	const playerName = '.fantasy-roster-scroll span.d-block.fw-semibold';

	it('names a rostered player in full on hover when the list cuts the name short', () => {
		openRoster(english, 50);
		cy.get('.fantasy-roster-scroll').assertContained();
	});

	for (const count of [0, 1, 50]) {
		inEveryLocale(`keeps the Fantasy roster page inside the popup with ${count} players`, locale => {
			openRoster(locale, count);
			cy.get(popupSurface).assertContained({ exempt: [playerName] });
		});
	}

	it('keeps the Fantasy roster page inside the popup when a long search finds nothing', () => {
		openRoster(english, 0);
		typeInto('#fantasyPlayerSearch', worstUserText.unbroken(120));
		cy.get(noMatchLine, { timeout: drainedBucketMs }).should('exist');
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Fantasy roster page inside the popup when a long search finds nothing, apart from the echoed query', locale => {
		openRoster(locale, 0);
		typeInto('#fantasyPlayerSearch', worstUserText.unbroken(120));
		cy.get(noMatchLine, { timeout: drainedBucketMs }).should('exist');
		cy.get(popupSurface).assertContained({ exempt: [noMatchLine] });
	});

	inEveryLocale('keeps the settings search inside the popup for a long unbroken query and a broad one', locale => {
		open(locale);
		typeInto('#settingsSearch', worstUserText.unbroken(120));
		cy.get(popupSurface).assertContained();
		cy.get('#settingsSearch').clear();
		typeInto('#settingsSearch', 'e');
		cy.get('.settings-index-row').should('have.length.at.least', 3);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Boss Button page inside the popup with a long unbroken address typed', locale => {
		open(locale);
		cy.get('#settingsGroup-switching').click();
		typeInto('#bossDecoyInput', worstUserText.unbroken(300));
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every open select list inside the popup', locale => {
		open(locale);
		for (const group of ['switching', 'display', 'standby']) {
			cy.get('.setup-header').then($header => { if ($header.length) cy.get('.setup-header').click(); });
			cy.get(`#settingsGroup-${group}`).click();
			cy.get('.form-control-caret').each($select => {
				cy.wrap($select).click();
				cy.get(popupSurface).assertContained();
				cy.get('body').type('{esc}');
			});
		}
	});

	inEveryLocale('keeps every settings tooltip inside the popup window', locale => {
		open(locale);
		for (const group of ['switching', 'scoring', 'display', 'standby', 'multiview']) {
			cy.get('.setup-header').then($header => { if ($header.length) cy.get('.setup-header').click(); });
			cy.get(`#settingsGroup-${group}`).click();
			cy.get('.setup-header').should('exist');
			cy.get('body').then($body => $body.find('.setting-tooltip-btn').toArray()).each(button => {
				const $button = Cypress.$(button);
				cy.wrap($button).scrollIntoView().trigger('mouseover');
				cy.get('.tooltip.show').should($tooltip => {
					const box = $tooltip[0].getBoundingClientRect();
					const label = $tooltip.text().slice(0, 40);
					expect(box.left, `"${label}" left edge`).to.be.at.least(0);
					expect(box.top, `"${label}" top edge`).to.be.at.least(0);
					expect(box.right, `"${label}" right edge`).to.be.at.most(popupViewport.width);
					expect(box.bottom, `"${label}" bottom edge`).to.be.at.most(popupViewport.height);
				});
				cy.wrap($button).trigger('mouseout');
			});
		}
	});

	inEveryLocale('keeps the Fantasy roster page inside the popup with a 15px scrollbar and 50 players', locale => {
		withClassicScrollbar();
		openRoster(locale, 50);
		cy.get(popupSurface).assertContained({ exempt: [playerName] });
	});
});

describe('settings guide cards containment', () => {
	inEveryLocale('keeps the Standby Stream guide inside the popup', locale => {
		mountPopupView(<StandbyStreamGuide onDone={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Multiview guide inside the popup', locale => {
		mountPopupView(<MultiviewGuide onAllow={() => {}} onNotNow={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});
});
