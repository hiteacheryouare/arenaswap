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
		cy.get('.holiday-bulb').should('have.length.at.least', 24);
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

	// An SVG with a viewBox carries an intrinsic aspect ratio, so a frame given only three offsets
	// sizes its fourth from the other side and comes up short. Both dimensions are set from the
	// measured scroll container instead.
	it('frames the scroll container exactly, clear of the scrollbar', () => {
		mountDetail(clear, december);
		cy.get('.popup-container').then(([scroller]: JQuery<HTMLElement>) => {
			const gutter = Math.round(scroller.getBoundingClientRect().width - scroller.clientWidth);
			expect(gutter, 'the harness renders a real scrollbar to clear').to.be.greaterThan(0);
			cy.get('.holiday-lights').should(([frame]: JQuery<HTMLElement>) => {
				const rect = frame.getBoundingClientRect();
				expect(Math.round(rect.width), 'frame width excludes the scrollbar').to.equal(scroller.clientWidth);
				expect(Math.round(rect.height), 'frame height is the full popup').to.equal(scroller.clientHeight);
			});
		});
	});

	it('runs bulbs down all four sides, every one of them hanging inward', () => {
		mountDetail(clear, december);
		cy.get('.holiday-lights').should(([frame]: JQuery<HTMLElement>) => {
			const frameRect = frame.getBoundingClientRect();
			const bulbs = Array.from(frame.querySelectorAll('.holiday-bulb'))
				.map(bulb => bulb.getBoundingClientRect());
			expect(bulbs.length, 'bulbs all the way round').to.be.greaterThan(24);

			const near = 24;
			expect(bulbs.some(b => b.top - frameRect.top < near), 'a top run').to.equal(true);
			expect(bulbs.some(b => frameRect.bottom - b.bottom < near), 'a bottom run').to.equal(true);
			expect(bulbs.some(b => b.left - frameRect.left < near), 'a left run').to.equal(true);
			expect(bulbs.some(b => frameRect.right - b.right < near), 'a right run').to.equal(true);

			for (const bulb of bulbs) {
				expect(bulb.left, 'no bulb hangs off the left edge').to.be.at.least(frameRect.left - 0.5);
				expect(bulb.right, 'no bulb hangs off the right edge').to.be.at.most(frameRect.right + 0.5);
				expect(bulb.top, 'no bulb hangs off the top edge').to.be.at.least(frameRect.top - 0.5);
				expect(bulb.bottom, 'no bulb hangs off the bottom edge').to.be.at.most(frameRect.bottom + 0.5);
			}
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

describe('the light frame and the content column', () => {
	// Both mounts are enqueued at the top level rather than nested in a `.then`. A mount inside a
	// callback replaces the root while the surrounding chain still holds the old, detached nodes,
	// and every measurement then comes back from a screen that is no longer on screen.
	it('takes a slice off the column without wrapping anything that fitted before', () => {
		mountDetail(clear, august);
		textLeafHeights().as('withoutFrame');

		mountDetail(clear, december);
		cy.get('.holiday-lights').should('exist');
		textLeafHeights().then(function compare(this: Mocha.Context, withFrame: Record<string, number>) {
			const withoutFrame = this.withoutFrame as Record<string, number>;
			const wrapped = Object.keys(withFrame)
				.filter(key => withoutFrame[key] !== undefined && withFrame[key]! > withoutFrame[key]!)
				.map(key => `${key} grew ${withoutFrame[key]}px to ${withFrame[key]}px`);
			expect(Object.keys(withFrame).length, 'there was something to measure').to.be.greaterThan(10);
			expect(wrapped, 'nothing gained a line when the frame pushed the content in').to.deep.equal([]);
		});
	});

	it('keeps the bite out of the column small enough to be worth it', () => {
		mountDetail(clear, august);
		cy.get('.gd-hero').invoke('outerWidth').as('bareWidth');

		mountDetail(clear, december);
		cy.get('.holiday-lights').should('exist');
		cy.get('.gd-hero').then(function compare(this: Mocha.Context, [framed]: JQuery<HTMLElement>) {
			const lost = (this.bareWidth as number) - framed.getBoundingClientRect().width;
			expect(lost, 'the frame actually pushes the content in').to.be.greaterThan(4);
			expect(lost, 'but not far enough to be worth noticing').to.be.at.most(16);
		});
	});

	it('bleeds the back bar back out to the popup edge at the wider inset', () => {
		mountDetail(clear, december);
		cy.get('.popup-container').then(([scroller]: JQuery<HTMLElement>) => {
			const scrollerRect = scroller.getBoundingClientRect();
			cy.get('.game-detail-header').should(([header]: JQuery<HTMLElement>) => {
				const headerRect = header.getBoundingClientRect();
				expect(Math.round(headerRect.left), 'flush left').to.equal(Math.round(scrollerRect.left));
				expect(Math.round(headerRect.top), 'flush top').to.equal(Math.round(scrollerRect.top));
			});
		});
	});
});
