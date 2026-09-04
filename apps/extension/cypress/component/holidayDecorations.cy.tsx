import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import SetupView from '../../entrypoints/popup/components/setupView';
import type { Game, UserPreferences } from '@arenaswap/core/types';
import { resolveDecorationDate } from '../../utils/holidayDecorations';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
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

const december = new Date('2026-12-14T20:00:00.000Z');
const thanksgivingWeek = new Date('2026-11-26T18:00:00.000Z');
const august = new Date('2026-08-14T20:00:00.000Z');

const allOn = {
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
};

const game = (over: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 4,
	clockSeconds: 180,
	homeTeam: { id: 'h', name: 'Buffalo Bills', abbreviation: 'BUF', score: 17, color: '00338d' },
	awayTeam: { id: 'a', name: 'Green Bay Packers', abbreviation: 'GB', score: 14, color: '204e32' },
	venueName: 'Highmark Stadium',
	...over,
});

const snowing = game({ weather: { temperatureF: 24, conditionLabel: 'Snow' } });
const clear = game({ weather: { temperatureF: 52, conditionLabel: 'Partly Cloudy' } });

const mountDetail = (subject: Game, now: Date, prefs = allOn) => {
	cy.viewport(320, 560);
	cy.clock(now, ['Date']);
	cy.mount(
		<GameDetailView
			game={subject}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={prefs}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('holiday decorations on the detail screen', () => {
	it('snows on a game where it is snowing', () => {
		mountDetail(snowing, august);
		cy.get('.holiday-fall').should('exist');
	});

	it('leaves a clear game alone', () => {
		mountDetail(clear, august);
		cy.get('.holiday-fall').should('not.exist');
	});

	it('hangs lights through December for any game at all', () => {
		mountDetail(clear, december);
		cy.get('.holiday-lights').should('exist');
		cy.get('.holiday-bulb').should('have.length', 9);
	});

	it('takes the lights down for the rest of the year', () => {
		mountDetail(snowing, august);
		cy.get('.holiday-lights').should('not.exist');
	});

	it('drops leaves rather than snow during Thanksgiving week', () => {
		mountDetail(snowing, thanksgivingWeek);
		cy.get('.holiday-fall').should('exist');
	});

	it('draws nothing once the parent switch is off', () => {
		mountDetail(snowing, december, { ...allOn, holidayDecorationsEnabled: false });
		cy.get('.holiday-fall').should('not.exist');
		cy.get('.holiday-lights').should('not.exist');
	});

	it('honours each sub-switch on its own', () => {
		mountDetail(snowing, december, { ...allOn, holidaySnowEnabled: false });
		cy.get('.holiday-fall').should('not.exist');
		cy.get('.holiday-lights').should('exist');
	});

	it('covers the popup exactly and never swallows a click', () => {
		mountDetail(snowing, august);
		cy.get('.holiday-fall').should(([canvas]: JQuery<HTMLElement>) => {
			const rect = canvas.getBoundingClientRect();
			expect(Math.round(rect.width), 'canvas width').to.equal(320);
			expect(Math.round(rect.height), 'canvas height').to.equal(560);
			expect(getComputedStyle(canvas).pointerEvents, 'canvas is click-through').to.equal('none');
		});
	});

	// The string is meant to drape over the matchup card the way FOX drapes it over the scorebug,
	// which means clearing the sticky back bar rather than hiding behind it.
	it('hangs the string below the back bar and keeps it there while scrolling', () => {
		mountDetail(clear, december);
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			const headerBottom = header.getBoundingClientRect().bottom;
			cy.get('.holiday-lights').should(([lights]: JQuery<HTMLElement>) => {
				expect(lights.getBoundingClientRect().top, 'clears the back bar').to.be.at.least(headerBottom - 1);
			});
		});
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.holiday-lights').should(([lights]: JQuery<HTMLElement>) => {
			const rect = lights.getBoundingClientRect();
			expect(Math.round(rect.top), 'still pinned under the bar').to.equal(40);
			expect(Math.round(rect.height), 'still drawn at full height').to.equal(22);
		});
	});
});

const defaultPrefs: UserPreferences = createDefaultUserPreferences();

const setupProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	demoMode: false,
	demoSeason: 'real' as const,
	leagueLogos: {},
	standbyStreamTabId: null,
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
	onDemoSeasonChange: () => {},
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

describe('holiday decoration settings', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('hides the three sub-switches behind the parent', () => {
		cy.mount(<SetupView {...setupProps} prefs={{ ...defaultPrefs, holidayDecorationsEnabled: false }} />);
		cy.get('#settingsGroup-display').click();
		cy.get('#holidayDecorationsToggle').should('exist').and('not.be.checked');
		cy.get('#holidaySnowToggle').should('not.exist');
		cy.get('#holidayLightsToggle').should('not.exist');
		cy.get('#holidayLeavesToggle').should('not.exist');
	});

	it('shows all three once the parent is on', () => {
		cy.mount(<SetupView {...setupProps} />);
		cy.get('#settingsGroup-display').click();
		cy.get('#holidaySnowToggle').should('be.checked');
		cy.get('#holidayLightsToggle').should('be.checked');
		cy.get('#holidayLeavesToggle').should('be.checked');
	});

	it('is reachable from the settings search', () => {
		cy.mount(<SetupView {...setupProps} />);
		cy.get('#settingsSearch').type('christmas');
		cy.contains('.settings-index-row', 'Holiday decorations').should('exist');
	});

	it('keeps every locale\'s labels on one line beside their switches', () => {
		cy.mount(<SetupView {...setupProps} />);
		cy.get('#settingsGroup-display').click();
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('label[for=\'holidayDecorationsToggle\']').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.setup.holidayDecorations;
				expect(el.scrollWidth, `parent label fits in ${name}`).to.be.at.most(el.clientWidth + 1);
			});
			([['holidaySnowToggle', locale.setup.holidaySnow], ['holidayLightsToggle', locale.setup.holidayLights], ['holidayLeavesToggle', locale.setup.holidayLeaves]] as const).forEach(([id, text]) => {
				cy.get(`label[for='${id}']`).should(([el]: JQuery<HTMLElement>) => {
					el.textContent = text;
					expect(el.getBoundingClientRect().height, `${id} stays one line in ${name}`).to.be.at.most(22);
				});
			});
		});
	});
});

describe('reaching the decorations from demo mode', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('offers no season control while demo mode is off', () => {
		cy.mount(<SetupView {...setupProps} />);
		cy.get('#settingsGroup-demo').click();
		cy.get('#demoSeasonSelect').should('not.exist');
	});

	it('offers the three seasons once demo mode is on', () => {
		cy.mount(<SetupView {...setupProps} demoMode />);
		cy.get('#settingsGroup-demo').click();
		cy.get('#demoSeasonSelect').should('have.value', 'real');
		cy.get('#demoSeasonSelect option').should('have.length', 3);
	});

	it('reports the season the user picked', () => {
		const onChange = cy.spy().as('onChange');
		cy.mount(<SetupView {...setupProps} demoMode onDemoSeasonChange={onChange} />);
		cy.get('#settingsGroup-demo').click();
		cy.get('#demoSeasonSelect').select('december');
		cy.get('@onChange').should('have.been.calledWith', 'december');
	});

	// The point of the borrowed date: a September session can still see all three.
	it('decorates a snowy game in September once December is borrowed', () => {
		cy.viewport(320, 560);
		cy.clock(august, ['Date']);
		cy.mount(
			<GameDetailView
				game={snowing}
				excitementResult={undefined}
				scoreHistory={[]}
				powerScoreHistory={[]}
				proTipsEnabled={false}
				gameBoosts={{}}
				bettingPrefs={{ bettingEnabled: false }}
				weatherPrefs={{ temperatureUnit: 'F' }}
				decorationPrefs={allOn}
				decorationDate={resolveDecorationDate(august, 'december')}
				onSetGameBoost={() => {}}
				onBack={() => {}}
			/>,
		);
		cy.get('.holiday-lights').should('exist');
		cy.get('.holiday-fall').should('exist');
	});
});
