import GameStage from '@arenaswap/ui/src/components/gameStage';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import type { Game } from '@arenaswap/core/types';
import { roundLabel, stageNote, stageSituation, upcomingStatus } from '@arenaswap/ui/src/components/boardSituation';
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

const baseball: Game = { ...baseGame, league: 'mlb', sportType: 'baseball', period: 7, topOfInning: false, bso: { balls: 1, strikes: 1, outs: 2 }, baseRunners: { first: true, second: false, third: true } };

const middleOf = (element: Element) => {
	const box = element.getBoundingClientRect();
	return box.top + box.height / 2;
};

describe('the matchup', () => {
	it('sets each team under its crest, with the scores and the clock between them', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} power={{ value: 93, label: 'PowerScore' }} /></div>);
		cy.get('.as-match > *').then($parts => {
			const has = (index: number, ...names: string[]) => names.every(name => $parts[index]!.classList.contains(name));
			expect(has(0, 'as-match-team', 'is-away'), 'away team').to.equal(true);
			expect(has(1, 'as-match-score', 'is-away'), 'away score').to.equal(true);
			expect(has(2, 'as-centre'), 'centre').to.equal(true);
			expect(has(3, 'as-match-score', 'is-home'), 'home score').to.equal(true);
			expect(has(4, 'as-match-team', 'is-home'), 'home team').to.equal(true);
		});
		cy.get('.as-centre .as-clock').should('have.text', 'Q4 0:38');
		cy.get('.as-match-score.is-away').should('have.class', 'is-behind');
		cy.get('.as-match-score.is-home').should('not.have.class', 'is-behind');
	});

	// Scores ride the crests' midline and the centre spans the crest and the name, however far the
	// names and records under them run.
	it('lines the scores up with the crests, and the centre with the crest and the name', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} names='name' records={{ away: '44-27', home: '52-19' }} /></div>);
		cy.get('.as-match').then($match => {
			const crest = $match[0]!.querySelector('.as-crest-box')!;
			const name = $match[0]!.querySelector('.as-match-team b')!;
			expect(middleOf($match[0]!.querySelector('.as-match-score')!), 'score').to.be.closeTo(middleOf(crest), 3);
			const block = (crest.getBoundingClientRect().top + name.getBoundingClientRect().bottom) / 2;
			expect(middleOf($match[0]!.querySelector('.as-centre')!), 'centre').to.be.closeTo(block, 3);
		});
	});

	it('draws the bases and the outs in the middle for the inning sports', () => {
		cy.mount(<div style={frame}><GameRow game={baseball} theme='dark' power={40} /></div>);
		cy.get('.as-centre .as-situation .base-marker.occupied').should('have.length', 2);
		cy.get('.as-centre .as-outs').should('have.attr', 'aria-label', '2 outs');
		cy.get('.as-centre .as-out.is-out').should('have.length', 2);
		cy.get('.as-centre .inning-half-icon').should('have.class', 'bi-caret-down-fill');
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='dark' power={40} /></div>);
		cy.get('.as-situation').should('not.exist');
	});

	it('puts the down and where the ball is in the middle for football', () => {
		cy.mount(<div style={frame}><GameRow game={football} theme='dark' power={40} /></div>);
		cy.get('.as-downs b').should('have.text', '3rd & 5');
		cy.get('.as-downs small').should('have.text', 'PHI 30');
	});

	it('shows the start time and where to watch before a game, and no scores', () => {
		const now = Date.now();
		const later = { ...baseGame, status: 'pre' as const, startTime: new Date(now + 54 * 60_000).toISOString(), broadcasts: ['NBC'] };
		cy.mount(<div style={frame}><GameRow game={later} theme='dark' quiet /></div>);
		cy.get('.as-match').should('have.class', 'is-pre');
		cy.get('.as-match-score').should('not.exist');
		cy.get('.as-centre-time').invoke('text').should('match', /\d/);
		cy.get('.as-centre-note').should('have.text', 'in 54 min, NBC');
		cy.get('.as-power-line').should('not.exist');
	});

	it('says Final in the middle once it is over, and dims only the side that lost', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post', finalPeriodSuffix: 'OT' }} theme='dark' quiet /></div>);
		cy.get('.as-centre-word').should('have.text', 'Final/OT');
		cy.get('.as-match-score.is-away').should('have.class', 'is-behind');
		cy.get('.as-live-dot').should('not.exist');
		cy.get('.as-status').should('not.exist');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post', homeTeam: { ...baseGame.homeTeam, score: 107 } }} theme='dark' quiet /></div>);
		cy.get('.as-match-score.is-behind').should('not.exist');
	});

	it('puts the rank in front of the tricode without replacing it', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, rank: 15 } }} /></div>);
		cy.get('.as-match-team.is-away b').should('have.text', '15MIL');
		cy.get('.as-match-team.is-home .as-rank').should('not.exist');
	});

	it('letters a monogram in the team colour when a crest never arrives', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} /></div>);
		cy.get('.as-match-team.is-away .crest-fallback').should('have.text', 'MIL').then($fallback => {
			expect(getComputedStyle($fallback[0]!).backgroundColor).to.equal('rgb(0, 71, 27)');
		});
	});
});

describe('the live dot and the status word', () => {
	it('pulses red beside a live clock and says LIVE on the top line', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='dark' power={40} /></div>);
		cy.get('.as-centre .as-clock .as-live-dot').should('have.class', 'is-live').and('have.css', 'animation-name', 'as-live-pulse');
		cy.get('.as-top-status .as-status').should('have.text', 'LIVE').and('have.css', 'text-transform', 'uppercase');
	});

	it('turns pink past regulation, with the sport\'s own word and a pink ring', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, period: 5 }} theme='dark' power={40} /></div>);
		cy.get('.as-live-dot').should('have.class', 'is-overtime').and('have.css', 'background-color', 'rgb(217, 3, 104)');
		cy.get('.as-status').should('have.text', 'OT');
		cy.get('.as-row').should('have.class', 'is-overtime').and('have.css', 'box-shadow').and('contain', 'rgb(217, 3, 104)');
		cy.mount(<div style={frame}><GameRow game={{ ...baseball, period: 10 }} theme='dark' power={40} /></div>);
		cy.get('.as-status').should('have.text', 'Extras');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, league: 'mls', sportType: 'soccer', period: 3 }} theme='dark' power={40} /></div>);
		cy.get('.as-status').should('have.text', 'Extra time');
	});

	it('pauses in yellow for a delay, with both teams\' colours given over to it', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, delayed: true, delayDescription: 'Rain Delay' }} theme='dark' power={40} /></div>);
		cy.get('.as-live-dot').should('have.class', 'bi-pause-fill').and('have.class', 'is-delay');
		cy.get('.as-clock').should('have.class', 'is-delayed').and('contain.text', 'Rain Delay');
		cy.get('.as-status').should('have.text', 'Delay');
		cy.get('.as-row').should($row => {
			const style = getComputedStyle($row[0]!);
			expect(style.getPropertyValue('--row-away').toLowerCase()).to.equal('#f1c40f');
			expect(style.getPropertyValue('--row-home').toLowerCase()).to.equal('#f1c40f');
		});
	});
});

describe('the stage', () => {
	// 72px where the column has it; a long clock between the scores takes a few pixels back.
	it('draws the crests at or near 72px, and a PowerScore bar in the colour of the score', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, period: 2, clockSeconds: 5, awayTeam: { ...baseGame.awayTeam, score: 42 }, homeTeam: { ...baseGame.homeTeam, score: 45 } }} power={{ value: 93, label: 'PowerScore' }} /></div>);
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect().width).to.be.within(64, 72);
		});
		cy.get('.as-stage-power strong').should('have.text', '93');
		cy.get('.as-stage-power .progress.as-heat').should('have.attr', 'aria-hidden', 'true');
		// Retried: the fill grows in from empty when it first appears.
		cy.get('.as-stage-power .progress-bar').should($bar => {
			expect($bar[0]!.style.width).to.equal('93%');
			expect($bar[0]!.getBoundingClientRect().width / $bar[0]!.parentElement!.getBoundingClientRect().width).to.be.closeTo(0.93, 0.01);
			expect(getComputedStyle($bar[0]!).backgroundColor, 'v2 orange at 93').to.equal('rgb(239, 96, 14)');
		});
	});

	// A three-digit score takes a little of the crest's column back.
	it('keeps two three-digit scores clear of the crests and inside the stage', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, score: 128 }, homeTeam: { ...baseGame.homeTeam, score: 131 } }} /></div>);
		cy.get('.as-match').should('have.class', 'is-wide').then($match => {
			const [away, home] = [...$match[0]!.querySelectorAll('.as-crest-box')].map(crest => crest.getBoundingClientRect());
			const scores = [...$match[0]!.querySelectorAll('.as-match-score')].map(score => score.getBoundingClientRect());
			expect(away!.width, 'crest keeps most of its size').to.be.at.least(52);
			expect(scores[0]!.left, 'clear of the away crest').to.be.at.least(away!.right);
			expect(scores[1]!.right, 'clear of the home crest').to.be.at.most(home!.left);
			for (const part of $match[0]!.querySelectorAll('.as-match > *')) expect(inside(part, $match[0]!.closest('.as-stage')!), part.className).to.equal(true);
		});
	});

	it('puts the tab on the left of the top line, the round in the middle and LIVE on the right', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, postseasonLabel: 'NLWC · Game 2' }} label={<span>Watching, Tab 2</span>} /></div>);
		cy.get('.as-top > *').then($parts => {
			expect([...$parts].map(part => part.textContent)).to.deep.equal(['Watching, Tab 2', 'NLWC, Game 2', 'LIVE']);
		});
	});

	it('names the teams by nickname with records when asked to, the star under the record', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} names='name' records={{ away: '44-27', home: '52-19' }} onToggleFavorite={() => {}} favorites={{ away: false, home: false }} /></div>);
		cy.get('.as-match-team.is-away').should('contain.text', 'Bucks').and('contain.text', '44-27').then($team => {
			const record = $team[0]!.querySelector('.as-match-record')!.getBoundingClientRect();
			const star = $team[0]!.querySelector('.as-star')!.getBoundingClientRect();
			expect(star.top, 'star under the record').to.be.at.least(record.bottom - 1);
		});
	});

	it('lights one timeout dot per timeout left and still draws an empty row', () => {
		cy.mount(<div style={frame}><GameStage game={football} /></div>);
		cy.get('.as-match-team.is-home .timeout-dot').should('have.length', 3);
		cy.get('.as-match-team.is-home .timeout-dot.is-empty').should('have.length', 1);
		cy.get('.as-match-team.is-away .timeout-dot.is-empty').should('have.length', 3);
		cy.get('.as-match-team.is-away .timeout-dots').should('have.attr', 'aria-label').and('contain', '0');
	});

	it('marks a favourite in gold, and makes it a button where it can be changed', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} favorites={{ away: true, home: false }} /></div>);
		cy.get('.as-match-team.is-away .as-star-mark').should('have.css', 'color', 'rgb(241, 196, 15)');
		cy.get('.as-star').should('not.exist');
		const toggled: string[] = [];
		cy.mount(<div style={frame}><GameStage game={baseGame} favorites={{ away: true, home: false }} onToggleFavorite={side => toggled.push(side)} /></div>);
		cy.get('.as-star').should('have.length', 2).last().should('have.attr', 'aria-pressed', 'false').click();
		cy.get('.as-star').first().should('have.attr', 'aria-pressed', 'true').and('have.css', 'color', 'rgb(241, 196, 15)');
		cy.wrap(toggled).should('deep.equal', ['home']);
	});

	it('draws the full count under the matchup, readable on the stage', () => {
		cy.mount(<div style={frame}><GameStage game={baseball} situation={stageSituation(baseball)} /></div>);
		cy.get('.as-stage-situation .bso-dot.is-empty').should('have.length', 3).each($dot => {
			const [red, green, blue, alpha = 1] = (getComputedStyle($dot[0]!).color.match(/[\d.]+/g) ?? []).map(Number);
			expect([red, green, blue], 'drawn in white').to.deep.equal([255, 255, 255]);
			expect(alpha, 'faint enough to read as empty, strong enough to see').to.be.within(0.4, 0.7);
		});
		cy.get('.as-stage-situation .bso-dot').not('.is-empty').should('have.length', 4);
		cy.mount(<div style={frame}><GameStage game={baseGame} situation={stageSituation(baseGame)} /></div>);
		cy.get('.as-stage-situation').should('not.exist');
	});

	it('writes timeouts as a number when a sport allows more than fit as dots', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, homeTeam: { ...baseGame.homeTeam, timeouts: 6 } }} favorites={{ away: false, home: true }} /></div>);
		cy.get('.as-match-team.is-home .timeout-dots-numeric').should('contain.text', '6');
		cy.get('.as-match-team.is-home').then($team => {
			expect(inside($team[0]!, $team[0]!.closest('.as-stage')!), 'timeouts and the star stay in the stage').to.equal(true);
		});
	});
});

describe('the stage note', () => {
	const note = (game: Game, betting = false) => (
		<div style={frame}><GameStage game={game} note={stageNote(game, { bettingEnabled: betting }, i18n.t)} /></div>
	);

	it('leads with the venue and says where to watch', () => {
		cy.mount(note({ ...baseGame, venueName: 'Rocket Arena', broadcasts: ['ESPN', 'NBCSN', 'Peacock'] }));
		cy.get('.as-note-lead').should('have.text', 'Rocket Arena');
		cy.get('.as-stage-note').should('contain.text', 'Watch on ESPN, NBCSN').and('not.contain.text', 'Peacock');
	});

	it('leaves the down and distance to the middle of the matchup', () => {
		cy.mount(note({ ...football, venueName: 'Lincoln Financial Field' }));
		cy.get('.as-note-lead').should('have.text', 'Lincoln Financial Field');
		cy.get('.as-stage-note').should('not.contain.text', '3rd & 5');
	});

	it('keeps the longest venue name inside the stage, beside the PowerScore', () => {
		const venue = { ...baseGame, venueName: 'Mercedes-Benz Superdome at the Caesars Superdome Complex', broadcasts: ['ESPN'] };
		cy.mount(<div style={frame}><GameStage game={venue} power={{ value: 93, label: 'PowerScore' }} note={stageNote(venue, { bettingEnabled: false }, i18n.t)} /></div>);
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
	it('shows the tab, both teams, the clock, and v2\'s PowerScore line', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={4} tab={<span>Tab 1</span>} /></div>);
		cy.get('.as-top-tab').should('have.text', 'Tab 1');
		cy.get('.as-top-status').should('have.text', 'LIVE');
		cy.get('.as-centre .as-clock').should('have.text', 'Q4 0:38');
		cy.get('.as-match-team').should('have.length', 2);
		cy.get('.as-power-label').should('have.text', 'PowerScore');
		cy.get('.as-power-figure').should('have.text', '88 / 100');
		cy.get('.as-trend').should('have.class', 'is-up').and('contain.text', '4');
	});

	it('says Steady for no movement and nothing before there is a reading to compare', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={0} /></div>);
		cy.get('.as-trend').should('have.text', 'Steady');
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} trend={null} /></div>);
		cy.get('.as-trend').should('not.exist');
	});

	it('keeps a ranked five-letter school and every line inside a half-width tile', () => {
		const wide = { ...baseGame, awayTeam: { ...baseGame.awayTeam, abbreviation: 'UCONN', rank: 12, score: 101 }, homeTeam: { ...baseGame.homeTeam, abbreviation: 'NOVA', rank: 3, score: 99 } };
		cy.mount(<div style={{ width: 144 }}><GameTile game={wide} power={88} trend={-12} tab={<span>Watching, Tab 2</span>} /></div>);
		cy.get('.as-tile').then($tile => {
			expect($tile[0]!.scrollWidth, 'nothing runs off the side').to.be.at.most($tile[0]!.clientWidth);
			for (const node of $tile[0]!.querySelectorAll('.as-top > *, .as-match > *, .as-power-line > *')) {
				expect(inside(node, $tile[0]!), node.className).to.equal(true);
			}
		});
	});

	it('rings the game being watched', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={baseGame} power={88} watched /></div>);
		cy.get('.as-tile').should('have.class', 'is-watched');
	});

	it('draws 32px crests with the scores beside them and the clock underneath', () => {
		cy.mount(<div style={{ width: 144 }}><GameTile game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, score: 42 }, homeTeam: { ...baseGame.homeTeam, score: 45 } }} power={88} trend={3} /></div>);
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 32, height: 32 });
		});
		cy.get('.as-match').then($match => {
			const crest = $match[0]!.querySelector('.as-crest-box')!.getBoundingClientRect();
			expect($match[0]!.querySelector('.as-centre')!.getBoundingClientRect().top, 'clock under the crests').to.be.at.least(crest.bottom);
		});
	});

	// No room for a star beside a tile's name, so it sits on the crest, and an empty one waits for you.
	it('keeps a favourite starred on its crest, and offers the other star once the tile has focus', () => {
		const toggle = cy.stub().as('toggle');
		cy.mount(
			<div style={{ width: 144 }}>
				<GameTile game={baseGame} power={88} favorites={{ away: false, home: true }} onToggleFavorite={toggle} interactive={{ role: 'button', tabIndex: 0 }} />
			</div>,
		);
		cy.get('.as-match-team.is-home .as-star').should('be.visible').and('have.attr', 'data-favorited', 'true').and('have.css', 'position', 'absolute');
		cy.get('.as-match-team.is-away .as-star').should('not.be.visible');
		cy.get('.as-tile').focus();
		cy.get('.as-match-team.is-away .as-star').should('be.visible').click();
		cy.get('@toggle').should('have.been.calledOnceWith', 'away');
	});
});

describe('a row', () => {
	it('puts the tab picker top-left, where every other game has it', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='dark' power={40} tab={<span className='as-picker'>Assign a tab</span>} /></div>);
		cy.get('.as-row').then($row => {
			const row = $row[0]!.getBoundingClientRect();
			const picker = $row[0]!.querySelector('.as-top-tab')!.getBoundingClientRect();
			expect(picker.left - row.left, 'at the left edge').to.be.lessThan(16);
			expect(picker.top - row.top, 'on the first line').to.be.lessThan(16);
		});
	});

	it('leaves out the top line when there is nothing to put on it', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z' }} theme='dark' quiet /></div>);
		cy.get('.as-top').should('not.exist');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z', postseasonLabel: 'Rose Bowl' }} theme='dark' quiet /></div>);
		cy.get('.as-top-context').should('have.text', 'Rose Bowl');
	});

	// Each team's colour holds its own end.
	it('holds each team\'s colour at its own end, with 28px crests', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='dark' power={40} /></div>);
		cy.get('.as-row').should($row => {
			const style = getComputedStyle($row[0]!);
			expect(style.getPropertyValue('--row-away').toLowerCase()).to.equal('#00471b');
			expect(style.getPropertyValue('--row-home').toLowerCase()).to.equal('#860038');
			expect(style.backgroundImage).to.contain('linear-gradient(90deg');
			expect(style.color).to.equal('rgb(255, 255, 255)');
		});
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 28, height: 28 });
		});
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='light' power={40} /></div>);
		cy.get('.as-row').should('have.css', 'color', 'rgb(14, 16, 19)');
	});

	it('carries v2\'s PowerScore line when there is a score, and none when there isn\'t', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} theme='dark' power={40} trend={2} /></div>);
		cy.get('.as-power-line .progress.as-heat').should('have.length', 1);
		cy.get('.as-power-figure').should('have.text', '40 / 100');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post' }} theme='dark' quiet /></div>);
		cy.get('.as-heat').should('not.exist');
	});

	it('uses the whole width, with no name cut short by a long status', () => {
		const long = { ...baseGame, status: 'pre' as const, startTime: '2026-09-28T23:20:00Z', postseasonLabel: 'ALWC · Game 2', broadcasts: ['Peacock'], awayTeam: { ...baseGame.awayTeam, abbreviation: 'CHW' }, homeTeam: { ...baseGame.homeTeam, abbreviation: 'HOU' } };
		cy.mount(<div style={frame}><GameRow game={long} theme='dark' quiet /></div>);
		cy.get('.as-match-name b').each($name => {
			expect($name[0]!.scrollWidth, $name.text()).to.be.at.most($name[0]!.clientWidth);
		});
		cy.get('.as-row').then($row => {
			const row = $row[0]!.getBoundingClientRect();
			const home = $row[0]!.querySelector('.as-match-team.is-home')!.getBoundingClientRect();
			expect(row.right - home.right, 'the home team reaches the far side').to.be.lessThan(20);
		});
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
		expect(upcomingStatus({ ...at(54), postseasonLabel: 'Rose Bowl' }, i18n.t, now), 'the round is on the top line').to.equal('in 54 min, NBC');
	});

	it('writes our sources\' rounds without their middle dots', () => {
		expect(roundLabel({ postseasonLabel: 'NLWC · Game 2' })).to.equal('NLWC, Game 2');
		expect(roundLabel({})).to.equal(undefined);
	});
});
