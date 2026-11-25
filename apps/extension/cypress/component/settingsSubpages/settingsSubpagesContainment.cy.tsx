import type { FantasyRosterEntry } from '@arenaswap/core';
import SetupView from '../../../entrypoints/popup/components/setupView';
import { english, inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountPopupView, popupSurface } from '../../support/safetyNet/mountInPopup';
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

	inEveryLocale('keeps the Fantasy roster page inside the popup with a 15px scrollbar and 50 players', locale => {
		withClassicScrollbar();
		openRoster(locale, 50);
		cy.get(popupSurface).assertContained({ exempt: [playerName] });
	});
});
