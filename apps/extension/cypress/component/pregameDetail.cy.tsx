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

const shot = (id: string) => `https://a.espncdn.com/i/headshots/mlb/players/full/${id}.png`;

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
				probableStarter: { name: 'D. Peterson', winLoss: '7-7', era: '5.17', headshot: shot('40921') },
				leaders: [
					{ category: 'homeruns', fallbackLabel: 'HR', player: 'J. Soto', value: '33', headshot: shot('36969') },
					{ category: 'rbis', fallbackLabel: 'RBI', player: 'P. Alonso', value: '83' },
				],
			},
			awayTeam: {
				...preGame.awayTeam,
				name: 'Detroit Tigers',
				abbreviation: 'DET',
				record: '70-64',
				probableStarter: { name: 'T. Skubal', winLoss: '13-4', era: '2.21', headshot: shot('39909') },
				leaders: [
					{ category: 'homeruns', fallbackLabel: 'HR', player: 'K. Carpenter', value: '28' },
					{ category: 'rbis', fallbackLabel: 'RBI', player: 'S. Torkelson', value: '100' },
				],
			},
		};

		// The reason the leaders row is full width. Real values from a live NFL scoreboard.
		const football: Game = {
			...preGame,
			id: 'nfl-pre',
			sportType: 'football',
			homeTeam: {
				...preGame.homeTeam,
				abbreviation: 'BUF',
				record: '2-0',
				leaders: [
					{ category: 'passing', fallbackLabel: 'PASS', player: 'K. Allen', value: '10/12, 128 YDS, 1 TD' },
					{ category: 'rushing', fallbackLabel: 'RUSH', player: 'J. Cook', value: '14 CAR, 56 YDS' },
				],
			},
			awayTeam: {
				...preGame.awayTeam,
				abbreviation: 'PIT',
				record: '1-1',
				leaders: [
					{ category: 'passing', fallbackLabel: 'PASS', player: 'A. Rodgers', value: '14/23, 141 YDS, 1 INT' },
					{ category: 'rushing', fallbackLabel: 'RUSH', player: 'J. Warren', value: '9 CAR, 41 YDS, 1 TD' },
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

		it('shows both pitchers with their record and ERA', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stats .gd-pregame-starter-name').should('have.length', 2);
			cy.get('.gd-pregame-starter-name').eq(0).should('have.text', 'T. Skubal');
			cy.get('.gd-pregame-starter-name').eq(1).should('have.text', 'D. Peterson');
			cy.get('.gd-pregame-stat-value').eq(0).should('have.text', '13-4');
			cy.get('.gd-pregame-stat-value').eq(1).should('have.text', '2.21');
		});

		// "(3-1, 4.23)" says nothing about what either number is.
		it('labels each pitcher number under the value', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stat').should('have.length', 4);
			cy.get('.gd-pregame-stat-label').eq(0).should('have.text', 'W-L');
			cy.get('.gd-pregame-stat-label').eq(1).should('have.text', 'ERA');
			cy.get('.gd-pregame-stat').eq(0).then(([pair]: JQuery<HTMLElement>) => {
				const value = pair.querySelector('.gd-pregame-stat-value')!.getBoundingClientRect();
				const label = pair.querySelector('.gd-pregame-stat-label')!.getBoundingClientRect();
				expect(label.top, 'label sits under its value').to.be.at.least(value.bottom - 1);
			});
		});

		// Not Lekton. These are read as numbers in prose, not scanned down a column.
		it('sets the pitcher and leader numbers in the body face', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stat-value').eq(0).then(([el]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(el).fontFamily.toLowerCase()).to.not.include('lekton');
			});
			cy.get('.gd-pregame-leader-value').eq(0).then(([el]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(el).fontFamily.toLowerCase()).to.not.include('lekton');
			});
		});

		// A sport that sends a pre-formatted line and no separate stats still shows the line.
		it('falls back to the unlabelled ESPN line when there are no separate stats', () => {
			mountPre({
				...pitchers,
				homeTeam: { ...pitchers.homeTeam, probableStarter: { name: 'D. Peterson', line: '(7-7, 5.17)' } },
				awayTeam: { ...pitchers.awayTeam, probableStarter: undefined },
			});
			cy.get('.gd-pregame-starter-line').should('have.text', '(7-7, 5.17)');
			cy.get('.gd-pregame-stat').should('not.exist');
		});

		it('keeps each starter on its own team side of the card', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-stats').then(([card]: JQuery<HTMLElement>) => {
				const box = card.getBoundingClientRect();
				const midline = box.left + box.width / 2;
				cy.get('.gd-pregame-starter').eq(0).then(([away]: JQuery<HTMLElement>) => {
					expect(away.getBoundingClientRect().right).to.be.at.most(midline + 1);
				});
				cy.get('.gd-pregame-starter').eq(1).then(([home]: JQuery<HTMLElement>) => {
					expect(home.getBoundingClientRect().left).to.be.at.least(midline - 1);
				});
			});
		});

		it('holds the grid when only one side has a starter', () => {
			mountPre({ ...pitchers, homeTeam: { ...pitchers.homeTeam, probableStarter: undefined } });
			cy.get('.gd-pregame-starter-name').should('have.length', 1);
			cy.get('.gd-pregame-starters').then(([row]: JQuery<HTMLElement>) => {
				const columns = getComputedStyle(row).gridTemplateColumns.split(' ').map(parseFloat);
				expect(columns).to.have.length(2);
				expect(Math.abs(columns[0]! - columns[1]!)).to.be.at.most(1);
			});
		});

		it('shows a goalie with a status and no stat line', () => {
			mountPre(goalies);
			cy.contains('.gd-setup-heading', 'Probable goalies').should('exist');
			cy.get('.gd-pregame-starter-line').should('not.exist');
			cy.get('.gd-pregame-stat').should('not.exist');
			cy.get('.gd-pregame-starter-status').eq(0).should('have.text', 'Expected');
			cy.get('.gd-pregame-starter-status').eq(1).should('have.text', 'Confirmed');
		});

		it('renders a headshot for each starter and leader', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-starter-shot img').should('have.length', 2);
			cy.get('.gd-pregame-starter-shot img').eq(0).should('have.attr', 'src').and('include', '39909');
			cy.get('.gd-pregame-leader-shot').should('have.length', 4);
		});

		// Soccer sends a headshot for roughly one leader in ten, so the placeholder is the common
		// case there and has to hold the row's shape rather than collapse it.
		it('falls back to team-coloured initials when there is no headshot', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-leader-row').eq(0).within(() => {
				cy.get('img').should('not.exist');
				cy.get('.crest-fallback').should('have.text', 'KC');
			});
			cy.get('.gd-pregame-leader-row').eq(0).then(([withFallback]: JQuery<HTMLElement>) => {
				cy.get('.gd-pregame-leader-row').eq(1).then(([withImage]: JQuery<HTMLElement>) => {
					const a = withFallback.getBoundingClientRect();
					const bBox = withImage.getBoundingClientRect();
					expect(Math.abs(a.height - bBox.height), 'placeholder row matches image row height').to.be.at.most(1);
					expect(Math.abs(a.left - bBox.left), 'and its left edge').to.be.at.most(1);
				});
			});
		});

		it('tints each leader row with its own team colour', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-leader-row').eq(0).should('have.attr', 'style').and('include', 'linear-gradient');
			cy.get('.gd-pregame-leader-team').eq(0).should('have.text', 'DET');
			cy.get('.gd-pregame-leader-team').eq(1).should('have.text', 'NYM');
			// Away and home must not resolve to the same tint, or the colour carries no information.
			cy.get('.gd-pregame-leader-row').eq(0).then(([away]: JQuery<HTMLElement>) => {
				cy.get('.gd-pregame-leader-row').eq(1).then(([home]: JQuery<HTMLElement>) => {
					expect(getComputedStyle(away).backgroundImage).to.not.equal(getComputedStyle(home).backgroundImage);
				});
			});
		});

		it('renders one row per team per category, grouped under the category', () => {
			mountPre(pitchers);
			cy.contains('.gd-setup-heading', 'Team leaders').should('exist');
			cy.get('.gd-pregame-category').should('have.length', 2);
			cy.get('.gd-pregame-category').eq(0).should('have.text', 'HR');
			cy.get('.gd-pregame-leader-row').should('have.length', 4);
			cy.get('.gd-pregame-leader-value').eq(0).should('have.text', '28');
			cy.get('.gd-pregame-leader-value').eq(1).should('have.text', '33');
		});

		// The whole reason for the full-width row. A clipped stat is unreadable in a way a clipped
		// name is not, so the value is what must never be cut.
		it('never truncates a football stat value', () => {
			mountPre(football);
			cy.get('.gd-pregame-leader-value').each(($el: JQuery<HTMLElement>) => {
				const [el] = $el;
				expect(el!.scrollWidth, `${el!.textContent} renders whole`).to.be.at.most(el!.clientWidth + 1);
			});
			cy.get('.gd-pregame-leader-value').eq(0).should('have.text', '14/23, 141 YDS, 1 INT');
		});

		it('keeps a football row inside the card', () => {
			mountPre(football);
			cy.get('.gd-pregame-stats').then(([card]: JQuery<HTMLElement>) => {
				const limit = card.getBoundingClientRect().right;
				cy.get('.gd-pregame-leader-row').each(($el: JQuery<HTMLElement>) => {
					expect($el[0]!.getBoundingClientRect().right).to.be.at.most(limit);
				});
			});
		});

		it('labels a category by sport, not by ESPN name alone', () => {
			const hockeyPoints = {
				...goalies,
				homeTeam: { ...goalies.homeTeam, leaders: [{ category: 'points', fallbackLabel: 'Points', player: 'D. Pastrnak', value: '69' }] },
			};
			mountPre(hockeyPoints);
			cy.get('.gd-pregame-category').last().should('have.text', 'PTS');
		});

		it('falls back to the ESPN abbreviation for a category we have no label for', () => {
			const unknown = {
				...pitchers,
				homeTeam: { ...pitchers.homeTeam, leaders: [{ category: 'stolenbases', fallbackLabel: 'SB', player: 'F. Lindor', value: '29' }] },
				awayTeam: { ...pitchers.awayTeam, leaders: [] },
			};
			mountPre(unknown);
			cy.get('.gd-pregame-category').last().should('have.text', 'SB');
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


		// The two labels share one half-card row, so a locale that goes native — ja ships 勝敗 and
		// 防御率 where most ship W-L and ERA — has to fit both without wrapping the pair.
		it('fits every locale pitcher label beside its partner', () => {
			mountPre(pitchers);
			// The budget is the half-card the starter gets, not the row's own shrink-to-fit width:
			// the row grows with its content, so measuring it before the swap measures English.
			cy.get('.gd-pregame-starter').eq(0).then(([column]: JQuery<HTMLElement>) => {
				const budget = column.getBoundingClientRect().width;
				const row = column.querySelector<HTMLElement>('.gd-pregame-starter-stats')!;
				const labels = row.querySelectorAll<HTMLElement>('.gd-pregame-stat-label');
				const [recordLabel, eraLabel] = labels;
				const baseHeight = recordLabel!.getBoundingClientRect().height;
				for (const [name, locale] of Object.entries(locales)) {
					const detail = locale.detail as unknown as Record<string, string>;
					recordLabel!.textContent = detail.pitcherRecordLabel ?? '';
					eraLabel!.textContent = detail.pitcherEraLabel ?? '';
					expect(row.scrollWidth, `${name} pitcher labels fit the row`).to.be.at.most(Math.ceil(budget));
					for (const label of labels) {
						expect(label.getBoundingClientRect().height, `${name} label stays on one line`)
							.to.be.at.most(baseHeight + 1);
					}
				}
			});
		});
		it('fits every locale category label on one line', () => {
			mountPre(pitchers);
			cy.get('.gd-pregame-category').eq(0).then(([label]: JQuery<HTMLElement>) => {
				const oneLine = parseFloat(getComputedStyle(label).lineHeight) + 1;
				const keys = [
					'leaderAvg', 'leaderHomeRuns', 'leaderRbis', 'leaderPoints', 'leaderRebounds',
					'leaderAssists', 'leaderGoals', 'leaderHockeyAssists', 'leaderHockeyPoints',
					'leaderPointsPerGame', 'leaderReboundsPerGame', 'leaderAssistsPerGame',
					'leaderPassing', 'leaderRushing', 'leaderReceiving',
				];
				for (const [name, locale] of Object.entries(locales)) {
					const detail = locale.detail as unknown as Record<string, string>;
					for (const key of keys) {
						label.textContent = detail[key] ?? '';
						expect(label.getBoundingClientRect().height, `${name}.${key} stays on one line`)
							.to.be.at.most(oneLine);
					}
				}
			});
		});
	});
});
