import GameDetailView from '../../../entrypoints/popup/components/gameDetailView';
import LineupsPanel from '../../../entrypoints/popup/components/lineupsPanel';
import { clearSharedRequests, parseLineups } from '@arenaswap/sideline';
import type { Game } from '@arenaswap/core/types';
import rosters from '../../../../../packages/sideline/tests/fixtures/lineups/rosters.json';
import { makeGame } from '../../support/fixtures';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';

// Real XIs captured 2026-11-06: Everton's 4-2-3-1 at home to Sassuolo's 4-3-3 (two clubs from
// different leagues, so the two kits are nothing alike).
const game: Game = makeGame('401879999', {
	league: 'epl',
	sportType: 'soccer',
	status: 'post',
	homeTeam: { id: rosters.EVE.team.id, name: 'Everton', abbreviation: 'EVE', score: 2, color: '#0606FA' },
	awayTeam: { id: rosters.SAS.team.id, name: 'Sassuolo', abbreviation: 'SAS', score: 1, color: '#339933' },
});
const summary = { rosters: [rosters.EVE, rosters.SAS] };
const lineups = parseLineups(summary, { home: game.homeTeam.id, away: game.awayTeam.id });

const centreOf = (name: string) => cy.contains('.gd-lineup-name', name).then($name => {
	const box = $name[0].getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top };
});

describe('lineups panel', () => {
	it('puts all twenty-two starters on the pitch, the hero\'s left team at the top', () => {
		mountInPopup(<LineupsPanel game={game} lineups={lineups} awayColor='#339933' homeColor='#0606FA' />);
		cy.get('.gd-lineup-player').should('have.length', 22);
		cy.get('.gd-lineup-team').first().should('contain.text', 'Everton').and('contain.text', '4-2-3-1');
		cy.get('.gd-lineup-team').last().should('contain.text', 'Sassuolo').and('contain.text', '4-3-3');
	});

	it('draws each team facing the other, so the top team\'s left back is on the screen\'s right', () => {
		mountInPopup(<LineupsPanel game={game} lineups={lineups} awayColor='#339933' homeColor='#0606FA' />);
		centreOf('Mykolenko').then(leftBack => centreOf('Röhl').then(rightBack => {
			expect(leftBack.x, 'Everton LB right of RB').to.be.greaterThan(rightBack.x);
		}));
		centreOf('Pickford').then(keeper => centreOf('Turati').then(otherKeeper => {
			expect(keeper.y, 'top keeper above bottom keeper').to.be.lessThan(otherKeeper.y);
		}));
	});

	it('wears the kit the team wore that day rather than its usual colour', () => {
		mountInPopup(<LineupsPanel game={game} lineups={lineups} awayColor='#339933' homeColor='#0606FA' />);
		cy.contains('.gd-lineup-player', 'Pickford').find('.gd-lineup-shirt').should('have.text', '1').and($shirt => {
			expect(getComputedStyle($shirt[0]).backgroundColor, 'kit colour').to.equal('rgb(0, 0, 204)');
			expect(getComputedStyle($shirt[0]).color, 'kit number colour').to.equal('rgb(255, 255, 255)');
		});
	});

	it('picks a readable number when the kit\'s own number colour would vanish', () => {
		const pale = { ...lineups, home: { ...lineups.home!, shirtColor: '#F8F8FF', numberColor: '#FFFFFF' } };
		mountInPopup(<LineupsPanel game={game} lineups={pale} awayColor='#339933' homeColor='#0606FA' />);
		cy.contains('.gd-lineup-player', 'Pickford').find('.gd-lineup-shirt').should($shirt => {
			expect(getComputedStyle($shirt[0]).color).to.equal('rgb(17, 24, 39)');
		});
	});

	inEveryLocale('keeps every name on the pitch', locale => {
		mountInPopup(<LineupsPanel game={game} lineups={lineups} awayColor='#339933' homeColor='#0606FA' />, locale);
		cy.get(popupSurface).assertContained();
		cy.get('.gd-lineup-pitch').then($pitch => {
			const pitch = $pitch[0].getBoundingClientRect();
			cy.get('.gd-lineup-name').each($name => {
				const box = $name[0].getBoundingClientRect();
				expect(box.left, `${$name.text()} left edge`).to.be.at.least(pitch.left);
				expect(box.right, `${$name.text()} right edge`).to.be.at.most(pitch.right);
				expect(box.bottom, `${$name.text()} bottom edge`).to.be.at.most(pitch.bottom);
			});
		});
	});
});

describe('lineups tab', () => {
	beforeEach(() => clearSharedRequests());

	const mountDetail = () => cy.mount(
		<GameDetailView
			game={game}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false, holidayChristmasEnabled: false, holidayBuntingEnabled: false, holidayFireworksEnabled: false }}
			favoriteTeamIds={new Set<string>()}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);

	it('appears once the summary names the XIs, and shows the pitch', () => {
		cy.intercept({ url: /\/summary\?/ }, { body: summary }).as('summary');
		cy.intercept({ url: /\/standings/ }, { body: {} });
		mountDetail();
		cy.wait('@summary');
		cy.contains('.gd-tabs .nav-link', 'Lineups').click();
		cy.get('.gd-lineup-player').should('have.length', 22);
	});

	it('is absent while the teams have not named them', () => {
		cy.intercept({ url: /\/summary\?/ }, { body: {} }).as('summary');
		cy.intercept({ url: /\/standings/ }, { body: {} });
		mountDetail();
		cy.wait('@summary');
		cy.contains('.nav-link', 'Lineups').should('not.exist');
		cy.get('.game-detail-matchup').should('exist');
	});
});
