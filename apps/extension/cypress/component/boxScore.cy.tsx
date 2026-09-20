import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import BoxScore from '../../entrypoints/popup/components/boxScore';
import { parseBoxScore } from '../../entrypoints/popup/components/boxScoreParse';
import type { BoxScore as ParsedBoxScore } from '../../entrypoints/popup/components/boxScoreParse';
import { MockGameSimulator } from '@arenaswap/core';
import type { Game } from '@arenaswap/core/types';
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

// A 1x1 transparent PNG, so the crests are deterministic and need no network. Transparent on
// purpose: an opaque one would paint over a placeholder that failed to hide.
const crestPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// The shipped demo games rather than a redeclaration of them. `useSummaryData` short-circuits
// anything starting `mock-` to `mockBoxScorePayloads`, so these mount the real parser over the
// real fixtures with no network at all — and the team ids are what resolve the two sides, so a
// spec that declared its own stayed green while demo mode drew each team's numbers under the other
// team's crest. Only the crests are swapped, for a data URI that needs no network.
const seededGames = new MockGameSimulator().seed();

const demoGame = (id: string): Game => {
	const game = seededGames.find(candidate => candidate.id === id)!;
	return {
		...game,
		homeTeam: { ...game.homeTeam, logo: crestPixel },
		awayTeam: { ...game.awayTeam, logo: crestPixel },
	};
};

const games: Record<string, Game> = {
	baseball: demoGame('mock-4'),
	basketball: demoGame('mock-2'),
	football: demoGame('mock-5'),
	hockey: demoGame('mock-3'),
	soccer: demoGame('mock-9'),
};

// The one finished demo game, kept out of the per-sport loops: its ten innings plus R-H-E scroll
// sideways by design, so a "no cell past the popup edge" sweep does not describe it.
const finalGame = demoGame('mock-20');

const preGame: Game = {
	...games.basketball,
	id: 'mock-2-pre',
	status: 'pre',
	period: 0,
	startTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
};

const mountScreen = (game: Game) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			favoriteTeamIds={new Set<string>()}
			openTabs={[] as never}
			registry={[]}
			onToggleFavoriteTeam={() => {}}
			onRegistryChange={() => {}}
			formatTabLabel={() => ''}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

// The box score sits behind the detail screen's tab strip, so every assertion below has to open
// that tab first. A plain `cy.get` rather than a conditional click: the strip appears only once
// the summary data resolves, and retrying until it does is the point.
const mount = (game: Game) => {
	mountScreen(game);
	cy.get(`#gd-tab-${game.id}-box`).click();
};

// A parsed box score mounted at the width the card actually gets. The popup is 320px, the detail
// screen's own scrollbar takes 15 of them, and `.game-detail-shell` spends `--gd-inset` on each
// side — so a bare mount measures the table against about 40px of room it will never have.
const mountBox = (game: Game, box: ParsedBoxScore) => {
	cy.mount(
		<div className='game-detail-shell' style={{ width: '305px' }}>
			<BoxScore game={game} boxScore={box} />
		</div>,
	);
};

// A line score of `count` periods and nothing else, for the header row the period labels render
// in. Every entry reads 0, so what is being measured is the headings rather than the digits.
const mountPeriodLine = (game: Game, count: number) => {
	const periods = Array.from({ length: count }, () => ({ displayValue: '0' }));
	const homeId = game.homeTeam.id;
	const awayId = game.awayTeam.id;
	const payload = { header: { competitions: [{ competitors: [
		{ homeAway: 'away', team: { id: awayId, abbreviation: game.awayTeam.abbreviation }, score: '1', linescores: periods },
		{ homeAway: 'home', team: { id: homeId, abbreviation: game.homeTeam.abbreviation }, score: '1', linescores: periods },
	] }] } };
	mountBox(game, parseBoxScore(payload, homeId, awayId, game.homeTeam.abbreviation, game.awayTeam.abbreviation));
};

// A soccer match that went to penalties: five entries, which is the widest the row gets and the
// only shape where PEN sits alongside ET1 and ET2.
const soccerPenalties = () => mountPeriodLine(games.soccer, 5);

// Hockey's fifth entry is the shootout goal rather than a second overtime, and ESPN's own Final
// designation suffix is what says so.
const hockeyShootout = () => mountPeriodLine({ ...games.hockey, finalPeriodSuffix: 'SO' }, 5);

// The ink a cell inherits when no team colour reaches it. Asserting a computed colour is merely
// readable, or merely not the raw team colour, passes with the whole feature removed — so every
// colour assertion below is pinned to its own expected value and checked against this default.
const inheritedCardInk = 'rgb(17, 24, 39)';

// Contrast of a computed `rgb(...)` colour against the light .gd-setup card, #f8fafc, whose
// luminance is 0.9536.
const srgbChannel = (value: number): number => {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const contrastOnCard = (rgb: string): number => {
	const [red, green, blue] = rgb.match(/\d+/g)!.map(Number);
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return (0.9536 + 0.05) / (luminance + 0.05);
};

// Every table cell that carries a number, so a clipping check never has to name them one by one.
const cells = () => cy.get('.gd-box-table td, .gd-box-table th');

describe('box score', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('renders nothing on a pre-game screen', () => {
		// Mounted without opening a tab, because the missing tab is half of what is being asserted.
		mountScreen(preGame);
		// The pre-game screen itself rendered — this is not an empty mount asserting nothing.
		cy.get('.gd-pregame-setup, .gd-setup').should('exist');
		cy.get('.gd-box').should('not.exist');
		cy.get(`#gd-tab-${preGame.id}-box`).should('not.exist');
	});

	describe('line score', () => {
		it('gives baseball an R-H-E line and leaves the unplayed half-inning blank', () => {
			mount(games.baseball);
			cy.get('.gd-box-line-table thead th, .gd-box-line-table thead td').then($th => {
				const labels = [...$th].map(el => el.textContent?.trim());
				expect(labels).to.deep.equal(['', '1', '2', '3', '4', '5', '6', '7', '8', 'R', 'H', 'E']);
			});
			cy.get('.gd-box-line-table tbody tr').eq(0).find('td').then($td => {
				expect([...$td].map(el => el.textContent?.trim())).to.deep.equal(
					['0', '1', '0', '0', '0', '1', '0', '0', '2', '7', '1'],
				);
			});
			// The bottom of the eighth has not been played, so it is empty rather than a 0.
			cy.get('.gd-box-line-table tbody tr').eq(1).find('td').then($td => {
				expect([...$td].map(el => el.textContent?.trim())).to.deep.equal(
					['1', '0', '0', '2', '0', '0', '0', '', '3', '7', '1'],
				);
			});
		});

		it('reads the finished demo game as a completed ten innings', () => {
			// The wrap screen says Final/10, so the line score under it has to be a finished
			// ten-inning game: both rows the same length, no blank half-inning, and every total
			// summing to what the row above it says.
			mount(finalGame);
			cy.get('.gd-box-line-table thead th, .gd-box-line-table thead td').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(
					['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'R', 'H', 'E'],
				);
			});
			cy.get('.gd-box-line-table tbody tr').eq(0).find('td').then($td => {
				expect([...$td].map(el => el.textContent?.trim())).to.deep.equal(
					['0', '1', '0', '0', '0', '1', '0', '0', '0', '0', '2', '8', '1'],
				);
			});
			cy.get('.gd-box-line-table tbody tr').eq(1).find('td').then($td => {
				expect([...$td].map(el => el.textContent?.trim())).to.deep.equal(
					['1', '0', '0', '0', '0', '1', '0', '0', '0', '1', '3', '8', '1'],
				);
			});
			// The R column is the score on the wrap screen above it.
			cy.get('.gd-box-line-table tbody tr').eq(0).find('.gd-box-line-total').first()
				.should('have.text', String(finalGame.awayTeam.score));
			cy.get('.gd-box-line-table tbody tr').eq(1).find('.gd-box-line-total').first()
				.should('have.text', String(finalGame.homeTeam.score));
		});

		it('gives a clock sport one total column and no hits or errors', () => {
			mount(games.football);
			cy.get('.gd-box-line-table thead th, .gd-box-line-table thead td').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(['', '1', '2', '3', '4', 'T']);
			});
		});

		it('puts each side of the soccer match under its own crest', () => {
			// Soccer sends no `boxscore.players`, so the line score and the comparison table below
			// it are the whole box score. The demo fixture had the two sides transposed, which put
			// each team's numbers beside the other team's crest and abbreviation.
			mount(games.soccer);
			cy.get('.gd-box-line-table tbody tr').eq(0).then($row => {
				expect($row.find('.gd-box-line-abbr').text()).to.equal(games.soccer.awayTeam.abbreviation);
				expect($row.find('.gd-box-line-total').first().text())
					.to.equal(String(games.soccer.awayTeam.score));
			});
			cy.get('.gd-box-line-table tbody tr').eq(1).then($row => {
				expect($row.find('.gd-box-line-abbr').text()).to.equal(games.soccer.homeTeam.abbreviation);
				expect($row.find('.gd-box-line-total').first().text())
					.to.equal(String(games.soccer.homeTeam.score));
			});
		});

		it('names the period unit each sport actually uses', () => {
			const expected: [keyof typeof games, string][] = [
				['baseball', en.box.byInning],
				['basketball', en.box.byQuarter],
				['hockey', en.box.byPeriod],
				['soccer', en.box.byHalf],
			];
			for (const [sport, heading] of expected) {
				mount(games[sport]);
				cy.get('.gd-box-line .gd-box-subheading').should('have.text', heading);
			}
		});

		// Mounted directly rather than through the demo fixtures, because the widest line score
		// this has to survive is a full nine innings plus R-H-E and then extra innings past it.
		const mountInnings = (count: number) => {
			const innings = Array.from({ length: count }, () => ({ displayValue: '1', hits: 2, errors: 0 }));
			const payload = { header: { competitions: [{ competitors: [
				{ homeAway: 'away', team: { id: '21', abbreviation: 'NYM' }, score: String(count), linescores: innings },
				{ homeAway: 'home', team: { id: '22', abbreviation: 'PHI' }, score: String(count), linescores: innings },
			] }] } };
			mountBox(games.baseball, parseBoxScore(payload, '22', '21', 'PHI', 'NYM'));
		};

		it('fits a full nine innings plus R-H-E inside the card without scrolling', () => {
			mountInnings(9);
			cy.get('.gd-box-line-table thead th, .gd-box-line-table thead td').should('have.length', 13);
			// Measured with the crests in the team column, which is what they cost the innings.
			cy.get('.gd-box-line-crest').should('have.length', 2);
			cy.get('.gd-box-line .table-responsive').then($wrap => {
				const el = $wrap[0];
				expect(el.scrollWidth, 'twelve numeric columns fit in the card')
					.to.be.at.most(el.clientWidth);
			});
			cy.get('.gd-box-line-table td, .gd-box-line-table th').each($cell => {
				expect($cell[0].scrollWidth, 'no inning is squeezed narrower than its own digits')
					.to.be.at.most($cell[0].clientWidth + 1);
			});
		});

		it('names soccer\'s extra time and shootout instead of counting overtimes', () => {
			// ESPN's soccer linescores are positional — [1H, 2H, ET1, ET2, PENS] — so a fifth
			// column is the shootout rather than a third overtime.
			soccerPenalties();
			cy.get('.gd-box-line-table thead th').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(
					['1', '2', en.box.periodEt1, en.box.periodEt2, en.box.periodPen, en.box.lineTotal],
				);
			});
		});

		it('names a hockey shootout as one and a second overtime as one', () => {
			hockeyShootout();
			cy.get('.gd-box-line-table thead th').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(
					['1', '2', '3', en.box.overtime, en.box.periodSo, en.box.lineTotal],
				);
			});
			// Same five entries with a playoff suffix, where a shootout cannot happen.
			mountPeriodLine({ ...games.hockey, finalPeriodSuffix: '2OT' }, 5);
			cy.get('.gd-box-line-table thead th').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(
					['1', '2', '3', en.box.overtime, en.box.overtimeNumbered.replace('{count}', '2'), en.box.lineTotal],
				);
			});
		});

		it('scrolls extra innings sideways rather than crushing the ones that fit', () => {
			mountInnings(13);
			cy.get('.gd-box-line .table-responsive').then($wrap => {
				const el = $wrap[0];
				expect(el.scrollWidth, 'the table is wider than the card').to.be.greaterThan(el.clientWidth);
				// It scrolls inside the card rather than widening the popup.
				expect(el.getBoundingClientRect().right).to.be.at.most(320);
			});
		});
	});

	describe('player tables', () => {
		it('opens on the away team and switches to the home team', () => {
			mount(games.basketball);
			cy.get('.gd-box-tabs .nav-link').should('have.length', 2);
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'CHI');
			cy.get('.gd-box-name').should('contain.text', 'C. White');

			cy.get('.gd-box-tabs .nav-link').eq(1).click();
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'PHI');
			cy.get('.gd-box-name').should('contain.text', 'T. Maxey');
		});

		it('completes the tab pattern its roles announce', () => {
			// `role='tab'` announces "tab, 1 of 2", which tells the reader a panel exists to move
			// to. A tab naming a panel that is not in the document is a promise the screen breaks.
			mount(games.basketball);
			cy.get('.gd-box-tabs .nav-link').eq(0).then($away => {
				const panelId = $away.attr('aria-controls');
				expect(panelId, 'the tab names a panel').to.be.a('string').and.not.equal('');
				cy.document().then(doc => {
					const panel = doc.getElementById(panelId!);
					expect(panel, 'and that panel is on the screen').to.not.equal(null);
					expect(panel!.getAttribute('role')).to.equal('tabpanel');
					expect(panel!.getAttribute('aria-labelledby')).to.equal($away.attr('id'));
					expect(panel!.querySelectorAll('.gd-box-table')).to.have.length.greaterThan(0);
				});
			});
			// Roving: the strip is one tab stop and the arrow keys move inside it.
			cy.get('.gd-box-tabs .nav-link').eq(0).should('have.attr', 'tabindex', '0');
			cy.get('.gd-box-tabs .nav-link').eq(1).should('have.attr', 'tabindex', '-1');
		});

		it('moves the selection with the arrow keys and takes focus with it', () => {
			mount(games.basketball);
			cy.get('.gd-box-tabs .nav-link').eq(0).focus().trigger('keydown', { key: 'ArrowRight' });
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'PHI');
			cy.focused().should('contain.text', 'PHI');
			cy.get('.gd-box-name').should('contain.text', 'T. Maxey');
			cy.get('.gd-box-tabs .nav-link').eq(1).should('have.attr', 'tabindex', '0');

			cy.focused().trigger('keydown', { key: 'ArrowLeft' });
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'CHI');
			cy.focused().should('contain.text', 'CHI');

			cy.focused().trigger('keydown', { key: 'End' });
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'PHI');
			cy.focused().trigger('keydown', { key: 'Home' });
			cy.get('.gd-box-tabs .nav-link.active').should('contain.text', 'CHI');

			// The panel follows the selection rather than staying labelled by the first tab.
			// Scoped to the card: the detail screen's own tab strip puts a second panel on the page.
			cy.get('.gd-box [role="tabpanel"]').then($panel => {
				cy.get('.gd-box-tabs .nav-link.active')
					.should('have.attr', 'id', $panel.attr('aria-labelledby'));
			});
		});

		it('names the one side it has when the other sent no players', () => {
			// Every category arriving with an empty `athletes` array parses to a null side, which
			// is the opening minutes of a football game. There is no tab strip to name the team,
			// so the block has to name it itself — and it must be the side actually rendered.
			const payload = { boxscore: { players: [
				{
					team: { id: '6', abbreviation: 'DAL' },
					statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [] }],
				},
				{
					team: { id: '21', abbreviation: 'PHI' },
					statistics: [{
						name: 'passing',
						labels: ['C/ATT', 'YDS'],
						keys: ['completions/passingAttempts', 'passingYards'],
						athletes: [{ athlete: { shortName: 'J. Hurts' }, stats: ['3/4', '41'] }],
					}],
				},
			] } };
			mountBox(games.football, parseBoxScore(payload, '21', '6', 'PHI', 'DAL'));

			cy.get('.gd-box-tabs').should('not.exist');
			cy.get('.gd-box-players .gd-box-player').should('have.text', 'J. Hurts');
			// The home side is what rendered, so the home team is what the block may name.
			cy.get('.gd-box-players .gd-box-line-abbr')
				.should('have.length', 1)
				.and('have.text', games.football.homeTeam.abbreviation);
			cy.get('.gd-box-players .gd-box-line-crest').should('have.length', 1);
		});

		it('says DNP for a player ESPN flagged without giving a reason', () => {
			const payload = { boxscore: { players: [
				{
					team: { id: '4', abbreviation: 'CHI' },
					statistics: [{
						labels: ['MIN', 'PTS'],
						keys: ['minutes', 'points'],
						athletes: [
							{ starter: true, athlete: { shortName: 'C. White' }, stats: ['28', '19'] },
							{ didNotPlay: true, athlete: { shortName: 'Z. Collins' }, stats: [] },
						],
					}],
				},
			] } };
			mountBox(games.basketball, parseBoxScore(payload, '20', '4', 'PHI', 'CHI'));

			cy.get('.gd-box-dnp').should('have.length', 1).and('have.text', en.box.didNotPlay);
			// And last, rather than sorted in among the bench.
			cy.get('.gd-box-players tbody tr').last().should('contain.text', 'Z. Collins');
		});

		it('collapses an expanded category again when the team switches', () => {
			// The reader asked for all of Dallas's defenders, not for however many Philadelphia
			// happens to have.
			mount(games.football);
			cy.contains('.gd-box-subheading', en.box.defensive).next('table').as('defense');
			cy.get('@defense').find('tbody tr').should('have.length', 6);
			cy.get('.gd-box-more').click();
			cy.get('@defense').find('tbody tr').should('have.length', 8);

			cy.get('.gd-box-tabs .nav-link').eq(1).click();
			cy.contains('.gd-box-subheading', en.box.defensive).next('table')
				.find('tbody tr').should('have.length', 6);
		});

		it('gives basketball one table with the condensed column order', () => {
			mount(games.basketball);
			cy.get('.gd-box-players .gd-box-subheading').should('have.length', 1).and('have.text', en.box.players);
			cy.get('.gd-box-players thead th, .gd-box-players thead td').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(
					['', 'MIN', 'PTS', 'REB', 'AST', 'FG', '3PT'],
				);
			});
		});

		it('sorts basketball starters, then bench, then did-not-play', () => {
			mount(games.basketball);
			cy.get('.gd-box-players tbody .gd-box-name .gd-box-player').then($names => {
				const order = [...$names].map(el => el.textContent?.trim());
				expect(order.slice(0, 5)).to.deep.equal(['C. White', 'N. Vucevic', 'J. Giddey', 'P. Williams', 'M. Buzelis']);
				expect(order[order.length - 1]).to.equal('Z. Collins');
			});
			// DNP says DNP rather than a row of zeros, and never ESPN's English reason.
			cy.get('.gd-box-dnp').should('have.text', en.box.didNotPlay);
			cy.contains("COACH'S DECISION").should('not.exist');
		});

		it('puts the batting order in order and indents the substitute', () => {
			mount(games.baseball);
			cy.get('.gd-box-players tbody .gd-box-name').first().should('contain.text', 'F. Lindor');
			cy.get('.gd-box-name-sub').should('contain.text', 'T. Nimmo');
			cy.get('.gd-box-name-sub').then($sub => {
				const indent = Number.parseFloat(getComputedStyle($sub[0]).paddingLeft);
				expect(indent, 'a substitute sits under the slot it took over').to.be.greaterThan(6);
			});
		});

		it('gives baseball a totals row and football none', () => {
			mount(games.baseball);
			cy.get('.gd-box-players tfoot th').first().should('have.text', en.box.totals);
			mount(games.football);
			cy.get('.gd-box-players tfoot').should('not.exist');
		});

		it('splits hockey by position group and drops the empty skaters category', () => {
			mount(games.hockey);
			cy.get('.gd-box-players .gd-box-subheading').then($h => {
				expect([...$h].map(el => el.textContent?.trim())).to.deep.equal(
					[en.box.forwards, en.box.defensemen, en.box.goaltending],
				);
			});
		});

		it('drops the goalie who never took the ice', () => {
			mount(games.hockey);
			cy.get('.gd-box-players').should('contain.text', 'T. Jarry');
			// The backup arrives all zeros and would show a .000 save percentage.
			cy.get('.gd-box-players').should('not.contain.text', 'J. Blomqvist');
			cy.get('.gd-box-players').should('not.contain.text', '.000');
		});

		it('orders hockey skaters by points, not by ESPN array order', () => {
			mount(games.hockey);
			cy.get('.gd-box-tabs .nav-link').eq(1).click();
			cy.get('.gd-box-players tbody .gd-box-player').then($names => {
				// Konecny 1G 1A leads Michkov 1G 0A, who leads Couturier 0G 1A.
				expect([...$names].map(el => el.textContent?.trim()).slice(0, 3))
					.to.deep.equal(['T. Konecny', 'M. Michkov', 'S. Couturier']);
			});
		});

		it('caps a long football category and expands it on request', () => {
			mount(games.football);
			cy.contains('.gd-box-subheading', en.box.defensive)
				.next('table').as('defense');
			cy.get('@defense').find('tbody tr').should('have.length', 6);
			cy.get('.gd-box-more').should('have.text', en.box.showAll.replace('{count}', '8')).click();
			cy.get('@defense').find('tbody tr').should('have.length', 8);
			cy.get('.gd-box-more').should('have.text', en.box.showFewer);
		});

		it('keeps a college column set that the NFL sends and college does not', () => {
			// The NFL fixture carries SACKS under passing and TGTS under receiving; a category is
			// selected by ESPN's own keys, so a league sending neither simply has fewer columns.
			mount(games.football);
			cy.contains('.gd-box-subheading', en.box.passing).next('table').find('thead th, thead td')
				.then($th => expect([...$th].map(el => el.textContent?.trim()))
					.to.deep.equal(['', 'C/ATT', 'YDS', 'AVG', 'TD', 'INT', 'SACKS']));
		});

		it('renders no player tables for soccer, which sends none', () => {
			mount(games.soccer);
			cy.get('.gd-box').should('exist');
			cy.get('.gd-box-players').should('not.exist');
			cy.get('.gd-box-tabs').should('not.exist');
		});
	});

	describe('team comparison', () => {
		it('puts the away value, the label and the home value in one row', () => {
			mount(games.soccer);
			cy.get('.gd-box-compare thead th, .gd-box-compare thead td').then($th => {
				expect([...$th].map(el => el.textContent?.trim())).to.deep.equal(['NYR', '', 'PHI']);
			});
			cy.contains('.gd-box-compare-label', en.box.possession).parent().find('td')
				.then($td => expect([...$td].map(el => el.textContent?.trim())).to.deep.equal(['53.2', '46.8']));
		});

		it('prints the rows a match panel prints, in that order, and no others', () => {
			// Pinned to the whole list rather than asserting one row is absent. The previous
			// version looked for ESPN's own 'On Target %' string, which no locale file contains
			// and which every label renders through `i18n.t` — so the derived column could have
			// been rendered under our own translated label and the assertion would still pass.
			// It is the ordering rule and the conditional penalty rows in one measurement now.
			mount(games.soccer);
			cy.get('.gd-box-compare tbody .gd-box-compare-label').then($labels => {
				expect([...$labels].map(el => el.textContent?.trim())).to.deep.equal([
					en.box.possession, en.box.shotsTaken, en.box.onGoal, en.box.corners,
					en.box.savesMade, en.box.offsides, en.box.fouls, en.box.yellowCards,
					en.box.redCards, en.box.penaltyKicks, en.box.penaltyGoals,
				]);
			});
		});

		it('reads nothing from the nested tree baseball sends', () => {
			mount(games.baseball);
			cy.get('.gd-box-compare').should('not.exist');
			// The R-H-E on the line score is already the team line.
			cy.get('.gd-box-line-table').should('exist');
		});
	});

	describe('layout', () => {
		it('never pushes a cell past the popup edge, in any sport', () => {
			for (const sport of Object.keys(games) as (keyof typeof games)[]) {
				mount(games[sport]);
				cells().each($cell => {
					expect($cell[0].getBoundingClientRect().right, `${sport} cell within 320px`)
						.to.be.at.most(320);
				});
			}
		});

		it('keeps the table on the light card rather than the dark popup default', () => {
			mount(games.basketball);
			// $table-bg defaults to var(--as-body-bg), which is #0d1117 on this theme.
			cy.get('.gd-box-table tbody td').first().then($td => {
				const style = getComputedStyle($td[0]);
				expect(style.color).to.equal('rgb(17, 24, 39)');
				expect(style.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
			});
			// An absence, deliberately. Bootstrap 5.3 draws the group separator only through the
			// opt-in `.table-group-divider` class, which nothing in our source uses, so the
			// `tbody` here has no top border at all — and reading a colour off a border that is
			// not drawn is an assertion that cannot fail. `$table-group-separator-color` is set in
			// the stylesheet as a guard for the first component that does opt in.
			cy.get('.gd-box-table tbody').first().then($tbody => {
				expect(getComputedStyle($tbody[0]).borderTopWidth).to.equal('0px');
			});
		});

		it('keeps the selected tab on the card colour, not the dark body default', () => {
			mount(games.basketball);
			cy.get('.gd-box-tabs .nav-link.active').then($tab => {
				const style = getComputedStyle($tab[0]);
				expect(style.backgroundColor).to.equal('rgb(248, 250, 252)');
				expect(style.color).to.equal('rgb(17, 24, 39)');
			});
			// $nav-link-color is the orange link colour, which reaches only 3.0:1 here.
			cy.get('.gd-box-tabs .nav-link').not('.active').then($tab => {
				expect(getComputedStyle($tab[0]).color).to.equal('rgb(75, 85, 99)');
			});
		});

		it('truncates a long name instead of a stat', () => {
			mount(games.football);
			cy.contains('.gd-box-subheading', en.box.defensive).next('table')
				.find('tbody tr').first().as('row');
			cy.get('@row').find('.gd-box-name').then($name => {
				expect(getComputedStyle($name[0]).textOverflow).to.equal('ellipsis');
			});
			cy.get('@row').find('td').each($td => {
				expect($td[0].scrollWidth, 'a stat is never clipped').to.be.at.most($td[0].clientWidth + 1);
			});
		});
	});

	describe('team identity', () => {
		it('puts each team\'s crest beside its abbreviation on the line score', () => {
			mount(games.baseball);
			cy.get('.gd-box-line-table tbody tr').should('have.length', 2);
			cy.get('.gd-box-line-crest').should('have.length', 2);
			cy.get('.gd-box-line-table tbody tr').eq(0).find('.gd-box-line-abbr').should('have.text', 'NYM');
			cy.get('.gd-box-line-table tbody tr').eq(1).find('.gd-box-line-abbr').should('have.text', 'PHI');
			// The crest sits to the left of the abbreviation, the way the leader rows read.
			cy.get('.gd-box-line-table tbody tr').eq(0).then($row => {
				const crest = $row.find('.gd-box-line-crest')[0].getBoundingClientRect();
				const abbr = $row.find('.gd-box-line-abbr')[0].getBoundingClientRect();
				expect(crest.right).to.be.at.most(abbr.left + 1);
			});
		});

		it('washes each row in its own team\'s colour, fading out before the totals', () => {
			mount(games.baseball);
			cy.get('.gd-box-line-table tbody tr').eq(0).then($row => {
				// The away row takes the Mets navy at the 28 alpha the matchup card uses.
				expect(getComputedStyle($row[0]).backgroundImage)
					.to.contain('rgba(0, 45, 114, 0.157)');
			});
			cy.get('.gd-box-line-table tbody tr').eq(1).then($row => {
				expect(getComputedStyle($row[0]).backgroundImage)
					.to.contain('rgba(232, 24, 40, 0.157)');
			});
		});

		it('leaves a colour that already reads well as the team\'s own', () => {
			mount(games.baseball);
			// #002D72 is 12.4:1 on this card, so clamping it would only muddy it.
			cy.get('.gd-box-line-table tbody tr').eq(0).find('.gd-box-line-abbr')
				.should('have.css', 'color', 'rgb(0, 45, 114)');
		});

		it('darkens a gold abbreviation until it is actually readable', () => {
			mount(games.hockey);
			// Pittsburgh's #CFC493 reaches 1.68:1 untouched — the case an eyeball lets through. Pinned
			// to the exact clamped value rather than to "readable", which the inherited ink also is.
			cy.get('.gd-box-line-table tbody tr').eq(0).find('.gd-box-line-abbr').then($abbr => {
				const color = getComputedStyle($abbr[0]).color;
				expect(color, 'the raw gold is gone').to.not.equal('rgb(207, 196, 147)');
				expect(color, 'and a team colour did arrive, rather than nothing').to.not.equal(inheritedCardInk);
				expect(color, 'clamped to a dark bronze').to.equal('rgb(114, 108, 80)');
				expect(contrastOnCard(color)).to.be.at.least(4.5);
			});
			// The other side is the Flyers' orange, 3.40:1 raw, so it moves too.
			cy.get('.gd-box-line-table tbody tr').eq(1).find('.gd-box-line-abbr')
				.should('have.css', 'color', 'rgb(182, 54, 2)');
		});

		it('clears 4.5:1 for every team abbreviation in every sport', () => {
			for (const sport of Object.keys(games) as (keyof typeof games)[]) {
				mount(games[sport]);
				cy.get('.gd-box-line-abbr, .gd-box-compare-team').each($el => {
					const color = getComputedStyle($el[0]).color;
					// The floor is only worth asserting once a colour is known to have arrived: the
					// inherited ink clears 4.5:1 on its own.
					expect(color, `${sport} ${$el.text()} carries a team colour`).to.not.equal(inheritedCardInk);
					expect(contrastOnCard(color), `${sport} ${$el.text()}`).to.be.at.least(4.5);
				});
			}
		});

		it('colours the team stats column heads to match the line score', () => {
			mount(games.hockey);
			cy.get('.gd-box-compare-team').should('have.length', 2);
			cy.get('.gd-box-line-table tbody tr').eq(0).find('.gd-box-line-abbr').then($abbr => {
				const lineColor = getComputedStyle($abbr[0]).color;
				// Both being the inherited ink would satisfy "they match" while proving nothing.
				expect(lineColor).to.not.equal(inheritedCardInk);
				cy.get('.gd-box-compare-team').eq(0)
					.should('have.css', 'color', lineColor)
					.and('have.text', 'PIT');
			});
		});

	});

	describe('localization', () => {
		// Each key measured in the element it actually renders in. `box.heading` is the only one of
		// these that reaches `.gd-setup-heading`; the four period and section words render in
		// `.gd-box-subheading`, which is 0.55rem, uppercased and letter-spaced, and the team-stats
		// heading needs a sport that has a comparison table at all.
		const headingCases: [keyof typeof en.box, keyof typeof games, string, number][] = [
			['heading', 'baseball', '.gd-box > .gd-setup-heading', 0],
			['byInning', 'baseball', '.gd-box-line .gd-box-subheading', 0],
			['teamStats', 'hockey', '.gd-box-compare .gd-box-subheading', 0],
			['batting', 'baseball', '.gd-box-players .gd-box-subheading', 0],
			['pitching', 'baseball', '.gd-box-players .gd-box-subheading', 1],
		];

		for (const [key, sport, selector, index] of headingCases) {
			it(`fits every locale's box.${key} on one line`, () => {
				mount(games[sport]);
				for (const [code, bundle] of Object.entries(locales)) {
					const value = (bundle as typeof en).box[key];
					cy.get(selector).eq(index).then($el => {
						const el = $el[0];
						const original = el.textContent;
						el.textContent = value;
						const height = el.getBoundingClientRect().height;
						const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
						expect(height, `${code}.box.${key} on one line`).to.be.at.most(lineHeight * 1.6);
						el.textContent = original;
					});
				}
			});
		}

		// `box.totals` is out of the loop above rather than measured in it: it renders in a
		// `tfoot th.gd-box-name`, which carries `max-width: 0` and an ellipsis and physically
		// cannot wrap however long the word is.
		it('ellipsizes the totals label rather than wrapping it', () => {
			mount(games.baseball);
			cy.get('.gd-box-players tfoot th').first().then($th => {
				expect($th.text()).to.equal(en.box.totals);
				const style = getComputedStyle($th[0]);
				expect(style.textOverflow).to.equal('ellipsis');
				expect(style.whiteSpace).to.equal('nowrap');
			});
		});

		// The line score's header row is the tightest in the product, and the period keys land in
		// it in three scripts. Measured as a whole row for the same reason the column sets below
		// are: substituting one locale's label into a column the browser sized for English
		// measures it against a box it will never render in, which is what once reported both
		// Chinese locales overflowing a row they fit.
		const measurePeriodHeadRow = (labelsFor: (bundle: typeof en) => string[]) => {
			cy.get('.gd-box-line-table').then($table => {
				const table = $table[0];
				const heads = [...table.querySelectorAll('thead th')] as HTMLElement[];
				const teamCell = table.querySelector('thead .gd-box-line-team') as HTMLElement;
				const originals = heads.map(head => head.textContent);

				for (const [code, bundle] of Object.entries(locales)) {
					const labels = labelsFor(bundle as typeof en);
					expect(labels, 'the label set matches what this row renders').to.have.length(heads.length);
					heads.forEach((head, index) => { head.textContent = labels[index]; });

					// The table is `table-layout: fixed`, so a heading too wide for its column
					// overflows the cell rather than widening the table. The clipping is what has
					// to be asserted; a table-level width check cannot see it.
					for (const head of heads) {
						expect(head.scrollWidth, `${code} "${head.textContent}" is not clipped`)
							.to.be.at.most(head.clientWidth + 1);
					}
					expect(table.getBoundingClientRect().right, `${code} stays inside the card`)
						.to.be.at.most(320);
					expect(teamCell.getBoundingClientRect().width, `${code} leaves the team column its width`)
						.to.be.greaterThan(40);
				}

				heads.forEach((head, index) => { head.textContent = originals[index]; });
			});
		};

		it('fits every locale\'s soccer period headings in the line score', () => {
			soccerPenalties();
			measurePeriodHeadRow(bundle => [
				'1', '2', bundle.box.periodEt1, bundle.box.periodEt2, bundle.box.periodPen, bundle.box.lineTotal,
			]);
		});

		it('fits every locale\'s hockey shootout heading in the line score', () => {
			hockeyShootout();
			measurePeriodHeadRow(bundle => [
				'1', '2', '3', bundle.box.overtime, bundle.box.periodSo, bundle.box.lineTotal,
			]);
		});

		// Measured as whole rows rather than one label at a time. Substituting a single locale's
		// label into a column the browser sized for English measures it against a box it will never
		// render in — the columns share the row's width, and the name column is what gives way.
		const columnSets: [keyof typeof games, number, readonly (keyof typeof en.box)[]][] = [
			['baseball', 0, ['hitsAtBats', 'runs', 'rbi', 'homeRuns', 'walks', 'strikeouts']],
			['baseball', 1, ['inningsPitched', 'hits', 'runs', 'earnedRuns', 'walks', 'strikeouts']],
			['basketball', 0, ['minutes', 'points', 'rebounds', 'assists', 'fieldGoals', 'threePointers']],
			['hockey', 0, ['goals', 'hockeyAssists', 'plusMinus', 'shots', 'penaltyMinutes', 'timeOnIce']],
			['hockey', 2, ['goalsAgainst', 'shotsAgainst', 'saves', 'savePct', 'timeOnIce']],
		];

		for (const [sport, tableIndex, keys] of columnSets) {
			it(`fits every locale's ${sport} columns without overflowing table ${tableIndex}`, () => {
				mount(games[sport]);
				cy.get('.gd-box-players table').eq(tableIndex).then($table => {
					const table = $table[0];
					const heads = [...table.querySelectorAll('thead th')] as HTMLElement[];
					expect(heads, 'the column set matches what this table renders').to.have.length(keys.length);
					const nameCell = table.querySelector('tbody .gd-box-name') as HTMLElement;
					const originals = heads.map(head => head.textContent);

					for (const [code, bundle] of Object.entries(locales)) {
						heads.forEach((head, index) => {
							head.textContent = ((bundle as typeof en).box as Record<string, string>)[keys[index]];
						});
						expect(table.scrollWidth, `${code} ${sport} columns fit the card`)
							.to.be.at.most(table.clientWidth);
						// Chinese spells these columns out — 安打-打数 against H-AB — which takes the
						// room out of the name column rather than out of the card. It still has to
						// hold a name: "M. Pettersson" runs about 75px.
						expect(nameCell.getBoundingClientRect().width, `${code} ${sport} name column still readable`)
							.to.be.greaterThan(80);
					}

					heads.forEach((head, index) => { head.textContent = originals[index]; });
				});
			});
		}
	});
});
