import './commands';
import type { BackgroundState } from '@arenaswap/core/types';
import { installFakeBrowser, type fakeBackground, type fakeBrowserOptions } from './fakeBrowser';

export type openPopupOptions = Omit<fakeBrowserOptions, 'messages'>;

// A 1x1 transparent PNG. Crests and league logos point at a.espncdn.com, and a real fetch would
// make every spec depend on ESPN being up and on the network being fast enough to beat a timeout.
const blankPng = Cypress.Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
);

const popupSize = { width: 320, height: 560 };

export const teamsByLeague: Record<string, [string, string][]> = {
	nba: [['20', 'Philadelphia 76ers'], ['25', 'Oklahoma City Thunder'], ['4', 'Chicago Bulls']],
	nfl: [['21', 'Philadelphia Eagles'], ['6', 'Dallas Cowboys']],
	nhl: [['15', 'Philadelphia Flyers']],
	mlb: [['22', 'Philadelphia Phillies']],
};

// ESPN's /teams envelope, trimmed to the fields fetchTeamsForLeagues reads.
const teamsEnvelope = (entries: [string, string][]) => ({
	sports: [{
		leagues: [{
			teams: entries.map(([id, displayName]) => ({
				team: { id, displayName, abbreviation: displayName.slice(0, 3).toUpperCase() },
			})),
		}],
	}],
});

Cypress.Commands.add('openPopup', (options: openPopupOptions = {}) => {
	cy.viewport(popupSize.width, popupSize.height);

	cy.intercept({ hostname: 'a.espncdn.com' }, { statusCode: 200, headers: { 'content-type': 'image/png' }, body: blankPng });

	cy.intercept({ hostname: 'site.api.espn.com' }, { statusCode: 200, body: {} }).as('espnApi');

	// The onboarding team picker calls ESPN's /teams directly rather than going through the
	// background, so it is the one screen that needs a real payload rather than a blanket stub.
	cy.intercept({ hostname: 'site.api.espn.com', pathname: /\/teams$/ }, request => {
		const league = Object.keys(teamsByLeague).find(id => request.url.includes(`/${id}/`));
		request.reply({ statusCode: 200, body: teamsEnvelope(league ? teamsByLeague[league] : []) });
	}).as('espnTeams');

	// The built catalog, not locales/en.json: `wxt build` flattens the keys (dots → underscores)
	// and that flattened form is what the shipped bundle asks browser.i18n for.
	cy.request('/_locales/en/messages.json').its('body').then((messages: fakeBrowserOptions['messages']) => {
		// onBeforeLoad runs inside cy.visit's own command, so the handle is stashed here and
		// aliased afterwards: queuing a cy command from in there deadlocks the command queue.
		let background: fakeBackground | null = null;
		cy.visit('/popup.html', {
			onBeforeLoad: win => { background = installFakeBrowser(win, { ...options, messages }); },
		});
		cy.then(() => cy.wrap(background, { log: false }).as('background'));
	});
});

Cypress.Commands.add('background', () => cy.get<fakeBackground>('@background'));

Cypress.Commands.add('pushScores', (patch: Partial<BackgroundState> = {}) => {
	cy.get<fakeBackground>('@background').then(background => { background.pushScores(patch); });
});

declare global {
	namespace Cypress {
		interface Chainable {
			/** Boots the built popup at extension size against an in-memory background. */
			openPopup: (options?: openPopupOptions) => Chainable<void>;
			/** The in-memory background the popup is talking to. */
			background: () => Chainable<fakeBackground>;
			/** Fires SCORES_UPDATED the way the real background worker does. */
			pushScores: (patch?: Partial<BackgroundState>) => Chainable<void>;
		}
	}
}
