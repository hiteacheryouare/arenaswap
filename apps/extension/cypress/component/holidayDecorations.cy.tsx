import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import HolidayLights from '../../entrypoints/popup/components/holidayLights';
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

// The date is passed as a prop rather than mocked with cy.clock. A second cy.clock in the same test
// does not re-arm, so a test that mounts twice silently renders the first date both times.
const mountDetail = (subject: Game, now: Date, prefs = allOn) => {
	cy.viewport(320, 560);
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
			decorationDate={now}
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

	// The string drapes over the matchup card the way FOX drapes it over the scorebug, which means
	// clearing the sticky back bar rather than hiding behind it or sitting on the button.
	it('hangs the string under the back bar and keeps it there while scrolling', () => {
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

	it('starts flush at the left edge and stops where the scrollbar already is', () => {
		mountDetail(clear, december);
		cy.get('.popup-container').then(([scroller]: JQuery<HTMLElement>) => {
			cy.get('.holiday-lights').should(([lights]: JQuery<HTMLElement>) => {
				const rect = lights.getBoundingClientRect();
				expect(Math.round(rect.left), 'flush left').to.equal(Math.round(scroller.getBoundingClientRect().left));
				expect(Math.round(rect.width), 'stops short of the scrollbar').to.equal(scroller.clientWidth);
			});
		});
	});

	// The pile belongs to the ground, which is the foot of the page rather than the foot of the
	// window. Scrolling has to move it, which is exactly what a fixed overlay would not do.
	it('leaves the pile at the bottom of the page instead of dragging it down the screen', () => {
		mountDetail(snowing, august);
		cy.get('.holiday-drift').should('exist');
		cy.get('.popup-container').scrollTo('top');
		cy.get('.holiday-drift').then(([drift]: JQuery<HTMLElement>) => {
			const atTop = drift.getBoundingClientRect().top;
			cy.get('.popup-container').scrollTo('bottom');
			cy.get('.holiday-drift').should(([scrolled]: JQuery<HTMLElement>) => {
				expect(scrolled.getBoundingClientRect().top, 'the pile scrolled up into view').to.be.lessThan(atTop);
			});
		});
	});

	it('lands the pile flush with the very bottom of the content', () => {
		mountDetail(snowing, august);
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.popup-container').then(([scroller]: JQuery<HTMLElement>) => {
			cy.get('.holiday-drift').should(([drift]: JQuery<HTMLElement>) => {
				const gap = scroller.getBoundingClientRect().bottom - drift.getBoundingClientRect().bottom;
				expect(Math.round(gap), 'no gap under the pile').to.equal(0);
			});
		});
	});

	it('draws no pile at all before anything has settled', () => {
		mountDetail(game({ status: 'pre', period: 0, clockSeconds: 0, weather: { temperatureF: 24, conditionLabel: 'Snow' } }), august);
		cy.get('.holiday-fall').should('exist');
		cy.get('.holiday-drift').should('not.exist');
	});
});

const defaultPrefs: UserPreferences = createDefaultUserPreferences();

const setupProps = {
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

// Pushing the content in for the light frame narrows the column, and a narrower column is where a
// label that fitted on one line quietly becomes two. Every text leaf is measured with the frame off
// and again with it on, and any that grew is a wrap the inset caused.
const textLeafHeights = (): Cypress.Chainable<Record<string, number>> =>
	cy.get('.game-detail-shell').then(([shell]: JQuery<HTMLElement>) => {
		const heights: Record<string, number> = {};
		shell.querySelectorAll<HTMLElement>('*').forEach(el => {
			if (el.children.length > 0) return;
			const text = el.textContent?.trim();
			if (!text) return;
			heights[`${el.className}|${text}`] = Math.round(el.getBoundingClientRect().height);
		});
		return heights;
	});

describe('the lights and the content column', () => {
	// The string sits over the matchup card rather than around the popup, so the column keeps its
	// full width. Every text leaf is measured with the lights off and again with them on, and
	// anything that changed height would be a wrap the decoration caused.
	it('costs the content column nothing at all', () => {
		mountDetail(clear, august);
		textLeafHeights().as('withoutLights');

		mountDetail(clear, december);
		cy.get('.holiday-lights').should('exist');
		textLeafHeights().then(withLights => {
			cy.get<Record<string, number>>('@withoutLights').then(withoutLights => {
				const changed = Object.keys(withLights)
					.filter(key => withoutLights[key] !== undefined && withLights[key] !== withoutLights[key])
					.map(key => `${key} was ${withoutLights[key]}px, now ${withLights[key]}px`);
				expect(Object.keys(withLights).length, 'there was something to measure').to.be.greaterThan(10);
				expect(changed, 'nothing moved when the lights went up').to.deep.equal([]);
			});
		});
	});

	it('leaves the matchup card exactly as wide as it was', () => {
		mountDetail(clear, august);
		cy.get('.gd-hero').invoke('outerWidth').as('bareWidth');

		mountDetail(clear, december);
		cy.get('.holiday-lights').should('exist');
		cy.get('.gd-hero').then(([lit]: JQuery<HTMLElement>) => {
			const litWidth = lit.getBoundingClientRect().width;
			cy.get<number>('@bareWidth').then(bareWidth => {
				expect(litWidth, 'the column is untouched').to.equal(bareWidth);
			});
		});
	});
});

describe('the lights celebrating a favourite', () => {
	it('twinkles in the palette when nothing has happened', () => {
		mountDetail(clear, december);
		cy.get('.holiday-lights').should('not.have.class', 'is-celebrating');
		cy.get('.holiday-bulb').first().should(([bulb]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(bulb).animationDuration, 'the resting shimmer').to.equal('3.4s');
		});
	});

	it('takes the team colours and picks up the pace once one is passed in', () => {
		cy.viewport(320, 560);
		cy.mount(<HolidayLights flashColors={['#004C54', '#A5ACAF']} />);
		cy.get('.holiday-lights').should('have.class', 'is-celebrating');
		cy.get('.holiday-bulb').should(([first, second]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(first).color, 'first bulb takes the primary').to.equal('rgb(0, 76, 84)');
			expect(getComputedStyle(second!).color, 'second takes the alternate').to.equal('rgb(165, 172, 175)');
			expect(getComputedStyle(first).animationDuration, 'and it flashes rather than shimmers').to.equal('0.5s');
		});
	});

	it('handles a team with only one usable colour', () => {
		cy.viewport(320, 560);
		cy.mount(<HolidayLights flashColors={['#003594']} />);
		cy.get('.holiday-bulb').should('have.length', 9).each($bulb => {
			expect(getComputedStyle($bulb[0]!).color).to.equal('rgb(0, 53, 148)');
		});
	});
});
