import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import type { Game, SportType } from '@arenaswap/core/types';
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

const preGame: Game = {
	id: 'mock-3',
	league: 'nfl',
	sportType: 'football',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
	venueName: 'Arrowhead Stadium',
	broadcasts: ['CBS'],
	odds: { details: 'KC -3.5', overUnder: 47.5, provider: { name: 'ESPN BET' } },
	homeTeam: { id: '1', name: 'Kansas City Chiefs', abbreviation: 'KC', score: 0, color: '#E31837', alternateColor: '#FFB81C' },
	awayTeam: { id: '3', name: 'Buffalo Bills', abbreviation: 'BUF', score: 0, color: '#00338D', alternateColor: '#C60C30' },
};

const openTabs = [
	{ id: 2, title: 'CBS Sports', url: 'https://cbssports.com' },
	{ id: 3, title: 'NFL.com', url: 'https://nfl.com' },
] as never;

interface MountOptions {
	favorites?: string[];
	onToggleFavoriteTeam?: (leagueId: string, teamId: string) => void;
}

const mountPre = (game: Game, options: MountOptions = {}) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{ [game.id]: 10 }}
			bettingPrefs={{ bettingEnabled: true }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			favoriteTeamIds={new Set(options.favorites ?? [])}
			openTabs={openTabs}
			registry={[{ tabId: 2, gameId: game.id }]}
			onToggleFavoriteTeam={options.onToggleFavoriteTeam ?? (() => {})}
			onRegistryChange={() => {}}
			formatTabLabel={(tab: { title?: string }) => tab.title ?? ''}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('pre-game detail screen', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	// Nothing has happened yet, so every signal would read zero.
	it('drops the PowerScore breakdown entirely', () => {
		mountPre(preGame);
		cy.get('.powerscore-breakdown').should('not.exist');
		cy.get('.gd-poster').should('exist');
	});

	it('keeps the breakdown once the game is live', () => {
		mountPre({ ...preGame, status: 'in', period: 2, clockSeconds: 300 });
		cy.get('.powerscore-breakdown').should('exist');
		cy.get('.gd-poster').should('not.exist');
		cy.get('.game-detail-matchup').should('exist');
	});

	// The poster is a card in the column, not a full-bleed banner: it lines up with the setup
	// card below it and carries the same rounded corner as every other card on the screen.
	it('sits on the same card geometry as the rest of the screen', () => {
		mountPre(preGame);
		cy.get('.gd-setup').then(([setup]: JQuery<HTMLElement>) => {
			cy.get('.gd-poster').should(([poster]: JQuery<HTMLElement>) => {
				const card = setup.getBoundingClientRect();
				const box = poster.getBoundingClientRect();
				expect(box.left, 'shares the column left edge').to.be.closeTo(card.left, 0.5);
				expect(box.width, 'shares the column width').to.be.closeTo(card.width, 0.5);
				expect(getComputedStyle(poster).borderRadius, 'rounded like a card').to.equal('8px');
			});
		});
	});

	it('runs the team colours left to right', () => {
		mountPre(preGame);
		cy.get('.gd-poster').should(([poster]: JQuery<HTMLElement>) => {
			const background = getComputedStyle(poster).backgroundImage;
			expect(background, 'horizontal, not diagonal').to.contain('linear-gradient(to right');
			expect(background, 'away colour leads').to.contain('rgb(0, 51, 141)');
			expect(background, 'home colour trails').to.contain('rgb(227, 24, 55)');
		});
	});

	// A navy crest on a navy half of the poster is invisible, which is why the disc exists.
	it('backs each crest with a white disc tinted in its own team colour', () => {
		mountPre(preGame);
		cy.get('.gd-poster-crest').should('have.length', 2);
		cy.get('.gd-poster-crest').each(($crest: JQuery<HTMLElement>) => {
			const background = getComputedStyle($crest[0]!).backgroundImage;
			expect(background, 'tint sits over white').to.contain('linear-gradient');
			expect(getComputedStyle($crest[0]!).backgroundColor, 'disc is white beneath the tint')
				.to.equal('rgb(255, 255, 255)');
		});
	});

	// The poster's crests come from ESPN, so the slot has to hold its box before they arrive.
	it('holds the crest box with the abbreviation until the logo lands', () => {
		mountPre(preGame);
		cy.get('.gd-poster-crest-logo').should('have.length', 2).each(($crest: JQuery<HTMLElement>) => {
			const box = $crest[0]!.getBoundingClientRect();
			expect(box.width, 'crest width').to.equal(44);
			expect(box.height, 'crest height').to.equal(44);
			expect(getComputedStyle($crest[0]!.querySelector('.crest-fallback')!).backgroundColor,
				'no second disc inside the tinted one').to.equal('rgba(0, 0, 0, 0)');
		});
	});

	it('carries a favourite star per team, reflecting current state', () => {
		mountPre(preGame, { favorites: ['nfl:1'] });
		cy.get('.gd-poster-star').should('have.length', 2);
		cy.get('.gd-poster-team').eq(0).find('.gd-poster-star').should('have.attr', 'data-favorited', 'false');
		cy.get('.gd-poster-team').eq(1).find('.gd-poster-star').should('have.attr', 'data-favorited', 'true');
		cy.get('.gd-poster-team').eq(1).find('.bi-star-fill').should('exist');
	});

	it('toggles the team the star belongs to', () => {
		const toggled: string[] = [];
		mountPre(preGame, { onToggleFavoriteTeam: (_league, teamId) => toggled.push(teamId) });
		cy.get('.gd-poster-team').eq(0).find('.gd-poster-star').click();
		cy.wrap(toggled).should('deep.equal', ['3']);
	});

	it('offers the tab picker and the boost, and no favourites row', () => {
		mountPre(preGame);
		cy.get('.gd-setup .game-card-tab-assign select').should('exist');
		cy.get('.gd-setup .powerscore-boost-input').should('have.value', '10');
		cy.get('.gd-setup').should('not.contain.text', 'avorite');
	});

	// The boost is the one control that was previously hidden until the game started.
	it('shows the boost before the game starts', () => {
		mountPre(preGame);
		cy.get('.powerscore-boost-input').should('exist');
	});

	it('names what the countdown is counting down to, per sport', () => {
		const cases: [SportType, string][] = [
			['basketball', 'tip-off'],
			['football', 'kickoff'],
			['soccer', 'kickoff'],
			['hockey', 'puck drop'],
			['baseball', 'first pitch'],
			['softball', 'first pitch'],
		];
		for (const [sportType, phrase] of cases) {
			mountPre({ ...preGame, sportType });
			cy.get('.gd-setup-heading').should('contain.text', phrase);
		}
	});

	it('falls back to gametime for a sport with no word of its own', () => {
		mountPre({ ...preGame, sportType: undefined as unknown as SportType });
		cy.get('.gd-setup-heading').should('contain.text', 'gametime');
	});

	// A postponement is the one thing with something to say before the start time.
	it('surfaces a delay on the poster', () => {
		mountPre({ ...preGame, delayed: true, delayDescription: 'Postponed' });
		cy.get('.gd-poster-status').should('contain.text', 'Postponed');
	});

	it('has no status line on a normal pre-game game', () => {
		mountPre(preGame);
		cy.get('.gd-poster-status').should('not.exist');
	});

	it('keeps every locale heading on one line in the card', () => {
		mountPre(preGame);
		cy.get('.gd-setup-heading').then(([heading]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(heading);
			const oneLine = parseFloat(style.lineHeight) + parseFloat(style.paddingBottom) + 1;
			for (const [name, locale] of Object.entries(locales)) {
				const detail = locale.detail as unknown as Record<string, string>;
				const headingKeys = [
					'getReadyTipOff', 'getReadyKickoff', 'getReadyPuckDrop', 'getReadyFirstPitch', 'getReadyGametime',
					'probablePitchers', 'probableGoalies', 'teamLeaders',
				];
				for (const key of headingKeys) {
					heading.textContent = detail[key] ?? '';
					expect(heading.getBoundingClientRect().height, `${name}.${key} stays on one line`)
						.to.be.at.most(oneLine);
				}
			}
		});
	});

	describe('probable starters and team leaders', () => {
		const pitchers: Game = {
			...preGame,
			id: 'mlb-pre',
			league: 'mlb',
			sportType: 'baseball',
			homeTeam: {
				...preGame.homeTeam,
				name: 'New York Mets',
				abbreviation: 'NYM',
				record: '76-58',
				probableStarter: { name: 'D. Peterson', line: '(7-7, 5.17)' },
				leaders: [
					{ category: 'homeruns', fallbackLabel: 'HR', player: 'J. Soto', value: '33' },
					{ category: 'rbis', fallbackLabel: 'RBI', player: 'P. Alonso', value: '83' },
				],
			},
			awayTeam: {
				...preGame.awayTeam,
				name: 'Detroit Tigers',
				abbreviation: 'DET',
				record: '70-64',
				probableStarter: { name: 'T. Skubal', line: '(13-4, 2.21)' },
				leaders: [
					{ category: 'homeruns', fallbackLabel: 'HR', player: 'K. Carpenter', value: '28' },
					{ category: 'rbis', fallbackLabel: 'RBI', player: 'S. Torkelson', value: '100' },
				],
			},
		};

		const goalies: Game = {
			...preGame,
			id: 'nhl-pre',
			league: 'nhl',
			sportType: 'hockey',
			homeTeam: {
				...preGame.homeTeam,
				record: '24-16-4',
				probableStarter: { name: 'J. Swayman', status: 'confirmed' },
			},
			awayTeam: {
				...preGame.awayTeam,
				record: '22-18-5',
				probableStarter: { name: 'S. Montembeault', status: 'expected' },
			},
		};

		it('shows both pitchers with the line ESPN pre-formats', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stats .gd-pregame-starter-name').should('have.length', 2);
			cy.get('.gd-pregame-starter-name').eq(0).should('have.text', 'T. Skubal');
			cy.get('.gd-pregame-starter-line').eq(0).should('have.text', '(13-4, 2.21)');
			cy.get('.gd-pregame-starter-name').eq(1).should('have.text', 'D. Peterson');
		});

		// Away left, home right, on the same side of the card as their crest. Not asserted as a
		// pixel-identical centroid: the poster and this card have different padding and different
		// centre columns, so the two grids cannot share one centre line.
		it('keeps each starter on its own team side of the card', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stats').then(([card]: JQuery<HTMLElement>) => {
				const midline = card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
				cy.get('.gd-pregame-starter').eq(0).then(([away]: JQuery<HTMLElement>) => {
					expect(away.getBoundingClientRect().right).to.be.at.most(midline);
				});
				cy.get('.gd-pregame-starter').eq(1).then(([home]: JQuery<HTMLElement>) => {
					expect(home.getBoundingClientRect().left).to.be.at.least(midline);
				});
			});
		});

		it('holds the grid when only one side has a starter', () => {
			mountPre({ ...pitchers, homeTeam: { ...pitchers.homeTeam, probableStarter: undefined } });
			cy.get('.gd-pregame-starter-name').should('have.length', 1);
			cy.get('.gd-pregame-mirror').eq(0).then(([row]: JQuery<HTMLElement>) => {
				const columns = getComputedStyle(row).gridTemplateColumns.split(' ').map(parseFloat);
				expect(columns).to.have.length(3);
				// The two outer columns stay equal, so the one name we have does not re-centre.
				expect(Math.abs(columns[0]! - columns[2]!)).to.be.at.most(1);
			});
		});

		it('shows a goalie with a status and no stat line', () => {
			mountPre(goalies);
			cy.contains('.gd-setup-heading', 'Probable goalies').should('exist');
			cy.get('.gd-pregame-starter-line').should('not.exist');
			cy.get('.gd-pregame-starter-status').eq(0).should('have.text', 'Expected');
			cy.get('.gd-pregame-starter-status').eq(1).should('have.text', 'Confirmed');
		});

		it('renders one leader row per category, away and home either side of the label', () => {
			mountPre(pitchers);
			cy.contains('.gd-setup-heading', 'Team leaders').should('exist');
			cy.get('.gd-pregame-leader').should('have.length', 4);
			cy.get('.gd-pregame-label').eq(1).should('have.text', 'HR');
			cy.get('.gd-pregame-label').eq(2).should('have.text', 'RBI');
			cy.get('.gd-pregame-leader-value').eq(0).should('have.text', '28');
			cy.get('.gd-pregame-leader-value').eq(1).should('have.text', '33');
		});

		// A hockey points leader must not borrow basketball's label, and vice versa.
		it('labels a category by sport, not by ESPN name alone', () => {
			const hockeyPoints = {
				...goalies,
				homeTeam: { ...goalies.homeTeam, leaders: [{ category: 'points', fallbackLabel: 'Points', player: 'D. Pastrnak', value: '69' }] },
			};
			mountPre(hockeyPoints);
			cy.get('.gd-pregame-label').last().should('have.text', 'PTS');
		});

		it('falls back to the ESPN abbreviation for a category we have no label for', () => {
			const unknown = {
				...pitchers,
				homeTeam: { ...pitchers.homeTeam, leaders: [{ category: 'stolenbases', fallbackLabel: 'SB', player: 'F. Lindor', value: '29' }] },
				awayTeam: { ...pitchers.awayTeam, leaders: [] },
			};
			mountPre(unknown);
			cy.get('.gd-pregame-label').last().should('have.text', 'SB');
		});

		it('renders nothing at all when a sport sends neither', () => {
			mountPre(preGame);
			cy.get('.gd-pregame-stats').should('not.exist');
			cy.get('.gd-setup').should('exist');
		});

		it('prefers the scoreboard record over a summary fetch on the poster', () => {
			mountPre(pitchers);
			cy.get('.gd-poster-record').eq(0).should('have.text', '70-64');
			cy.get('.gd-poster-record').eq(1).should('have.text', '76-58');
		});

		// The centre column is the only fixed width in the grid, so it is the one thing a long
		// translation can push out of shape.
		it('fits every locale leader label in the centre column', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-label').eq(1).then(([label]: JQuery<HTMLElement>) => {
				const budget = label.getBoundingClientRect().width;
				const keys = [
					'leaderAvg', 'leaderHomeRuns', 'leaderRbis', 'leaderPoints', 'leaderRebounds',
					'leaderAssists', 'leaderGoals', 'leaderHockeyAssists', 'leaderHockeyPoints',
					'leaderPassing', 'leaderRushing', 'leaderReceiving',
				];
				const probe = document.createElement('span');
				const style = getComputedStyle(label);
				probe.style.font = style.font;
				probe.style.letterSpacing = style.letterSpacing;
				probe.style.position = 'absolute';
				probe.style.whiteSpace = 'nowrap';
				document.body.appendChild(probe);
				for (const [name, locale] of Object.entries(locales)) {
					const detail = locale.detail as unknown as Record<string, string>;
					for (const key of keys) {
						probe.textContent = detail[key] ?? '';
						expect(probe.getBoundingClientRect().width, `${name}.${key} fits the label column`)
							.to.be.at.most(budget);
					}
				}
				probe.remove();
			});
		});
	});
});
