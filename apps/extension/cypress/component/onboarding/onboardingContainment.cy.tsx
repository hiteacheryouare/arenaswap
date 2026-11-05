import OnboardingView from '../../../entrypoints/popup/components/onboardingView';
import WalkthroughView from '../../../entrypoints/popup/components/walkthroughView';
import { inEveryLocale, withLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { popupSurface, popupViewport } from '../../support/safetyNet/mountInPopup';
import { worstTeams } from '../../support/safetyNet/worstCase';

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

const mountView = (locale: shippedLocale, view: React.ReactElement) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	cy.mount(withLocale(locale, view));
};

const primaryButton = '.btn-solid.theme-primary:not(:disabled)';

describe('onboarding containment', () => {
	inEveryLocale('keeps every onboarding step inside the popup', locale => {
		stubTeamsFetch();
		mountView(locale, <OnboardingView leagueLogos={{}} onComplete={() => {}} onStartWalkthrough={() => {}} />);
		cy.get(popupSurface).assertContained();
		cy.get(primaryButton).click();
		cy.get('#onb-league-nba').should('exist');
		cy.get(popupSurface).assertContained();
		cy.get(primaryButton).click();
		cy.get('.team-pick-row').should('have.length.at.least', longTeamNames.length);
		cy.get('.team-pick-row:lt(8)').each($row => cy.wrap($row).click());
		cy.get(popupSurface).assertContained();
		cy.get(primaryButton).click();
		cy.get('.onb-content-wrap').should('exist');
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every walkthrough step inside the popup', locale => {
		const onComplete = cy.stub().as('onComplete');
		mountView(locale, <WalkthroughView onComplete={onComplete} leagues={['nba', 'nfl', 'nhl', 'mlb']} scoringMode='classic' />);
		const walk = (remaining: number): void => {
			cy.get(popupSurface).assertContained();
			if (remaining === 0) return;
			cy.get('body').then($body => {
				if (onComplete.called) return;
				cy.get(primaryButton).last().click();
				cy.wait(150);
				walk(remaining - 1);
			});
		};
		walk(40);
		cy.get('@onComplete').should('have.been.called');
	});
});
