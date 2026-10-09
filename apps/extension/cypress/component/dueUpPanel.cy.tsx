import DueUpPanel from '../../entrypoints/popup/components/dueUpPanel';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
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

const awayColor = '#BD3039';
const homeColor = '#3E9BD1';

// A 1x1 transparent PNG, so the first hitter has a portrait that loads offline and the other two
// exercise the initials fallback.
const portrait = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const longName = 'Christian Encarnacion-Strand Jr.';

const liveGame: Game = {
	id: 'mlb-due-up',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	period: 7,
	clockSeconds: 0,
	topOfInning: false,
	homeTeam: { id: 'h', name: 'San Diego Padres', abbreviation: 'SD', score: 3, color: homeColor, alternateColor: '#FFC425' },
	awayTeam: { id: 'a', name: 'Chicago Cubs', abbreviation: 'CHC', score: 2, color: awayColor, alternateColor: '#0E3386' },
	baseRunners: { first: false, second: true, third: false },
	bso: { balls: 1, strikes: 1, outs: 1 },
	atBat: {
		pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
		batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
	},
	dueUp: [
		{ name: 'Fernando Tatis Jr.', position: 'RF', headshot: portrait, summary: '0-1, BB' },
		{ name: longName, position: 'DH', summary: '2-3, 2B, HR, RBI, BB' },
		{ name: 'Xander Bogaerts', position: '3B' },
	],
};

const excitement: PowerScoreResult = {
	gameId: 'mlb-due-up',
	total: 64,
	closeness: 22,
	lateGame: 16,
	momentum: 12,
	leadChanges: 6,
	comeback: 4,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close game, late innings',
};

const mountPanel = (game: Game) => {
	cy.mount(
		<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
			<DueUpPanel game={game} awayColor={awayColor} homeColor={homeColor} />
		</div>,
	);
};

const mountDetail = (game: Game) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={excitement}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('the due-up block', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('lists the hitters in order with their line on the right', () => {
		mountPanel(liveGame);
		cy.get('.gd-play-heading').should('have.text', en.detail.dueUpHeading);
		cy.get('.gd-dueup-row').should('have.length', 3);
		cy.get('.gd-dueup-name').then($names => {
			expect([...$names].map(name => name.textContent)).to.deep.equal(['Fernando Tatis Jr.', longName, 'Xander Bogaerts']);
		});
		cy.get('.gd-dueup-position').then($positions => {
			expect([...$positions].map(position => position.textContent)).to.deep.equal(['RF', 'DH', '3B']);
		});
		cy.get('.gd-dueup-row').eq(0).find('.gd-dueup-line').should('have.text', '0-1, BB');
		cy.get('.gd-dueup-row').eq(2).find('.gd-dueup-line').should('not.exist');
		cy.get('.gd-dueup-row').each($row => {
			const line = $row[0]!.querySelector('.gd-dueup-line');
			if (!line) return;
			expect(line.getBoundingClientRect().right, 'the line hugs the right edge').to.be.closeTo($row[0]!.getBoundingClientRect().right, 1);
		});
	});

	it('truncates a long name and keeps the position and the line on the row', () => {
		mountPanel(liveGame);
		cy.get('.gd-dueup-row').eq(1).then(([row]: JQuery<HTMLElement>) => {
			const rowBox = row.getBoundingClientRect();
			const name = row.querySelector('.gd-dueup-name') as HTMLElement;
			const position = row.querySelector('.gd-dueup-position') as HTMLElement;
			const line = row.querySelector('.gd-dueup-line') as HTMLElement;
			expect(name.scrollWidth, 'the name is cut with an ellipsis').to.be.greaterThan(name.clientWidth);
			expect(getComputedStyle(name).textOverflow).to.equal('ellipsis');
			expect(row.getClientRects().length).to.equal(1);
			expect(rowBox.height, 'one line tall, not wrapped').to.be.lessThan(40);
			for (const [label, el] of [['name', name], ['position', position], ['line', line]] as const) {
				const box = el.getBoundingClientRect();
				expect(box.left, `${label} stays inside the row`).to.be.at.least(rowBox.left - 1);
				expect(box.right, `${label} stays inside the row`).to.be.at.most(rowBox.right + 1);
			}
			expect(position.getBoundingClientRect().left, 'position sits after the name').to.be.at.least(name.getBoundingClientRect().right - 1);
			expect(position.getBoundingClientRect().right, 'position sits before the line').to.be.at.most(line.getBoundingClientRect().left + 1);
		});
	});

	it('draws a portrait where there is one and initials where there is not', () => {
		mountPanel(liveGame);
		cy.get('.gd-dueup-row').eq(0).find('img').should('exist');
		cy.get('.gd-dueup-row').eq(1).find('.crest-fallback').should('contain.text', 'CE');
		cy.get('.gd-dueup-row').eq(2).find('.crest-fallback').should('contain.text', 'XB');
	});

	it('paints the disc in the colour of the club at bat', () => {
		mountPanel(liveGame);
		cy.get('.gd-dueup-shot').first().should('have.css', 'background-color', 'rgb(62, 155, 209)');
		mountPanel({ ...liveGame, topOfInning: true });
		cy.get('.gd-dueup-shot').first().should('have.css', 'background-color', 'rgb(189, 48, 57)');
	});

	it('keeps every locale heading on one line', () => {
		mountPanel(liveGame);
		cy.get('.gd-play-heading').then(([heading]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(heading);
			const oneLine = parseFloat(style.lineHeight) + parseFloat(style.marginBottom) + 1;
			for (const [name, locale] of Object.entries(locales)) {
				heading.textContent = locale.detail.dueUpHeading;
				expect(locale.detail.dueUpHeading, `${name} has a translation`).to.be.a('string').with.length.greaterThan(0);
				expect(heading.getBoundingClientRect().height, `${name} stays on one line`).to.be.at.most(oneLine);
			}
			heading.textContent = de.detail.dueUpHeading;
		});
	});

	it('hides when ESPN names nobody', () => {
		mountPanel({ ...liveGame, dueUp: undefined });
		cy.get('.gd-dueup-row').should('not.exist');
		cy.get('.gd-play-heading').should('not.exist');
	});

	it('hides on an empty list', () => {
		mountPanel({ ...liveGame, dueUp: [] });
		cy.get('.gd-play-panel').should('not.exist');
	});

	it('sits under the hero on the detail screen and is gone with the data', () => {
		mountDetail(liveGame);
		cy.get('.gd-atbat-panel').should('exist');
		cy.get('.gd-dueup-row').should('have.length', 3);
		cy.get('.gd-atbat-panel').then(([atBat]: JQuery<HTMLElement>) => {
			cy.get('.gd-dueup-row').first().should(([row]: JQuery<HTMLElement>) => {
				expect(row.getBoundingClientRect().top).to.be.greaterThan(atBat.getBoundingClientRect().bottom);
			});
		});
	});

	it('is not on the detail screen without it', () => {
		mountDetail({ ...liveGame, dueUp: undefined });
		cy.get('.gd-atbat-panel').should('exist');
		cy.get('.gd-dueup-row').should('not.exist');
	});
});
