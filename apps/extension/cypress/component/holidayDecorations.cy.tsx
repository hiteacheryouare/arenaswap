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
	openRevealEnabled: true,
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	holidayChristmasEnabled: true,
	holidayBuntingEnabled: true,
	holidayFireworksEnabled: true,
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
	onToggleKeepFinalGames: () => {},
	onFinishedTabActionChange: () => {},
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
	onToggleHolidayChristmas: () => {},
	onToggleHolidayBunting: () => {},
	onToggleHolidayFireworks: () => {},
	onPostseasonBoostChange: () => {},
	onToggleSignal: () => {},
};

const christmasDay = new Date('2026-12-25T20:00:00.000Z');
const julyFourth = new Date('2026-07-04T23:00:00.000Z');

const withScores = (subject: Game, home: number, away: number): Game => ({
	...subject,
	homeTeam: { ...subject.homeTeam, score: home },
	awayTeam: { ...subject.awayTeam, score: away },
});

const baseball = (over: Partial<Game> = {}): Game => game({
	league: 'mlb',
	sportType: 'baseball',
	period: 7,
	clockSeconds: 0,
	topOfInning: false,
	homeTeam: { id: '10', name: 'New York Yankees', abbreviation: 'NYY', score: 3, color: '132448', homeRecord: '1-0' },
	awayTeam: { id: '19', name: 'Los Angeles Dodgers', abbreviation: 'LAD', score: 2, color: '005A9C' },
	...over,
});

const expectFlushUnderHero = (selector: string) => {
	cy.get('.gd-poster').then(([hero]) => {
		cy.get(selector).should(([hanging]: JQuery<HTMLElement>) => {
			expect(hanging.getBoundingClientRect().top).to.be.closeTo(hero!.getBoundingClientRect().bottom, 0.5);
		});
	});
};

describe('Christmas on the detail screen', () => {
	it('hangs a garland along the hero and the stockings from it on Christmas Day', () => {
		mountDetail(game(), christmasDay);
		cy.get('.holiday-stocking').should('have.length', 2);
		cy.get('.holiday-mantel .holiday-garland .holiday-bauble').should('have.length', 7);
		cy.get('.holiday-lights .holiday-garland').should('not.exist');
		cy.get('.gd-poster').then(([hero]) => {
			const edge = hero!.getBoundingClientRect().bottom;
			cy.get('.holiday-garland').should(([garland]: JQuery<HTMLElement>) => {
				const rect = garland.getBoundingClientRect();
				expect(rect.top + rect.height / 2, 'garland spine on the hero edge').to.be.closeTo(edge, 0.5);
			});
			cy.get('.holiday-garland').then(([garland]) => {
				const garlandBottom = garland!.getBoundingClientRect().bottom;
				cy.get('.holiday-treat').should(treats => {
					expect(treats.length).to.be.greaterThan(0);
					[...treats].forEach(treat => expect(treat.getBoundingClientRect().top, 'treats show below the needles').to.be.at.least(garlandBottom));
				});
				cy.get('.holiday-stocking-loop').should(loops => {
					[...loops].forEach(loop => expect(loop.getBoundingClientRect().top, 'loops reach up into the garland').to.be.below(garlandBottom));
				});
			});
		});
	});

	it('puts each team\'s crest on its stocking and its colour on its end of the garland', () => {
		const crested = game({
			homeTeam: { id: 'h', name: 'Buffalo Bills', abbreviation: 'BUF', score: 17, color: '00338d', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
			awayTeam: { id: 'a', name: 'Green Bay Packers', abbreviation: 'GB', score: 14, color: '204e32', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
		});
		mountDetail(crested, christmasDay);
		cy.get('.holiday-stocking').each(stocking => {
			cy.wrap(stocking).find('.holiday-stocking-crest').should('exist');
		});
		cy.get('.holiday-stocking').then(stockings => {
			const colors = [...stockings].map(stocking => getComputedStyle(stocking).color);
			cy.get('.holiday-bauble-glass').should(baubles => {
				const fills = [...baubles].map(bauble => getComputedStyle(bauble).fill);
				expect(fills[0]).to.equal(colors[0]);
				expect(fills[fills.length - 1]).to.equal(colors[1]);
			});
		});
	});

	it('hangs them a day early for football', () => {
		mountDetail(game(), new Date('2026-12-24T20:00:00.000Z'));
		cy.get('.holiday-stocking').should('have.length', 2);
	});

	it('keeps the plain December lights the day before for everyone else', () => {
		mountDetail(game({ league: 'nba', sportType: 'basketball' }), new Date('2026-12-24T20:00:00.000Z'));
		cy.get('.holiday-lights').should('exist');
		cy.get('.holiday-garland').should('not.exist');
		cy.get('.holiday-stocking').should('not.exist');
	});

	it('hangs each stocking under its own crest', () => {
		mountDetail(game(), christmasDay);
		cy.get('.game-detail-team-logo-shell').should('have.length', 2).then(crests => {
			const crestCentres = [...crests].map(crest => {
				const rect = crest.getBoundingClientRect();
				return rect.left + rect.width / 2;
			});
			cy.get('.holiday-stocking').should(stockings => {
				[...stockings].forEach((stocking, index) => {
					const rect = stocking.getBoundingClientRect();
					expect(rect.left + rect.width / 2).to.be.closeTo(crestCentres[index]!, 1);
				});
			});
		});
	});

	it('fills the leader\'s stocking fuller and gives the loser coal at the final', () => {
		mountDetail(withScores(game(), 24, 12), christmasDay);
		cy.get('.holiday-stocking').last().find('.holiday-treat').should('have.length', 3);
		cy.get('.holiday-stocking').first().find('.holiday-treat').should('have.length', 2);
		mountDetail(withScores(game({ status: 'post' }), 24, 12), christmasDay);
		cy.get('.holiday-stocking').first().find('.holiday-coal').should('exist');
		cy.get('.holiday-stocking').last().find('.holiday-coal').should('not.exist');
	});

	it('moves to soccer on Boxing Day', () => {
		const match = game({ league: 'epl', sportType: 'soccer', period: 2, clockSeconds: 4000 });
		mountDetail(match, new Date('2026-12-26T15:00:00.000Z'));
		cy.get('.holiday-stocking').should('have.length', 2);
	});
});

describe('bunting on the detail screen', () => {
	it('hangs flush under the hero for a home opener series', () => {
		mountDetail(baseball(), august);
		cy.get('.holiday-bunting').should('exist');
		expectFlushUnderHero('.holiday-bunting');
	});

	it('hangs on a postseason game later in the year', () => {
		mountDetail(baseball({ isPostseason: true, homeTeam: { id: '10', name: 'New York Yankees', abbreviation: 'NYY', score: 3, homeRecord: '52-29' } }), august);
		cy.get('.holiday-bunting').should('exist');
	});

	it('comes down once the opening series is over', () => {
		mountDetail(baseball({ homeTeam: { id: '10', name: 'New York Yankees', abbreviation: 'NYY', score: 3, homeRecord: '2-1' } }), august);
		cy.get('.holiday-bunting').should('not.exist');
	});

	it('keeps the same gap above the next card as an undecorated hero', () => {
		const plain = baseball({ homeTeam: { id: '10', name: 'New York Yankees', abbreviation: 'NYY', score: 3, homeRecord: '30-10' } });
		mountDetail(plain, august);
		cy.get('.gd-poster').then(([hero]) => {
			const next = hero!.parentElement!.nextElementSibling!;
			const plainGap = next.getBoundingClientRect().top - hero!.getBoundingClientRect().bottom;
			mountDetail(baseball(), august);
			cy.get('.holiday-bunting').should(([bunting]: JQuery<HTMLElement>) => {
				const after = bunting.nextElementSibling!;
				expect(after.getBoundingClientRect().top - bunting.getBoundingClientRect().bottom).to.be.closeTo(plainGap, 0.5);
			});
		});
	});
});

describe('fireworks on the detail screen', () => {
	it('sets up over the hero for an MLB game on the Fourth of July', () => {
		mountDetail(baseball(), julyFourth);
		cy.get('.holiday-fireworks').should(([canvas]: JQuery<HTMLElement>) => {
			const hero = document.querySelector('.gd-poster')!.getBoundingClientRect();
			const rect = canvas.getBoundingClientRect();
			expect(rect.top).to.be.closeTo(hero.top, 0.5);
			expect(rect.height).to.be.closeTo(hero.height, 0.5);
		});
	});

	it('stays packed away the next day', () => {
		mountDetail(baseball(), new Date('2026-07-05T23:00:00.000Z'));
		cy.get('.holiday-fireworks').should('not.exist');
	});
});

describe('holiday decoration settings', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('hides the sub-switches behind the parent', () => {
		cy.mount(<SetupView {...setupProps} prefs={{ ...defaultPrefs, holidayDecorationsEnabled: false }} />);
		cy.get('#settingsGroup-display').click();
		cy.get('#holidayDecorationsToggle').should('exist').and('not.be.checked');
		cy.get('#holidaySnowToggle').should('not.exist');
		cy.get('#holidayLightsToggle').should('not.exist');
		cy.get('#holidayLeavesToggle').should('not.exist');
		cy.get('#holidayChristmasToggle').should('not.exist');
		cy.get('#holidayBuntingToggle').should('not.exist');
		cy.get('#holidayFireworksToggle').should('not.exist');
	});

	it('shows every sub-switch once the parent is on', () => {
		cy.mount(<SetupView {...setupProps} />);
		cy.get('#settingsGroup-display').click();
		cy.get('#holidaySnowToggle').should('be.checked');
		cy.get('#holidayLightsToggle').should('be.checked');
		cy.get('#holidayLeavesToggle').should('be.checked');
		cy.get('#holidayChristmasToggle').should('be.checked');
		cy.get('#holidayBuntingToggle').should('be.checked');
		cy.get('#holidayFireworksToggle').should('be.checked');
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
			([
				['holidaySnowToggle', locale.setup.holidaySnow],
				['holidayLightsToggle', locale.setup.holidayLights],
				['holidayLeavesToggle', locale.setup.holidayLeaves],
				['holidayChristmasToggle', locale.setup.holidayChristmas],
				['holidayBuntingToggle', locale.setup.holidayBunting],
				['holidayFireworksToggle', locale.setup.holidayFireworks],
			] as const).forEach(([id, text]) => {
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

	it('offers every season once demo mode is on', () => {
		cy.mount(<SetupView {...setupProps} demoMode />);
		cy.get('#settingsGroup-demo').click();
		cy.get('#demoSeasonSelect').should('have.value', 'real');
		cy.get('#demoSeasonSelect option').should('have.length', 6);
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
			// Was a hand-picked 3.4s; it now rides $motion-ambient with the rest of the idle motion.
			expect(getComputedStyle(bulb).animationDuration, 'the resting shimmer').to.equal('3s');
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

const firstBulbAnimation = () => cy.get('.holiday-bulb').first()
	.then(([bulb]: JQuery<HTMLElement>) => bulb.getAnimations()[0] as CSSAnimation);

// Chrome's own media emulation, because a `prefers-reduced-motion` block cannot be reached from
// the page.
const emulateReducedMotion = () => cy.wrap(Cypress.automation('remote:debugger:protocol', {
	command: 'Emulation.setEmulatedMedia',
	params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
}));

// A duration in the computed style is a declaration, not a fact. `animation-duration` reads back
// whatever the stylesheet asked for even when the named keyframes do not exist, and an animation
// that is paused, cancelled or pointed at nothing satisfies it exactly as well as one that plays.
// These read the live timeline instead.
describe('the lights actually moving', () => {
	it('runs the resting shimmer on a loop rather than only declaring it', () => {
		mountDetail(clear, december);
		firstBulbAnimation().then(shimmer => {
			expect(shimmer, 'the bulb has an animation at all').to.not.equal(undefined);
			expect(shimmer.animationName, 'the keyframes it is running').to.equal('holidayBulbTwinkle');
			expect(shimmer.playState, 'and it is playing').to.equal('running');
			const timing = shimmer.effect!.getTiming();
			expect(timing.duration, 'one cycle, read off the live timeline in milliseconds').to.equal(3000);
			expect(timing.iterations, 'and it never stops').to.equal(Infinity);
		});
	});

	it('advances along that loop on its own', () => {
		mountDetail(clear, december);
		firstBulbAnimation().then(shimmer => {
			const started = Number(shimmer.currentTime);
			cy.wrap(null).should(() => {
				expect(Number(shimmer.currentTime), 'the shimmer moved without being pushed').to.be.greaterThan(started);
			});
		});
	});

	// Proof the keyframes reach the element rather than merely being named by it: scrubbed to the
	// midpoint of the cycle the bulb has to actually be dimmer, and back at the top of it, full.
	it('dims the bulb halfway through the cycle and brings it back', () => {
		mountDetail(clear, december);
		firstBulbAnimation().then(shimmer => {
			shimmer.pause();
			shimmer.currentTime = 1500;
			cy.get('.holiday-bulb').first().should(([bulb]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(bulb).opacity, 'dimmed at the midpoint').to.equal('0.48');
			});
			cy.then(() => { shimmer.currentTime = 0; });
			cy.get('.holiday-bulb').first().should(([bulb]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(bulb).opacity, 'full again at the top of the cycle').to.equal('1');
			});
		});
	});

	it('runs the celebration on a loop too', () => {
		cy.viewport(320, 560);
		cy.mount(<HolidayLights flashColors={['#004C54', '#A5ACAF']} />);
		firstBulbAnimation().then(flash => {
			expect(flash.animationName, 'the keyframes a celebrating bulb runs').to.equal('holidayBulbCelebrate');
			expect(flash.playState, 'and it is playing').to.equal('running');
			const timing = flash.effect!.getTiming();
			expect(timing.duration, 'the urgent cadence').to.equal(500);
			expect(timing.iterations, 'and it never stops').to.equal(Infinity);
		});
	});
});

// Chrome's own media emulation, because a `prefers-reduced-motion` block cannot be reached from
// the page. Asserted as an empty animation list rather than a duration string: `animation: none`
// and a stylesheet that failed to load both read back as `0s`.
describe('the lights and a reader who asked for less motion', () => {
	afterEach(() => {
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [] },
		}));
	});

	it('puts the resting shimmer out entirely', () => {
		emulateReducedMotion();
		mountDetail(clear, december);
		cy.get('.holiday-bulb').first().should(([bulb]: JQuery<HTMLElement>) => {
			expect(bulb.getAnimations(), 'nothing left running').to.have.length(0);
		});
	});

	// The opt-out used to be written as `.holiday-bulb`, one class specific, while the celebration
	// is `.is-celebrating .holiday-bulb`, two. The opt-out lost on specificity, so a reader who had
	// asked for stillness got the whole string strobing at 2Hz the moment a favourite scored — the
	// one piece of motion on this screen it is least safe to leave running. Both selectors now.
	it('puts the celebration strobe out as well', () => {
		emulateReducedMotion();
		cy.viewport(320, 560);
		cy.mount(<HolidayLights flashColors={['#004C54', '#A5ACAF']} />);
		cy.get('.holiday-bulb').first().should(([bulb]: JQuery<HTMLElement>) => {
			expect(bulb.getAnimations(), 'nothing left flashing').to.have.length(0);
		});
	});
});
