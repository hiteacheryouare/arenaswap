import GameStage from '@arenaswap/ui/src/components/gameStage';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import type { Game } from '@arenaswap/core/types';
import { stageNote, stageSituation, upcomingStatus } from '@arenaswap/ui/src/components/boardSituation';
import { buildCardHandlers } from '@arenaswap/ui/src/components/gameOpener';
import { i18n } from '#i18n';

const baseGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 4,
	clockSeconds: 38,
	homeTeam: { id: 'h', name: 'Cleveland Cavaliers', nickname: 'Cavaliers', abbreviation: 'CLE', score: 108, color: '#860038' },
	awayTeam: { id: 'a', name: 'Milwaukee Bucks', nickname: 'Bucks', abbreviation: 'MIL', score: 107, color: '#00471B' },
};

const football: Game = {
	...baseGame,
	id: 'fb',
	league: 'nfl',
	sportType: 'football',
	period: 4,
	clockSeconds: 480,
	homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, color: '#004C54', timeouts: 2 },
	awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, color: '#003594', timeouts: 0 },
	downDistance: '3rd & 5',
	fieldPosition: 'PHI 30',
};

const frame = { width: 320, background: 'var(--as-page)' };

const inside = (inner: Element, outer: Element) => {
	const a = inner.getBoundingClientRect();
	const b = outer.getBoundingClientRect();
	return a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
};

describe('the stage', () => {
	it('writes the period and clock, dims the side behind, and shows the PowerScore', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} power={{ value: 93, label: 'PowerScore' }} /></div>);
		cy.get('.as-stage .as-clock').should('have.text', 'Q4 0:38');
		cy.get('.as-stage-score > :first-child').should('have.class', 'is-behind');
		cy.get('.as-stage-score > :last-child').should('not.have.class', 'is-behind');
		cy.get('.as-stage-power strong').should('have.text', '93');
	});

	it('keeps two three-digit scores clear of the crests and inside the stage', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, score: 128 }, homeTeam: { ...baseGame.homeTeam, score: 131 } }} /></div>);
		cy.get('.as-stage-score').should('have.class', 'is-wide').then($score => {
			const score = $score[0]!.getBoundingClientRect();
			const crests = [...document.querySelectorAll('.as-stage-team .as-crest-box')].map(crest => crest.getBoundingClientRect());
			expect(score.left, 'clear of the away crest').to.be.at.least(crests[0]!.right);
			expect(score.right, 'clear of the home crest').to.be.at.most(crests[1]!.left);
			for (const digit of $score[0]!.children) expect(inside(digit, $score[0]!.closest('.as-stage')!)).to.equal(true);
		});
	});

	it('puts "at" between the teams before a start, and no score', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z' }} /></div>);
		cy.get('.as-stage-at').should('have.text', 'at');
		cy.get('.as-stage-score').should('not.exist');
	});

	it('puts the rank in front of the tricode without replacing it', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, rank: 15 } }} /></div>);
		cy.get('.as-stage-team').first().find('b').should('have.text', '#15MIL');
		cy.get('.as-stage-team').last().find('.as-rank').should('not.exist');
	});

	it('names the teams by nickname with records when asked to', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} names='name' records={{ away: '44-27', home: '52-19' }} /></div>);
		cy.get('.as-stage-team').first().should('contain.text', 'Bucks').and('contain.text', '44-27');
	});

	it('lights one timeout dot per timeout left and still draws an empty row', () => {
		cy.mount(<div style={frame}><GameStage game={football} /></div>);
		cy.get('.as-stage-team').last().find('.timeout-dot').should('have.length', 3);
		cy.get('.as-stage-team').last().find('.timeout-dot.is-empty').should('have.length', 1);
		cy.get('.as-stage-team').first().find('.timeout-dot.is-empty').should('have.length', 3);
		cy.get('.as-stage-team').first().find('.timeout-dots').should('have.attr', 'aria-label').and('contain', '0');
	});

	it('marks a favourite quietly on the list and makes it a button where it can be changed', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} favorites={{ away: true, home: false }} /></div>);
		cy.get('.as-stage-team').first().find('.as-star-mark').should('exist');
		cy.get('.as-star').should('not.exist');
		const toggled: string[] = [];
		cy.mount(<div style={frame}><GameStage game={baseGame} favorites={{ away: true, home: false }} onToggleFavorite={side => toggled.push(side)} /></div>);
		cy.get('.as-star').should('have.length', 2).last().should('have.attr', 'aria-pressed', 'false').click();
		cy.get('.as-star').first().should('have.attr', 'aria-pressed', 'true');
		cy.wrap(toggled).should('deep.equal', ['home']);
	});

	it('letters a monogram in the team colour when a crest never arrives', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} /></div>);
		cy.get('.as-stage-team').first().find('.crest-fallback').should('have.text', 'MIL').then($fallback => {
			expect(getComputedStyle($fallback[0]!).backgroundColor).to.equal('rgb(0, 71, 27)');
		});
	});

	it('draws the count and the bases between the matchup and the foot, readable on the stage', () => {
		const baseball: Game = { ...baseGame, league: 'mlb', sportType: 'baseball', period: 7, topOfInning: false, bso: { balls: 1, strikes: 1, outs: 1 }, baseRunners: { first: true, second: false, third: true } };
		cy.mount(<div style={frame}><GameStage game={baseball} situation={stageSituation(baseball)} /></div>);
		cy.get('.as-stage-situation .base-marker.occupied').should('have.length', 2);
		cy.get('.as-stage-situation .bso-dot.is-empty').should('have.length', 4).each($dot => {
			const [red, green, blue, alpha = 1] = (getComputedStyle($dot[0]!).color.match(/[\d.]+/g) ?? []).map(Number);
			expect([red, green, blue], 'drawn in white').to.deep.equal([255, 255, 255]);
			expect(alpha, 'faint enough to read as empty, strong enough to see').to.be.within(0.4, 0.7);
		});
		cy.get('.as-stage-situation .bso-dot').not('.is-empty').should('have.length', 3);
		cy.mount(<div style={frame}><GameStage game={baseGame} situation={stageSituation(baseGame)} /></div>);
		cy.get('.as-stage-situation').should('not.exist');
	});

	it('writes timeouts as a number when a sport allows more than fit as dots', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, homeTeam: { ...baseGame.homeTeam, timeouts: 6 } }} favorites={{ away: false, home: true }} /></div>);
		cy.get('.as-stage-team').last().find('.timeout-dots-numeric').should('contain.text', '6');
		cy.get('.as-stage-team').last().then($team => {
			expect(inside($team[0]!, $team[0]!.closest('.as-stage')!), 'timeouts and the star stay in the stage').to.equal(true);
		});
	});

	it('marks a delay in the clock slot', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, delayed: true, delayDescription: 'Rain Delay' }} /></div>);
		cy.get('.as-stage .as-clock').should('have.class', 'is-delayed').and('have.text', 'Rain Delay');
	});
});

describe('the stage note', () => {
	const note = (game: Game, betting = false) => (
		<div style={frame}><GameStage game={game} note={stageNote(game, { bettingEnabled: betting }, i18n.t)} /></div>
	);

	it('leads with the down and distance, joined to the yard line', () => {
		cy.mount(note(football));
		cy.get('.as-note-lead').should('have.text', '3rd & 5 at PHI 30');
	});

	it('falls back to the bare down and distance when the yard line is missing', () => {
		cy.mount(note({ ...football, fieldPosition: undefined }));
		cy.get('.as-note-lead').should('have.text', '3rd & 5');
	});

	it('leads with the venue otherwise, and says where to watch', () => {
		cy.mount(note({ ...baseGame, venueName: 'Rocket Arena', broadcasts: ['ESPN', 'NBCSN', 'Peacock'] }));
		cy.get('.as-note-lead').should('have.text', 'Rocket Arena');
		cy.get('.as-stage-note').should('contain.text', 'Watch on ESPN, NBCSN').and('not.contain.text', 'Peacock');
	});

	it('keeps the longest venue name inside the stage, beside the PowerScore', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, venueName: 'Mercedes-Benz Superdome at the Caesars Superdome Complex', broadcasts: ['ESPN'] }} power={{ value: 93, label: 'PowerScore' }} note={stageNote({ ...baseGame, venueName: 'Mercedes-Benz Superdome at the Caesars Superdome Complex', broadcasts: ['ESPN'] }, { bettingEnabled: false }, i18n.t)} /></div>);
		cy.get('.as-stage-note').then($note => {
			const noteBox = $note[0]!.getBoundingClientRect();
			const power = document.querySelector('.as-stage-power')!.getBoundingClientRect();
			expect(noteBox.right, 'clear of the PowerScore').to.be.at.most(power.left);
			expect(inside($note[0]!, $note[0]!.closest('.as-stage')!)).to.equal(true);
		});
	});

	it('names the building and not the city', () => {
		cy.mount(note({ ...baseGame, venueName: 'Rocket Arena', venueLocation: 'Cleveland, OH' }));
		cy.get('.as-stage-note').should('contain.text', 'Rocket Arena').and('not.contain.text', 'Cleveland, OH');
	});

	it('does not open the game when the odds attribution is used', () => {
		const opened: string[] = [];
		const odds = { ...baseGame, odds: { details: 'CLE -1.5', provider: { name: 'Draft Kings' } } };
		cy.mount(<div style={frame}><GameStage game={odds} note={stageNote(odds, { bettingEnabled: true }, i18n.t)} interactive={{ role: 'button', ...buildCardHandlers(id => opened.push(id), odds.id) }} /></div>);
		cy.get('.as-note-provider').click();
		cy.wrap(opened).should('have.length', 0);
		cy.get('.as-stage').click('left');
		cy.wrap(opened).should('deep.equal', ['g1']);
	});

	it('names a round ahead of the venue', () => {
		cy.mount(note({ ...baseGame, venueName: 'Rocket Arena', postseasonLabel: 'East Finals - Game 5' }));
		cy.get('.as-note-lead').should('have.text', 'East Finals - Game 5');
	});

	it('adds the line, with its provider, only when betting is on', () => {
		const odds = { ...baseGame, odds: { details: 'CLE -1.5', overUnder: 224.5, provider: { name: 'Draft Kings' } } };
		cy.mount(note(odds, true));
		cy.get('.as-note-odds').should('contain.text', 'CLE -1.5, O/U 224.5').and('contain.text', 'Draft Kings');
		// Bootstrap arrives on a lazily imported chunk and moves the title aside once it owns the element.
		cy.get('.as-note-provider').should('have.attr', 'data-bs-original-title').and('contain', 'Draft Kings');
		cy.get('.as-note-provider').should('match', 'button').trigger('mouseover');
		cy.get('.tooltip.show').should('be.visible').and('contain.text', 'Odds provided by: Draft Kings');
		cy.get('.as-note-provider').trigger('mouseout');
		cy.get('.as-note-provider').focus();
		cy.get('.tooltip.show').should('be.visible');
		cy.get('.as-note-provider').should($provider => {
			expect(getComputedStyle($provider[0]!).cursor, 'help cursor').to.equal('help');
		});
		cy.mount(note(odds, false));
		cy.get('.as-note-odds').should('not.exist');
	});
});

describe('a tile', () => {
	it('shows the clock, the tab slot, both teams, the trend and the PowerScore', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={4} tab={<span>Tab 1</span>} /></div>);
		cy.get('.as-tile-top .as-clock').should('have.text', 'Q4 0:38');
		cy.get('.as-tile-tab').should('have.text', 'Tab 1');
		cy.get('.as-tile-team').should('have.length', 2);
		cy.get('.as-trend').should('have.class', 'is-up').and('contain.text', '4');
		cy.get('.as-tile-power').should('have.text', '88');
	});

	it('says Steady for no movement and nothing before there is a reading to compare', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={0} /></div>);
		cy.get('.as-trend').should('have.text', 'Steady');
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={null} /></div>);
		cy.get('.as-trend').should('have.text', '');
	});

	it('keeps a ranked five-letter school inside a half-width tile', () => {
		const wide = { ...baseGame, awayTeam: { ...baseGame.awayTeam, abbreviation: 'UCONN', rank: 12, score: 101 }, homeTeam: { ...baseGame.homeTeam, abbreviation: 'NOVA', rank: 3, score: 99 } };
		cy.mount(<div style={{ width: 144 }}><GameTile game={wide} power={88} trend={-12} tab={<span>Watching, Tab 2</span>} /></div>);
		cy.get('.as-tile').then($tile => {
			for (const node of $tile[0]!.querySelectorAll('.as-tile-team > *, .as-tile-top > *, .as-tile-foot > *')) {
				expect(inside(node, $tile[0]!), node.className).to.equal(true);
			}
		});
	});

	it('rings the game being watched', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} watched /></div>);
		cy.get('.as-tile').should('have.class', 'is-watched');
	});
});

describe('a row', () => {
	it('has no score column before a start and no number when there is none', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z' }} surface='#0e1013' status='in 54 min, NBC' quiet /></div>);
		cy.get('.as-row-team .as-score').should('not.exist');
		cy.get('.as-row-power').should('have.text', '');
		cy.get('.as-row-status').should('contain.text', 'in 54 min, NBC');
		cy.get('.as-row').should('have.class', 'is-quiet');
	});

	it('dims whichever side lost a finished game, and neither side of a draw', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post' }} surface='#0e1013' quiet /></div>);
		cy.get('.as-row-team').first().find('.as-score').should('have.class', 'is-behind');
		cy.get('.as-row .as-clock').should('have.text', 'Final');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post', homeTeam: { ...baseGame.homeTeam, score: 107 } }} surface='#0e1013' quiet /></div>);
		cy.get('.as-row .is-behind').should('not.exist');
	});

	it('draws the inning caret for the inning sports only', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, league: 'mlb', sportType: 'baseball', period: 7, topOfInning: true }} surface='#0e1013' power={40} /></div>);
		cy.get('.as-row .inning-half-icon').should('have.class', 'bi-caret-up-fill');
		cy.mount(<div style={frame}><GameRow game={baseGame} surface='#0e1013' power={40} /></div>);
		cy.get('.as-row .inning-half-icon').should('not.exist');
	});
});

describe('the upcoming status line', () => {
	it('counts down inside the hour, then gives the hours, then just the network', () => {
		const now = Date.parse('2026-09-28T20:00:00Z');
		const at = (minutes: number) => ({ ...baseGame, status: 'pre' as const, startTime: new Date(now + minutes * 60_000).toISOString(), broadcasts: ['NBC', 'Peacock'] });
		expect(upcomingStatus(at(54), i18n.t, now)).to.equal('in 54 min, NBC');
		expect(upcomingStatus(at(150), i18n.t, now)).to.equal('in 3 hr, NBC');
		expect(upcomingStatus(at(600), i18n.t, now)).to.equal('NBC');
		expect(upcomingStatus(at(-2), i18n.t, now)).to.equal('Starts soon, NBC');
		expect(upcomingStatus({ ...at(54), postseasonLabel: 'Rose Bowl' }, i18n.t, now)).to.equal('in 54 min, Rose Bowl, NBC');
	});
});
