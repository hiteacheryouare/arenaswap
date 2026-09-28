import SetupView from '../../entrypoints/popup/components/setupView';
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

const defaultPrefs: UserPreferences = {
	sensitivity: 4,
	cooldownSeconds: 45,
	switchDelaySeconds: 0,
	enabled: true,
	enabledLeagues: ['nba', 'nfl'],
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: 0,
	showUpcomingGames: true,
	keepFinalGames: false,
	finishedTabAction: 'keep',
	proTipsEnabled: true,
	notificationsEnabled: false,
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F',
	romerUnlocked: false,
	openRevealEnabled: true,
	theme: 'dark',
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	postseasonBoostPoints: 0,
	upcomingGamesDays: 7,
	disabledSignals: [],
};

const defaultProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	demoMode: false,
	demoSeason: 'real' as const,
	leagueLogos: {},
	favoriteTeamIds: new Set<string>(),
	standbyStreamTabId: null,
	standbyOnboardingDone: true,
	openTabs: [],
	formatTabLabel: () => 'Tab',
	onClose: () => {},
	onSensitivityChange: () => {},
	onCooldownChange: () => {},
	onSwitchDelayChange: () => {},
	onFavoriteTeamBonusChange: () => {},
	onToggleFavoriteTeam: () => {},
	onToggleLeague: () => {},
	onToggleSport: () => {},
	onReorderLeague: () => {},
	onResetLeagueOrder: () => {},
	onToggleShowUpcoming: () => {},
	onToggleKeepFinalGames: () => {},
	onFinishedTabActionChange: () => {},
	onThemeChange: () => {},
	onUpcomingGamesDaysChange: () => {},
	onToggleProTips: () => {},
	onToggleNotifications: () => {},
	onToggleDemo: () => {},
	onDemoSeasonChange: () => {},
	onToggleStandbyStream: () => {},
	onStandbyThresholdChange: () => {},
	onSetStandbyTab: () => {},
	onStandbyOnboardingDone: () => {},
	onToggleBetting: () => {},
	onToggleTemperatureUnit: () => {},
	onUnlockRomer: () => {},
	onToggleOpenReveal: () => {},
	onToggleHolidayDecorations: () => {},
	onToggleHolidaySnow: () => {},
	onToggleHolidayLights: () => {},
	onToggleHolidayLeaves: () => {},
	onPostseasonBoostChange: () => {},
	onToggleSignal: () => {},
};

const openGroup = (id: string) => cy.get(`#settingsGroup-${id}`).click();

// React tracks an input's last value on the element itself and swallows a change event whose value
// it thinks it already has, so the value goes in through the native setter the tracker patched.
const dragRangeTo = (selector: string, index: number) => cy.get(selector).then(([el]: JQuery<HTMLElement>) => {
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(index));
	el.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('setupView index', () => {
	it('heads the page and gives the reader a way back out of it', () => {
		cy.mount(<SetupView {...defaultProps} onClose={cy.stub().as('onClose')} />);
		cy.contains('Settings').should('exist');
		cy.get('.st-back').click();
		cy.get('@onClose').should('have.been.called');
	});

	it('lists every settings group with a description', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('.st-entry').should('have.length', 7);
		cy.get('#settingsGroup-switching').find('.st-entry-desc').should('not.be.empty');
	});

	it('does not render the old tab bar', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('.setup-tabs').should('not.exist');
	});

	it('calls onClose when the root back button is clicked', () => {
		const spy = cy.spy().as('onClose');
		cy.mount(<SetupView {...defaultProps} onClose={spy} />);
		cy.get('.st-back').click();
		cy.get('@onClose').should('have.been.called');
	});

	it('flags the leagues row when no leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.get('#settingsGroup-leagues').find('.st-entry-warn').should('exist');
	});

	it('does not flag the leagues row when leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsGroup-leagues').find('.st-entry-warn').should('not.exist');
	});
});

describe('setupView navigation', () => {
	it('opens a group page and hides the index', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('switching');
		cy.get('.st-entry').should('not.exist');
		cy.get('#sensitivity-range').should('exist');
	});

	it('returns to the index from a group page without closing settings', () => {
		const spy = cy.spy().as('onClose');
		cy.mount(<SetupView {...defaultProps} onClose={spy} />);
		openGroup('display');
		cy.get('.st-back').click();
		cy.get('.st-entry').should('have.length', 7);
		cy.get('@onClose').should('not.have.been.called');
	});

	// The directory row already said what the section is for, one tap ago.
	it('titles a group page with its name and goes straight into the controls', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('standby');
		cy.get('.as-subhead h2').should('have.text', en.setup.groupStandby);
		cy.contains(en.setup.groupStandbyDesc).should('not.exist');
		cy.get('.st-card').first().find('#standbyStreamToggle').should('exist');
	});

	it('names the back button for a screen reader', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('.st-back').should('have.attr', 'aria-label', 'Back');
		openGroup('display');
		cy.get('.st-back').should('have.attr', 'aria-label', 'Back');
	});
});

const valueOf = (id: string) => cy.get(`#settingsGroup-${id} .st-entry-value`);

describe('setupView directory values', () => {
	it('says where every section stands without opening it', () => {
		cy.mount(<SetupView {...defaultProps} favoriteTeamIds={new Set(['nba:20', 'nhl:15'])} />);
		valueOf('switching').should('have.text', 'Balanced');
		valueOf('scoring').should('have.text', '5 signals');
		valueOf('favorites').should('have.text', '2 teams');
		valueOf('leagues').should('have.text', '2 on');
		valueOf('display').should('have.text', 'Dark');
		valueOf('standby').should('have.text', 'Off');
		valueOf('demo').should('have.text', 'Off');
	});

	it('follows the settings as they change', () => {
		cy.mount(<SetupView
			{...defaultProps}
			demoMode
			prefs={{ ...defaultPrefs, sensitivity: 7, disabledSignals: ['momentum', 'comeback'], theme: 'system', standbyStreamEnabled: true, enabledLeagues: ['nba'] }}
		/>);
		valueOf('switching').should('have.text', 'Ludicrous Speed');
		valueOf('scoring').should('have.text', '3 signals');
		valueOf('favorites').should('have.text', 'None');
		valueOf('leagues').should('have.text', '1 on');
		valueOf('display').should('have.text', 'System');
		valueOf('standby').should('have.text', 'On');
		valueOf('demo').should('have.text', 'On');
	});

	it('shows nothing it cannot vouch for before the prefs arrive', () => {
		cy.mount(<SetupView {...defaultProps} prefsLoaded={false} />);
		cy.get('#settingsGroup-switching .st-entry-value').should('not.exist');
		cy.get('#settingsGroup-demo .st-entry-value').should('have.text', 'Off');
	});

	it('keeps every locale\'s longest sensitivity name inside the row', () => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} />);
		Object.entries(locales).forEach(([name, locale]) => {
			Object.values(locale.sensitivity.level).forEach(level => {
				valueOf('switching').should(([el]: JQuery<HTMLElement>) => {
					el.textContent = level;
					const row = el.closest('.st-entry')!;
					expect(row.scrollWidth, `${name} "${level}" stays inside the row`).to.be.at.most(row.clientWidth);
					expect(el.getBoundingClientRect().width, `${name} "${level}" leaves the description room`).to.be.at.most(96.5);
				});
			});
		});
	});
});

describe('setupView search', () => {
	it('matches a setting by its label', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('cooldown');
		cy.contains('.st-entry', 'Switch cooldown').should('exist');
		cy.get('.st-entry').should('have.length.lessThan', 6);
	});

	it('matches a setting by a synonym that is not in its label', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('celsius');
		cy.contains('.st-entry', 'Temperature unit').should('exist');
	});

	// The thing somebody wants off is a thing they have only ever seen, never read a name for, so the
	// words they reach for are their own rather than the label's.
	it('finds the opening animation by what it looks like rather than what it is called', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('intro');
		cy.contains('.st-entry', 'Opening animation').should('exist');
	});

	it('ignores case and accents', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('COOLDOWN');
		cy.contains('.st-entry', 'Switch cooldown').should('exist');
	});

	it('does not spill a group description match onto every setting in that group', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('bonus');
		cy.contains('.st-entry', 'Favorite team bonus').should('exist');
		cy.contains('.st-entry', 'Postseason boost').should('exist');
		cy.contains('.st-entry', 'Closeness').should('not.exist');
	});

	it('shows an empty state when nothing matches', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('zzzznope');
		cy.get('.st-entry').should('not.exist');
		cy.get('.st-empty').should('exist');
	});

	it('opens the owning group when a result is clicked', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('celsius');
		cy.contains('.st-entry', 'Temperature unit').click();
		cy.get('#temperatureUnitToggle').should('exist');
	});

	it('clears the query after navigating to a group', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('cooldown');
		cy.contains('.st-entry', 'Switch cooldown').click();
		cy.get('.st-back').click();
		cy.get('#settingsSearch').should('have.value', '');
		cy.get('.st-entry').should('have.length', 7);
	});
});

describe('setupView switching group', () => {
	beforeEach(() => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('switching');
	});

	it('offers the explainer as a tooltip rather than permanent body copy', () => {
		cy.get('.setting-tooltip-btn').should('have.length.at.least', 3);
		cy.contains('Controls how big the PowerScore gap').should('not.exist');
	});
});

describe('setupView cooldown slider', () => {
	it('runs all the way down to off', () => {
		const onCooldownChange = cy.spy().as('onCooldownChange');
		cy.mount(<SetupView {...defaultProps} onCooldownChange={onCooldownChange} />);
		openGroup('switching');

		dragRangeTo('#cooldown-range', 0);
		cy.get('@onCooldownChange').should('have.been.calledWith', 0);
	});

	it('names the bottom of the range Off rather than counting zero seconds', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, cooldownSeconds: 0 }} />);
		openGroup('switching');

		cy.get('#cooldown-range').parent().find('.st-value').should('have.text', 'Off');
		cy.get('#cooldown-range').parent().should('not.contain.text', '0s');
	});

	it('keeps every locale\'s Off label on one line beside the setting name', () => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, cooldownSeconds: 0 }} />);
		openGroup('switching');

		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('#cooldown-range').parent().find('.st-value').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.cooldown.off;
				const row = el.parentElement!;
				expect(el.getBoundingClientRect().height, `off label stays one line in ${name}`).to.be.at.most(22);
				expect(row.getBoundingClientRect().height, `label and value share a line in ${name}`).to.be.at.most(28);
			});
		});
	});
});

describe('setupView display group', () => {
	it('shows show-upcoming toggle checked when pref is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#upcomingToggle').should('be.checked');
	});

	it('shows show-upcoming toggle unchecked when pref is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		openGroup('display');
		cy.get('#upcomingToggle').should('not.be.checked');
	});

	it('offers the keep-finished-games toggle, off by default', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#keepFinalToggle').should('exist').and('not.be.checked');
	});

	it('shows it checked once the pref is on', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, keepFinalGames: true }} />);
		openGroup('display');
		cy.get('#keepFinalToggle').should('be.checked');
	});

	it('calls onToggleKeepFinalGames when it is flipped', () => {
		const spy = cy.spy().as('onToggleKeepFinalGames');
		cy.mount(<SetupView {...defaultProps} onToggleKeepFinalGames={spy} />);
		openGroup('display');
		cy.get('#keepFinalToggle').click();
		cy.get('@onToggleKeepFinalGames').should('have.been.calledOnce');
	});

	// It sits directly under the upcoming pair, which is the other end of the same axis.
	it('sits below the days-ahead slider and above pro tips', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').then(([slider]: JQuery<HTMLElement>) => {
			cy.get('#proTipsToggle').then(([proTips]: JQuery<HTMLElement>) => {
				cy.get('#keepFinalToggle').should(([keep]: JQuery<HTMLElement>) => {
					const top = keep.getBoundingClientRect().top;
					expect(top).to.be.greaterThan(slider.getBoundingClientRect().top);
					expect(top).to.be.lessThan(proTips.getBoundingClientRect().top);
				});
			});
		});
	});

	it('keeps its label beside the switch on one line in every locale', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('label[for="keepFinalToggle"]').then(([label]: JQuery<HTMLElement>) => {
			const oneLine = label.getBoundingClientRect().height;
			for (const [name, locale] of Object.entries(locales)) {
				label.textContent = (locale.setup as unknown as Record<string, string>).keepFinalGames;
				expect(label.getBoundingClientRect().height, `${name} keeps the label on one line`)
					.to.be.at.most(oneLine + 1);
			}
		});
	});

	it('shows days-ahead slider when showUpcomingGames is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('exist');
	});

	it('hides days-ahead slider when showUpcomingGames is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('not.exist');
	});

	it('reflects the current upcomingGamesDays value on the slider', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, upcomingGamesDays: 10 }} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('have.value', '10');
	});

	it('calls onUpcomingGamesDaysChange when slider is moved', () => {
		const spy = cy.spy().as('onUpcomingGamesDaysChange');
		cy.mount(<SetupView {...defaultProps} onUpcomingGamesDaysChange={spy} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').then($el => {
			const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
			setter.call($el[0], 3);
			$el[0].dispatchEvent(new Event('input', { bubbles: true }));
		});
		cy.get('@onUpcomingGamesDaysChange').should('have.been.called');
	});


	it('shows °F label when temperatureUnit is F', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°F');
	});

	it('shows °C label when temperatureUnit is C', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, temperatureUnit: 'C' }} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°C');
	});

	it('shows °Rø label when temperatureUnit is Ro', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, temperatureUnit: 'Ro', romerUnlocked: true }} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°Rø');
	});

	it('calls onToggleOpenReveal when the opening animation is switched off', () => {
		const spy = cy.spy().as('onToggleOpenReveal');
		cy.mount(<SetupView {...defaultProps} onToggleOpenReveal={spy} />);
		openGroup('display');
		cy.get('#openRevealToggle').should('be.checked').click();
		cy.get('@onToggleOpenReveal').should('have.been.calledOnce');
	});

	it('shows the switch off when the animation is off', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, openRevealEnabled: false }} />);
		openGroup('display');
		cy.get('#openRevealToggle').should('not.be.checked');
	});

	it('keeps its label beside the switch on one line in every locale', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('label[for="openRevealToggle"]').then(([label]: JQuery<HTMLElement>) => {
			const oneLine = label.getBoundingClientRect().height;
			for (const [name, locale] of Object.entries(locales)) {
				label.textContent = (locale.setup as unknown as Record<string, string>).openReveal;
				expect(label.getBoundingClientRect().height, `${name} keeps the label on one line`)
					.to.be.at.most(oneLine + 1);
			}
		});
	});
});

const clickToggle = (times: number) => {
	for (let i = 0; i < times; i += 1) cy.get('#temperatureUnitToggle').click();
};

describe('setupView Rømer unlock', () => {
	it('cycles the unit on every click, unlocked or not', () => {
		const onCycle = cy.spy().as('onCycle');
		cy.mount(<SetupView {...defaultProps} onToggleTemperatureUnit={onCycle} />);
		openGroup('display');
		clickToggle(3);
		cy.get('@onCycle').should('have.callCount', 3);
	});

	it('does not unlock on six clicks', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(6);
		cy.get('@onUnlock').should('not.have.been.called');
		cy.get('#temperatureUnitToggle').should('not.have.class', 'romer-revealing');
	});

	it('unlocks on the seventh click', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(7);
		cy.get('@onUnlock').should('have.been.calledOnce');
	});

	it('says nothing about what was found — the sweep is the whole reveal', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		clickToggle(7);
		cy.get('.game-detail-shell, .popup-container').should('not.contain', 'Rømer');
	});

	it('plays the reveal animation on the toggle itself', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		clickToggle(7);
		cy.get('#temperatureUnitToggle').should('have.class', 'romer-revealing');
	});

	it('stops counting clicks once Rømer is already unlocked', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, romerUnlocked: true }} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(9);
		cy.get('@onUnlock').should('not.have.been.called');
	});

	it('never names Rømer anywhere in the settings before it is found', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('romer');
		cy.get('.st-entry').should('not.exist');
		cy.get('.st-empty').should('exist');
	});
});

describe('setupView demo group', () => {
	it('shows demo mode toggle', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('demo');
		cy.get('#demoToggle').should('exist').and('not.be.checked');
	});

	it('shows demo toggle checked when demoMode is true', () => {
		cy.mount(<SetupView {...defaultProps} demoMode={true} />);
		openGroup('demo');
		cy.get('#demoToggle').should('be.checked');
	});

	it('dims the season picker until demo mode is on', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('demo');
		cy.get('#demoSeasonSelect').should('be.disabled').closest('.st-card').should('have.class', 'is-off');
		cy.contains(en.setup.demoSeasonExplainer).should('exist');
	});

	it('calls onToggleDemo when it is flipped', () => {
		const onToggleDemo = cy.spy().as('onToggleDemo');
		cy.mount(<SetupView {...defaultProps} onToggleDemo={onToggleDemo} />);
		openGroup('demo');
		cy.get('#demoToggle').check({ force: true });
		cy.get('@onToggleDemo').should('have.been.calledOnce');
	});
});

describe('setupView Ludicrous Speed', () => {
	it('only turns the value into the hyperdrive button at the top of the range', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, sensitivity: 6 }} />);
		openGroup('switching');
		cy.get('#sensitivity-range').closest('.st-control').find('button.st-value').should('not.exist');
		cy.get('#sensitivity-range').closest('.st-control').find('.st-value').should('not.have.class', 'ludicrous-speed');
	});

	it('engages the hyperdrive from the value at sensitivity 7', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, sensitivity: 7 }} />);
		openGroup('switching');
		cy.get('button.st-value.ludicrous-speed')
			.should('contain.text', 'Ludicrous Speed')
			.and('have.attr', 'title', 'Engage the hyperdrive...');
		cy.get('button.st-value.ludicrous-speed').click();
		// The component run swaps the set piece for a stub (cypress.config.ts); ludicrousSpeed.cy.tsx drives the real one.
		cy.get('[data-testid="ludicrous-speed-overlay"]').should('exist');
		cy.get('[data-testid="ludicrous-speed-overlay"] button').click();
		cy.get('[data-testid="ludicrous-speed-overlay"]').should('not.exist');
	});

	it('keeps the sensitivity label on one line while the long value takes its own', () => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, sensitivity: 7 }} />);
		openGroup('switching');
		cy.get('label[for="sensitivity-range"]').then(([label]: JQuery<HTMLElement>) => {
			const oneLine = parseFloat(getComputedStyle(label).lineHeight);
			for (const [name, locale] of Object.entries(locales)) {
				label.textContent = locale.sensitivity.label;
				expect(label.getBoundingClientRect().height, `${name} keeps the label on one line`).to.be.at.most(oneLine + 1);
			}
		});
		cy.get('.st-range-head').first().should(([head]: JQuery<HTMLElement>) => {
			expect(head.scrollWidth, 'nothing spills out of the head').to.be.at.most(head.clientWidth);
		});
	});
});

describe('setupView standby stream', () => {
	// The master switch shows what it would unlock rather than hiding it, but nothing under it moves.
	it('dims and locks the threshold and the tab while standby is off', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('standby');
		cy.get('#standbyThresholdSlider').should('be.disabled');
		cy.get('#standbyTabSelect').should('be.disabled');
		cy.get('#standbyStreamToggle').should('not.be.disabled');
		cy.get('#standbyStreamToggle').closest('.st-card').should('have.class', 'is-off');
		cy.get('#standbyThresholdSlider').closest('.st-control').should('have.css', 'opacity', '0.45');
		cy.get('#standbyStreamToggle').closest('.st-control').should('have.css', 'opacity', '1');
	});

	it('hands the threshold and the tab back once standby is on', () => {
		const onStandbyThresholdChange = cy.spy().as('onStandbyThresholdChange');
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, standbyStreamEnabled: true }} onStandbyThresholdChange={onStandbyThresholdChange} />);
		openGroup('standby');
		cy.get('#standbyStreamToggle').closest('.st-card').should('not.have.class', 'is-off');
		cy.get('#standbyThresholdSlider').should('not.be.disabled').and('have.value', '20');
		cy.get('#standbyThresholdSlider').closest('.st-control').find('.st-value').should('have.text', '20');
		dragRangeTo('#standbyThresholdSlider', 35);
		cy.get('@onStandbyThresholdChange').should('have.been.calledWith', 35);
		cy.get('#standbyTabSelect').should('not.be.disabled');
	});

	it('offers the open tabs to stand by on, and hands the chosen one back', () => {
		cy.mount(
			<SetupView
				{...defaultProps}
				prefs={{ ...defaultPrefs, standbyStreamEnabled: true }}
				openTabs={[{ id: 101, title: 'Red Zone' }, { id: 102, title: 'Gamecast' }]}
				formatTabLabel={(tab: { title?: string }) => tab.title ?? ''}
				onSetStandbyTab={cy.stub().as('onSetStandbyTab')}
			/>,
		);
		openGroup('standby');

		cy.get('#standbyTabSelect').choose('Gamecast');
		cy.get('@onSetStandbyTab').should('have.been.calledWith', 102);
	});

	it('shows the standby stream guide when toggled on and onboarding not done', () => {
		cy.mount(<SetupView
			{...defaultProps}
			standbyOnboardingDone={false}
			prefs={{ ...defaultPrefs, standbyStreamEnabled: false }}
		/>);
		openGroup('standby');
		cy.contains('A fallback for the slow moments.').should('not.exist');

		cy.get('#standbyStreamToggle').check({ force: true });

		// Copy only the guide's first step carries, so the settings page behind it cannot satisfy it.
		cy.contains('A fallback for the slow moments.').should('be.visible');
		cy.contains('Step 1 of 2').should('be.visible');
	});

	it('does not put the guide back in front of somebody who has already read it', () => {
		cy.mount(<SetupView
			{...defaultProps}
			standbyOnboardingDone={true}
			prefs={{ ...defaultPrefs, standbyStreamEnabled: false }}
		/>);
		openGroup('standby');
		cy.get('#standbyStreamToggle').check({ force: true });

		cy.contains('A fallback for the slow moments.').should('not.exist');
	});
});

describe('setupView scoring group', () => {
	it('renders a switch for every PowerScore signal', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('scoring');
		cy.get('#signal-closeness').should('be.checked');
		cy.get('#signal-momentum').should('exist');
		cy.get('#signal-comeback').should('exist');
	});

	it('calls onToggleSignal when a signal is switched off', () => {
		const spy = cy.spy().as('onToggleSignal');
		cy.mount(<SetupView {...defaultProps} onToggleSignal={spy} />);
		openGroup('scoring');
		cy.get('#signal-momentum').uncheck({ force: true });
		cy.get('@onToggleSignal').should('have.been.calledWith', 'momentum');
	});

	it('locks the last enabled signal', () => {
		cy.mount(<SetupView
			{...defaultProps}
			prefs={{ ...defaultPrefs, disabledSignals: ['lateGame', 'momentum', 'leadChanges', 'comeback'] }}
		/>);
		openGroup('scoring');
		cy.get('#signal-closeness').should('be.disabled');
	});

	it('renders the postseason boost, the bonus that stayed behind', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('scoring');
		cy.get('#postseasonBoostInput').should('exist');
		cy.get('#favoriteTeamBonusInput').should('not.exist');
	});
});

// The favorites page fetches rosters on mount, so every test that opens it has to answer that
// call. One team is the floor, not a convenience: fetchTeamsForLeagues throws outright when every
// league it asked about comes back empty, so a zero-team stub is a failed load rather than a bare one.
const stubTeamsFetch = (entries: [string, string][] = [['1', 'Atlanta Hawks']]) => cy.window().then(win => {
	cy.stub(win, 'fetch').resolves({
		ok: true,
		json: () => Promise.resolve({
			sports: [{ leagues: [{ teams: entries.map(([id, displayName]) => ({ team: { id, displayName, abbreviation: 'ABC' } })) }] }],
		}),
	} as unknown as Response);
});

describe('setupView favorites group', () => {
	it('opens the picker, with the bonus that moved here out of Scoring', () => {
		stubTeamsFetch();
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('favorites');
		cy.get('#favoriteTeamBonusInput').should('exist');
		cy.get('input[type=search]').should('exist');
	});

	it('keeps the search box in view once the list is scrolled', () => {
		stubTeamsFetch(Array.from({ length: 60 }, (_, i) => [String(i), `Team ${i}`]));
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('favorites');
		cy.contains('Team 59').should('exist');

		cy.get('.popup-container .overflow-auto').scrollTo('bottom');
		cy.get('.popup-container .overflow-auto').should(([el]: JQuery<HTMLElement>) => {
			expect(el.scrollTop, 'the list itself scrolled').to.be.greaterThan(0);
		});
		cy.get('input[type=search]').should(([el]: JQuery<HTMLElement>) => {
			const box = el.getBoundingClientRect();
			expect(box.top, 'search box did not scroll off the top').to.be.at.least(0);
			expect(box.bottom, 'search box is still on screen').to.be.at.most(560);
		});
	});

	it('keeps every locale\'s group name on one line in the index', () => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} />);

		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('#settingsGroup-favorites .st-entry-name').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.setup.groupFavorites;
				expect(el.getBoundingClientRect().height, `group name stays one line in ${name}`).to.be.at.most(22);
			});
		});
	});

	it('turns up in the search under a word that is nowhere in its label', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('franchise');
		cy.contains('.st-entry', 'Teams you follow').should('exist');
	});
});

describe('setupView leagues group', () => {
	it('heads each sport group and gives every league in it a mark', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('leagues');
		cy.contains('Basketball').should('exist');
		cy.get('.st-toggle:has(input[id^="league-"])').should('have.length.greaterThan', 0).each($row => {
			cy.wrap($row).find('.league-toggle-logo').should('exist');
		});
	});

	it('shows warning when no leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		openGroup('leagues');
		cy.contains(/no leagues/i).should('exist');
	});

	it('shows the display order list with a row per enabled league', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('leagues');
		cy.contains(/display order/i).should('exist');
		cy.get('.league-order-row').should('have.length', 2);
	});

	it('reorders an enabled league from the display order list', () => {
		const onReorderLeague = cy.spy().as('onReorderLeague');
		cy.mount(<SetupView {...defaultProps} onReorderLeague={onReorderLeague} />);
		openGroup('leagues');
		cy.get('#league-order-down-nba').click();
		cy.get('@onReorderLeague').should('have.been.calledWith', 0, 1);
	});

	it('hides the display order list when only one league is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba'] }} />);
		openGroup('leagues');
		cy.contains(/display order/i).should('not.exist');
		cy.get('.league-order-row').should('not.exist');
	});

	it('keeps the leagues heading and its tooltip when the order list is hidden', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba'] }} />);
		openGroup('leagues');
		cy.get('.as-subhead h2').should('have.text', 'Leagues');
		cy.get('.as-subhead .setting-tooltip-btn').should('have.attr', 'aria-label', en.setup.leaguesExplainer);
	});

	it('selects a whole sport at once, and offers to clear it once it is all on', () => {
		const onToggleSport = cy.spy().as('onToggleSport');
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nfl', 'ncaaf', 'ufl'] }} onToggleSport={onToggleSport} />);
		openGroup('leagues');
		cy.contains('.st-group-title', 'Basketball').siblings('.st-group-action').should('have.text', 'all').click();
		cy.get('@onToggleSport').should('have.been.calledWith', 'basketball', true);
		cy.contains('.st-group-title', 'Football').siblings('.st-group-action').should('have.text', 'none').click();
		cy.get('@onToggleSport').should('have.been.calledWith', 'football', false);
	});

	it('puts the no-leagues warning above everything else on the page', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		openGroup('leagues');
		cy.get('.st-body > :first-child').should('have.class', 'st-no-leagues').and('contain.text', en.setup.noLeaguesWarning);
	});
});

const chooseTheme = (label: string) => {
	cy.get('#themeSelect').click();
	cy.contains('.dropdown-menu.show .dropdown-item', label).click();
};

describe('the theme setting', () => {
	const openDisplay = (prefs: UserPreferences = defaultPrefs, props = {}) => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} {...props} prefs={prefs} />);
		openGroup('display');
	};

	it('opens on dark, with its icon on the toggle', () => {
		openDisplay();
		cy.get('#themeSelect').should('contain.text', 'Dark').find('.bi-moon-stars').should('exist');
	});

	it('lists light, dark and system, each with an icon, and ticks the current one', () => {
		openDisplay();
		cy.get('#themeSelect').click();
		cy.get('.dropdown-menu.show .dropdown-item').should('have.length', 3).then($items => {
			expect([...$items].map(item => item.textContent?.trim())).to.deep.equal(['Light', 'Dark', 'Match my system']);
		});
		cy.get('.dropdown-menu.show .dropdown-item .bi-sun, .dropdown-menu.show .dropdown-item .bi-moon-stars, .dropdown-menu.show .dropdown-item .bi-circle-half').should('have.length', 3);
		cy.get('.dropdown-menu.show [aria-current="true"]').should('have.length', 1).and('contain.text', 'Dark').find('.bi-check2').should('exist');
	});

	it('reflects a stored choice', () => {
		openDisplay({ ...defaultPrefs, theme: 'system' });
		cy.get('#themeSelect').should('contain.text', 'Match my system').find('.bi-circle-half').should('exist');
	});

	it('reports the choice that was made and closes', () => {
		const spy = cy.spy().as('onThemeChange');
		openDisplay(defaultPrefs, { onThemeChange: spy });
		chooseTheme('Light');
		cy.get('@onThemeChange').should('have.been.calledOnceWith', 'light');
		cy.get('.dropdown-menu.show').should('not.exist');
	});

	it('cannot be opened before the prefs have loaded', () => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} prefsLoaded={false} />);
		openGroup('display');
		cy.get('#themeSelect').should('be.disabled');
	});

	// Nobody searches for "theme"; they search for the thing they want to stop squinting at.
	it('is found by the words people use for it', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('dark');
		cy.contains('.st-entry', 'Theme').should('exist');
	});
});

describe('what happens to a tab once its game finishes', () => {
	const optionKeys = ['finishedTabKeep', 'finishedTabFree', 'finishedTabClose'] as const;

	const openDisplay = (prefs: UserPreferences = defaultPrefs, props = {}) => {
		cy.viewport(320, 560);
		cy.mount(<SetupView {...defaultProps} {...props} prefs={prefs} />);
		openGroup('display');
	};

	it('offers the three choices and opens on leaving the tab alone', () => {
		openDisplay();
		cy.get('#finishedTabSelect').should('contain.text', 'Leave the tab alone');
		cy.get('#finishedTabSelect').parent().find('.dropdown-item').then((items: JQuery<HTMLElement>) => {
			expect([...items].map(item => item.textContent?.trim())).to.deep.equal(['Leave the tab alone', 'Free it from ArenaSwap', 'Close the tab']);
		});
	});

	it('reflects a stored choice', () => {
		openDisplay({ ...defaultPrefs, finishedTabAction: 'close' });
		cy.get('#finishedTabSelect').should('contain.text', 'Close the tab');
	});

	it('reports the choice that was made', () => {
		const spy = cy.spy().as('onFinishedTabActionChange');
		openDisplay(defaultPrefs, { onFinishedTabActionChange: spy });
		cy.get('#finishedTabSelect').choose('Free it from ArenaSwap');
		cy.get('@onFinishedTabActionChange').should('have.been.calledOnceWith', 'free');
	});

	// Nothing is being taken while it says keep, so there is nothing to explain.
	it('says nothing extra while it is set to keep', () => {
		openDisplay();
		cy.contains(en.setup.finishedTabActiveExplainer).should('not.exist');
		cy.contains(en.setup.finishedTabCloseExplainer).should('not.exist');
	});

	it('warns about the tab in front of you as soon as it is doing anything', () => {
		openDisplay({ ...defaultPrefs, finishedTabAction: 'free' });
		cy.contains(en.setup.finishedTabActiveExplainer).should('exist');
		// Nothing is closing, so the sole-tab rule has nothing to say.
		cy.contains(en.setup.finishedTabCloseExplainer).should('not.exist');
	});

	it('adds the last-tab rule only when it is closing', () => {
		openDisplay({ ...defaultPrefs, finishedTabAction: 'close' });
		cy.contains(en.setup.finishedTabActiveExplainer).should('exist');
		cy.contains(en.setup.finishedTabCloseExplainer).should('exist');
	});

	// Measured with a ruler rather than the rendered box, which would grow to fit and never notice.
	// macOS draws the popup's scrollbar over the page, so this is the width most people get.
	it('fits all three options on one line in every locale', () => {
		openDisplay();
		cy.get('.popup-container').invoke('css', 'scrollbar-width', 'none');
		cy.get('#finishedTabSelect').should(([select]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(select);
			// .form-select keeps its right-hand padding for the chevron, so the text gets the
			// content box and nothing more.
			const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
			expect(available, 'the select has a measurable width').to.be.greaterThan(100);

			const ruler = document.createElement('span');
			ruler.style.position = 'absolute';
			ruler.style.visibility = 'hidden';
			ruler.style.whiteSpace = 'nowrap';
			ruler.style.font = style.font;
			ruler.style.fontFamily = style.fontFamily;
			ruler.style.fontSize = style.fontSize;
			ruler.style.fontWeight = style.fontWeight;
			ruler.style.letterSpacing = style.letterSpacing;
			select.ownerDocument.body.appendChild(ruler);

			try {
				for (const [name, locale] of Object.entries(locales)) {
					const setup = locale.setup as unknown as Record<string, string>;
					for (const key of optionKeys) {
						ruler.textContent = setup[key]!;
						expect(ruler.getBoundingClientRect().width, `${name} ${key} fits`).to.be.at.most(available);
					}
				}
			} finally {
				ruler.remove();
			}
		});
	});

	// A classic scrollbar takes its own gutter, and there the longest options run out of room: they
	// must wrap onto a second line inside the field rather than lose their ends.
	it('wraps rather than clips an option where the scrollbar takes a gutter', () => {
		openDisplay();
		cy.get('#finishedTabSelect').then(([select]: JQuery<HTMLElement>) => {
			const lineHeight = parseFloat(getComputedStyle(select).lineHeight);
			for (const [name, locale] of Object.entries(locales)) {
				const setup = locale.setup as unknown as Record<string, string>;
				for (const key of optionKeys) {
					select.textContent = setup[key]!;
					expect(select.scrollWidth, `${name} ${key} is not cut off at the side`).to.be.at.most(select.clientWidth);
					expect(select.scrollHeight, `${name} ${key} is not cut off at the bottom`).to.be.at.most(select.clientHeight);
					expect(select.clientHeight, `${name} ${key} takes two lines at most`).to.be.at.most(lineHeight * 2 + 14 + 1);
				}
			}
		});
	});

	it('keeps every locale\'s label on one line above it', () => {
		openDisplay();
		cy.get('label[for="finishedTabSelect"]').then(([label]: JQuery<HTMLElement>) => {
			const oneLine = label.getBoundingClientRect().height;
			for (const [name, locale] of Object.entries(locales)) {
				label.textContent = (locale.setup as unknown as Record<string, string>).finishedTabAction!;
				expect(label.getBoundingClientRect().height, `${name} keeps the label on one line`)
					.to.be.at.most(oneLine + 1);
			}
		});
	});

	it('is reachable from the settings search', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('clutter');
		cy.contains(en.setup.finishedTabAction).should('exist');
	});
});
