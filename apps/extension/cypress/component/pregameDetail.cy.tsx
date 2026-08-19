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
				for (const key of ['getReadyTipOff', 'getReadyKickoff', 'getReadyPuckDrop', 'getReadyFirstPitch', 'getReadyGametime']) {
					heading.textContent = detail[key] ?? '';
					expect(heading.getBoundingClientRect().height, `${name}.${key} stays on one line`)
						.to.be.at.most(oneLine);
				}
			}
		});
	});
});
