import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import GameInfoPanel from '../../entrypoints/popup/components/gameInfoPanel';
import { fetchGames } from '@arenaswap/core';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
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
const labelKeys = ['infoWatch', 'infoVenue', 'infoWeather', 'infoLine', 'infoAttendance', 'infoEnded'] as const;

const liveGame: Game = {
	id: 'mock-7',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 3,
	clockSeconds: 402,
	venueName: 'Arrowhead Stadium',
	broadcasts: ['CBS', 'Paramount+', 'Westwood One'],
	weather: { temperatureF: 34, conditionLabel: 'Light Snow' },
	odds: { details: 'KC -3.5', overUnder: 47.5, provider: { name: 'ESPN BET' } },
	homeTeam: { id: '1', name: 'Kansas City Chiefs', abbreviation: 'KC', score: 21 },
	awayTeam: { id: '3', name: 'Buffalo Bills', abbreviation: 'BUF', score: 24 },
};

const excitement: PowerScoreResult = {
	gameId: 'mock-7',
	total: 72,
	closeness: 24,
	lateGame: 18,
	momentum: 16,
	leadChanges: 8,
	comeback: 6,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close game, lead changes',
};

const mountPanel = (game: Game, gameDurationMins: number | null) => {
	cy.mount(
		<GameInfoPanel
			game={game}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			gameDurationMins={gameDurationMins}
		/>,
	);
};

// `.game-info-value` wraps rather than overflowing — it carries `overflow-wrap: anywhere` and no
// `white-space: nowrap` — so comparing its scrollWidth against its clientWidth holds however badly
// the row breaks. An inline run reports one client rect per line it occupies, which is the thing
// these assertions are actually claiming.
const lineCount = (el: HTMLElement): number => el.getClientRects().length;

const expectedTime = (startIso: string, mins: number): string => (
	new Date(new Date(startIso).getTime() + (mins * 60_000))
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const mountDetail = (game: Game, bettingEnabled = true) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={game.status === 'pre' ? undefined : excitement}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('game info panel', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('gives broadcast, venue and line a row each', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-row').eq(0).should('contain.text', 'CBS • Paramount+ • Westwood One');
		cy.get('.game-info-row').eq(1).should('contain.text', 'Arrowhead Stadium');
		cy.get('.game-info-row').eq(2).should('contain.text', 'KC -3.5 • O/U 47.5');
	});

	it('stacks the location under the venue name, unbolded', () => {
		mountDetail({ ...liveGame, venueLocation: 'Kansas City, MO' });
		cy.get('.game-info-venue-name').should('have.text', 'Arrowhead Stadium');
		cy.get('.game-info-venue-location').should('have.text', 'Kansas City, MO');
		cy.get('.game-info-venue-name').then(([name]: JQuery<HTMLElement>) => {
			cy.get('.game-info-venue-location').should(([location]: JQuery<HTMLElement>) => {
				const nameWeight = Number(getComputedStyle(name).fontWeight);
				const locationWeight = Number(getComputedStyle(location).fontWeight);
				expect(nameWeight, 'venue name is the bolder of the two').to.be.greaterThan(locationWeight);
				expect(location.getBoundingClientRect().top, 'location sits on its own line below')
					.to.be.greaterThan(name.getBoundingClientRect().bottom - 1);
			});
		});
	});

	it('drops to the location alone when ESPN names no building', () => {
		mountDetail({ ...liveGame, venueName: undefined, venueLocation: 'Kansas City, MO' });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-venue-name').should('not.exist');
		cy.get('.game-info-row').eq(1).should('contain.text', 'Kansas City, MO');
	});

	// Two lines, and each has to fit the column on its own. The scrollWidth comparison this replaced
	// could not fail: `.game-info-value` wraps, so a name too long for the column breaks onto a
	// second line rather than overflowing, and the assertion held either way. Measured intrinsically
	// off an absolutely positioned clone, the same way the label column below is measured.
	it('keeps the longest venue block inside the panel', () => {
		mountDetail({
			...liveGame,
			venueName: 'Mercedes-Benz Superdome',
			venueLocation: 'New Orleans, Louisiana',
			weather: undefined,
		});
		cy.get('.game-info-row').eq(1).find('.game-info-value').then(([value]: JQuery<HTMLElement>) => {
			const column = value.getBoundingClientRect().width;
			for (const selector of ['.game-info-venue-name', '.game-info-venue-location']) {
				const line = value.querySelector(selector) as HTMLElement;
				const probe = line.cloneNode(true) as HTMLElement;
				probe.style.cssText = 'width:auto;display:inline-block;white-space:nowrap;position:absolute;visibility:hidden';
				value.appendChild(probe);
				expect(probe.getBoundingClientRect().width, `${selector} fits the value column on one line`)
					.to.be.at.most(column);
				probe.remove();
			}
		});
	});

	// Conditions describe the venue, so they cost a sub-line rather than a row of their own.
	it('rides the weather inside the venue row', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').eq(1).find('.game-info-weather').should('contain.text', 'Light Snow · 34°F');
		cy.get('.game-info-weather').should('have.length', 1);
	});

	it('gives the weather its own row when the venue is unknown', () => {
		mountDetail({ ...liveGame, venueName: undefined });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-row').eq(1).should('contain.text', 'Light Snow · 34°F');
		cy.get('.game-info-weather').should('not.exist');
	});

	it('drops the weather line when the game carries no reading', () => {
		mountDetail({ ...liveGame, weather: undefined });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-weather').should('not.exist');
	});

	// The test above used to carry the name this one does, and mounted `weather: undefined` to earn
	// it — which is the shape a dome arrives in but says nothing about whether it ever gets there.
	// ESPN sends the stadium postcode's outdoor forecast for a dome exactly as for an open roof, so
	// the payload below is run through the real parser rather than hand-shaped around it. Both the
	// venue block and the reading are verbatim from the live NFL scoreboard on 2026-09-09.
	it('drops the outdoor forecast ESPN sends for a dome', () => {
		const domeEvent = {
			id: 'dome',
			date: '2026-09-14T17:00:00.000Z',
			weather: { displayValue: 'Mostly cloudy', temperature: 80, highTemperature: 80, conditionId: '6' },
			competitions: [{
				competitors: [
					{ id: 'h', homeAway: 'home', score: '17', team: { displayName: 'Detroit Lions', abbreviation: 'DET' } },
					{ id: 'a', homeAway: 'away', score: '14', team: { displayName: 'Chicago Bears', abbreviation: 'CHI' } },
				],
				status: { period: 3, displayClock: '5:00', type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
				venue: { fullName: 'Ford Field', address: { city: 'Detroit', state: 'MI' }, indoor: true },
			}],
		};
		cy.stub(window, 'fetch').resolves({
			ok: true,
			status: 200,
			// The client reads `cache-control` off every scoreboard response to learn how often ESPN
			// will answer with something new, so a stub without headers is not a Response.
			headers: new Headers(),
			json: () => Promise.resolve({ events: [domeEvent] }),
		} as unknown as Response);

		cy.then(() => fetchGames(['nfl'])).then((games: Game[]) => {
			expect(games[0]?.venueName, 'the parser reached the dome payload').to.equal('Ford Field');
			mountDetail(games[0]!);
		});
		cy.get('.game-info-row').eq(0).should('contain.text', 'Ford Field').and('contain.text', 'Detroit, MI');
		cy.get('.game-info-weather').should('not.exist');
		cy.get('.game-info-panel').should('not.contain.text', 'Mostly cloudy').and('not.contain.text', '80°F');
	});

	// Attribution belongs to the odds, not to a line of its own — it used to take a full row.
	it('keeps the odds provider inside the line row', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').eq(2).find('.game-info-attribution').should('contain.text', 'ESPN BET');
		// Gated on data-bs-original-title because Bootstrap arrives on a lazily imported chunk and
		// only takes ownership of the element once it lands.
		cy.get('.game-info-attribution').should('have.attr', 'data-bs-original-title');
		cy.get('.game-info-attribution').trigger('mouseover');
		cy.get('.tooltip.show').should('be.visible')
			.and('contain.text', 'Odds provided by')
			.and('contain.text', 'ESPN BET');
		cy.get('.game-info-attribution').trigger('mouseout');
	});

	it('drops the line row when betting display is off', () => {
		mountDetail(liveGame, false);
		cy.get('.game-info-row').should('have.length', 2);
		cy.get('.game-info-panel').should('not.contain.text', 'O/U');
	});

	it('renders nothing at all when the game carries none of it', () => {
		mountDetail({ ...liveGame, venueName: undefined, broadcasts: undefined, weather: undefined, odds: undefined });
		cy.get('.game-info-panel').should('not.exist');
	});

	it('trails the breakdown on a live game', () => {
		mountDetail(liveGame);
		cy.get('.game-info-panel').then(([panel]: JQuery<HTMLElement>) => {
			cy.get('.powerscore-breakdown').should(([breakdown]: JQuery<HTMLElement>) => {
				expect(panel.getBoundingClientRect().top, 'panel below the breakdown once live')
					.to.be.greaterThan(breakdown.getBoundingClientRect().top);
			});
		});
	});

	// The pre-game screen has no breakdown to sit under at all — pregameDetail.cy.tsx owns that
	// arrangement. All this needs to know is that the panel still renders there.
	it('still renders before the game starts', () => {
		mountDetail({ ...liveGame, status: 'pre', period: 0, startTime: new Date(Date.now() + 3600_000).toISOString() });
		cy.get('.game-info-panel').should('exist');
		cy.get('.game-info-row').should('have.length', 3);
	});

	// The row this feeds is the only honest finish time in the product: ESPN publishes no
	// completion timestamp, so it is the start it did publish plus the duration it did publish.
	// Mounted directly rather than through the detail view, which would have to fetch a summary.
	describe('the finish time', () => {
		const finalGame: Game = {
			...liveGame,
			status: 'post',
			period: 9,
			clockSeconds: 0,
			startTime: '2026-09-06T16:10:00.000Z',
		};

		it('adds the duration to the start rather than printing an estimate', () => {
			mountPanel(finalGame, 194);
			cy.contains(en.detail.infoEnded).should('exist');
			cy.contains(expectedTime('2026-09-06T16:10:00.000Z', 194)).should('exist');
		});

		it('draws no row on a sport that reports no duration', () => {
			mountPanel(finalGame, null);
			cy.contains(en.detail.infoEnded).should('not.exist');
			cy.get('.bi-flag').should('not.exist');
		});

		it('draws no row without a start time to add it to', () => {
			mountPanel({ ...finalGame, startTime: undefined }, 194);
			cy.contains(en.detail.infoEnded).should('not.exist');
		});

		it('sits above the attendance, since the game ended before the gate was counted', () => {
			mountPanel({ ...finalGame, attendance: 40000 }, 194);
			cy.get('.game-info-row').then(rows => {
				const labels = [...rows].map(r => r.querySelector('.game-info-label')?.textContent);
				expect(labels.indexOf(en.detail.infoEnded))
					.to.be.lessThan(labels.indexOf(en.detail.infoAttendance));
			});
		});

		it('keeps the time on one line beside its label', () => {
			mountPanel(finalGame, 194);
			cy.get('.game-info-row').last().find('.game-info-value-strong').should($value => {
				expect(lineCount($value[0]), 'the time occupies a single line').to.equal(1);
			});
		});
	});

	describe('attendance', () => {
		const finalGame: Game = {
			...liveGame,
			status: 'post',
			period: 4,
			clockSeconds: 0,
			venueLocation: 'Kansas City, MO',
			attendance: 73426,
		};

		it('gets a row of its own once the game is over', () => {
			mountDetail(finalGame);
			cy.get('.game-info-row').should('have.length', 4);
			cy.get('.game-info-row').eq(2).should('contain.text', 'Attendance');
			cy.get('.game-info-row').eq(2).should('contain.text', '73,426');
		});

		it('sits under the venue, which is the fact it belongs to', () => {
			mountDetail(finalGame);
			cy.get('.game-info-row').eq(1).should('contain.text', 'Arrowhead Stadium');
			cy.get('.game-info-row').eq(2).find('.bi-people').should('exist');
		});

		// The field is on every scoreboard payload and reads 0 until the game is final, so a live
		// game that arrives carrying a zero must not draw an empty stadium.
		it('draws no row while the game is still being played', () => {
			mountDetail(liveGame);
			cy.get('.game-info-row').should('have.length', 3);
			cy.get('.bi-people').should('not.exist');
		});

		it('draws no row on a finished game ESPN never announced a figure for', () => {
			mountDetail({ ...finalGame, attendance: undefined });
			cy.get('.game-info-row').should('have.length', 3);
			cy.get('.bi-people').should('not.exist');
		});

		it('groups the digits, which is what makes a five-figure crowd readable at 320px', () => {
			mountDetail(finalGame);
			cy.get('.game-info-row').eq(2).find('.game-info-value-strong')
				.should('have.text', (73426).toLocaleString());
		});

		it('keeps the number on one line beside its label', () => {
			mountDetail({ ...finalGame, attendance: 105000 });
			cy.get('.game-info-row').eq(2).find('.game-info-value-strong').should($value => {
				expect(lineCount($value[0]), 'the figure occupies a single line').to.equal(1);
			});
		});
	});

	// The label column is fixed so the values share a left edge; a label that wraps breaks the grid.
	it('fits every locale label in the label column', () => {
		mountDetail(liveGame);
		cy.get('.game-info-label').first().then(([label]: JQuery<HTMLElement>) => {
			const column = label.getBoundingClientRect().width;
			const probe = label.cloneNode(true) as HTMLElement;
			probe.style.cssText = 'width:auto;display:inline-block;position:absolute;visibility:hidden';
			label.parentElement?.appendChild(probe);
			for (const [name, locale] of Object.entries(locales)) {
				const detail = locale.detail as unknown as Record<string, string>;
				for (const key of labelKeys) {
					probe.textContent = detail[key] ?? '';
					expect(probe.getBoundingClientRect().width, `${name}.${key} fits the label column`)
						.to.be.at.most(column);
				}
			}
			probe.remove();
		});
	});
});
