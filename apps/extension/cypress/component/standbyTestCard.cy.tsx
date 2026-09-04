import SetupView from '../../entrypoints/popup/components/setupView';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
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

const base: UserPreferences = { ...createDefaultUserPreferences(), standbyStreamEnabled: true };

const props = {
	prefs: base,
	prefsLoaded: true,
	demoMode: false,
	leagueLogos: {},
	standbyStreamTabId: 1,
	standbyOnboardingDone: true,
	openTabs: [],
	formatTabLabel: () => 'Tab',
	onClose: () => {},
	onSensitivityChange: () => {},
	onCooldownChange: () => {},
	onSwitchDelayChange: () => {},
	onFavoriteTeamBonusChange: () => {},
	onToggleLeague: () => {},
	onToggleSport: () => {},
	onReorderLeague: () => {},
	onResetLeagueOrder: () => {},
	onToggleShowUpcoming: () => {},
	onUpcomingGamesDaysChange: () => {},
	onToggleProTips: () => {},
	onToggleNotifications: () => {},
	onToggleDemo: () => {},
	onToggleStandbyStream: () => {},
	onStandbyThresholdChange: () => {},
	onSetStandbyTab: () => {},
	onStandbyOnboardingDone: () => {},
	onToggleBetting: () => {},
	onToggleTemperatureUnit: () => {},
	onUnlockRomer: () => {},
	onToggleHolidayDecorations: () => {},
	onToggleHolidaySnow: () => {},
	onToggleHolidayLights: () => {},
	onToggleHolidayLeaves: () => {},
	onPostseasonBoostChange: () => {},
	onToggleSignal: () => {},
};

const openStandby = (threshold: number) => {
	cy.viewport(320, 560);
	cy.mount(<SetupView {...props} prefs={{ ...base, standbyStreamThreshold: threshold }} />);
	cy.get('#settingsGroup-standby').click();
};

describe('standby threshold at its limits', () => {
	it('leaves the value as plain text anywhere in the middle', () => {
		openStandby(20);
		cy.get('#standbyThresholdValue').should('exist').and('not.match', 'button');
		cy.get('.stc-overlay').should('not.exist');
	});

	it('goes live at both ends of the slider', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').should('match', 'button');
		openStandby(0);
		cy.get('#standbyThresholdValue').should('match', 'button');
	});

	it('opens the test card at 100 with the copy for that end', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').click();
		cy.get('.stc-overlay').should('exist');
		cy.get('.stc-body').should('contain', 'below 100');
	});

	it('opens the test card at 0 with the copy for that end', () => {
		openStandby(0);
		cy.get('#standbyThresholdValue').click();
		cy.get('.stc-body').should('contain', 'below 0');
	});

	it('draws seven colour bars and their inverted strip', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').click();
		cy.get('.stc-bars').should('have.length', 2);
		cy.get('.stc-bars span').should('have.length', 14);
	});

	it('covers the whole popup', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').click();
		cy.get('.stc-overlay').should(([overlay]: JQuery<HTMLElement>) => {
			const rect = overlay.getBoundingClientRect();
			expect(Math.round(rect.width), 'overlay width').to.equal(320);
			expect(Math.round(rect.height), 'overlay height').to.equal(560);
		});
	});

	it('closes on a click anywhere', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').click();
		cy.get('.stc-overlay').click();
		cy.get('.stc-overlay').should('not.exist');
	});

	it('closes on Escape', () => {
		openStandby(0);
		cy.get('#standbyThresholdValue').click();
		cy.get('body').type('{esc}');
		cy.get('.stc-overlay').should('not.exist');
	});

	// The heading is the one string on the card set in Lekton at a fixed size, so it is the one with
	// no room to grow into. The body copy is free to wrap.
	it('keeps every locale\'s heading on one line', () => {
		openStandby(100);
		cy.get('#standbyThresholdValue').click();
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.stc-heading').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.standbyTestCard.heading;
				expect(el.scrollWidth, `heading fits in ${name}`).to.be.at.most(el.clientWidth);
			});
		});
	});
});
