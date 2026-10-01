import GameStage from '@arenaswap/ui/src/components/gameStage';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import type { Game } from '@arenaswap/core/types';
import { roundLabel, stageNote, upcomingStatus } from '@arenaswap/ui/src/components/boardSituation';
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

const frame = { width: 296, background: 'var(--as-page)' };
const tileFrame = { width: 144 };

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

const centreOf = (element: Element) => {
	const box = element.getBoundingClientRect();
	return box.left + box.width / 2;
};

describe('the matchup', () => {
	it('sets the two scores together in the middle around v2\'s hairline, with the clock and period under them', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} power={93} /></div>);
		cy.get('.as-match > *').then($parts => {
			const has = (index: number, ...names: string[]) => names.every(name => $parts[index]!.classList.contains(name));
			expect(has(0, 'as-match-team', 'is-away'), 'away team').to.equal(true);
			expect(has(1, 'as-match-score', 'is-away'), 'away score').to.equal(true);
			expect(has(2, 'as-match-mid'), 'hairline').to.equal(true);
			expect(has(3, 'as-match-score', 'is-home'), 'home score').to.equal(true);
			expect(has(4, 'as-centre'), 'centre').to.equal(true);
			expect(has(5, 'as-match-team', 'is-home'), 'home team').to.equal(true);
		});
		cy.get('.as-centre .as-clock').should('have.text', '0:38');
		cy.get('.as-centre .as-period').should('have.text', 'Q4');
		cy.get('.as-match-score.is-behind').should('not.exist');
	});

	// The hairline is the plate's axis, and the clock sits on it under the scores.
	it('keeps the hairline and the clock on the plate\'s centre line, and the scores on the crests\' midline', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, score: 1 }, homeTeam: { ...baseGame.homeTeam, score: 108 } }} /></div>);
		cy.get('.as-stage').then($stage => {
			const stage = $stage[0]!;
			const axis = centreOf(stage);
			expect(centreOf(stage.querySelector('.as-match-sep')!), 'hairline').to.be.closeTo(axis, 1);
			expect(centreOf(stage.querySelector('.as-clock')!), 'clock').to.be.closeTo(axis, 1);
			const crest = stage.querySelector('.as-crest-box')!;
			for (const score of stage.querySelectorAll('.as-match-score')) expect(middleOf(score), 'score').to.be.closeTo(middleOf(crest), 3);
		});
	});

	it('sets the scores in Geist\'s tabular figures', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} /></div>);
		cy.get('.as-match-score').first().should($score => {
			const style = getComputedStyle($score[0]!);
			expect(style.fontFamily).to.match(/^"?Geist/);
			expect(style.fontVariantNumeric).to.equal('tabular-nums');
		});
		cy.get('.as-clock').should($clock => expect(getComputedStyle($clock[0]!).fontFamily).to.match(/^"?DM Sans/));
	});

	it('swaps the hairline for the bases in the inning sports, with the outs under the inning', () => {
		cy.mount(<div style={frame}><GameRow game={baseball} power={40} /></div>);
		cy.get('.as-match-mid.is-bases .base-marker.occupied').should('have.length', 2);
		cy.get('.as-match-sep').should('not.exist');
		cy.get('.as-centre .as-outs').should('have.attr', 'aria-label', '2 outs');
		cy.get('.as-centre .as-out.is-out').should('have.length', 2);
		cy.get('.as-centre .inning-half-icon').should('have.class', 'bi-caret-down-fill');
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} /></div>);
		cy.get('.as-match-mid.is-bases').should('not.exist');
		cy.get('.as-match-sep').should('exist');
	});

	it('writes the down and distance with the yard line under the clock for football', () => {
		cy.mount(<div style={frame}><GameRow game={football} power={40} /></div>);
		cy.get('.as-centre .as-downs').should('have.text', '3rd & 5 at PHI 30');
		cy.mount(<div style={tileFrame}><GameTile game={football} power={80} /></div>);
		cy.get('.as-downs.is-stacked b').should('have.text', '3rd & 5');
		cy.get('.as-downs.is-stacked small').should('have.text', 'PHI 30');
	});

	it('shows the start time and where to watch before a game, and no scores', () => {
		const now = Date.now();
		const later = { ...baseGame, status: 'pre' as const, startTime: new Date(now + 54 * 60_000).toISOString(), broadcasts: ['NBC'] };
		cy.mount(<div style={frame}><GameRow game={later} /></div>);
		cy.get('.as-match').should('have.class', 'is-pre');
		cy.get('.as-match-score').should('not.exist');
		cy.get('.as-centre-time').invoke('text').should('match', /\d/);
		cy.get('.as-centre-time').should('have.css', 'color', 'rgb(96, 78, 6)');
		cy.get('.as-centre-note').should('have.text', 'in 54 min, NBC');
		cy.get('.as-power-line').should('not.exist');
	});

	it('says Final on the status row once it is over, and dims only the side that lost', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post', finalPeriodSuffix: 'OT' }} /></div>);
		cy.get('.as-status.is-final').should('have.text', 'Final/OT');
		cy.get('.as-centre').should('not.exist');
		cy.get('.as-match-score.is-away').should('have.class', 'is-behind').and('have.css', 'color', 'rgb(124, 135, 148)');
		cy.get('.as-live-dot').should('not.exist');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post', homeTeam: { ...baseGame.homeTeam, score: 107 } }} /></div>);
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

describe('the plate', () => {
	it('runs each team\'s colour down its own side over a wash of both, in dark ink, in either theme', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} /></div>);
		cy.get('.as-row').should($row => {
			const style = getComputedStyle($row[0]!);
			expect(style.borderLeftColor, 'away rail').to.equal('rgb(0, 71, 27)');
			expect(style.borderRightColor, 'home rail').to.equal('rgb(134, 0, 56)');
			expect(style.borderLeftWidth).to.equal('5px');
			expect(style.backgroundImage).to.contain('linear-gradient(90deg');
			expect(style.color).to.equal('rgb(17, 24, 39)');
		});
		cy.document().then(doc => doc.documentElement.setAttribute('data-bs-theme', 'light'));
		cy.get('.as-row').should('have.css', 'color', 'rgb(17, 24, 39)');
		cy.document().then(doc => doc.documentElement.removeAttribute('data-bs-theme'));
	});

	it('steps a finished game back to a flat grey plate with no rails', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post' }} /></div>);
		cy.get('.as-row').should($row => {
			const style = getComputedStyle($row[0]!);
			expect(style.borderLeftWidth).to.equal('1px');
			expect(style.backgroundColor).to.equal('rgb(244, 246, 248)');
			expect(style.backgroundImage).to.equal('none');
		});
	});

	it('carries the tab picker along the bottom', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} tab={<button type='button' className='form-select'>Assign a tab</button>} /></div>);
		cy.get('.as-row').then($row => {
			const row = $row[0]!.getBoundingClientRect();
			const picker = $row[0]!.querySelector('.as-plate-tab')!.getBoundingClientRect();
			const power = $row[0]!.querySelector('.as-power-line')!.getBoundingClientRect();
			expect(picker.top, 'under the PowerScore').to.be.at.least(power.bottom);
			expect(row.bottom - picker.bottom, 'last on the plate').to.be.lessThan(16);
		});
	});
});

describe('the live dot and the status word', () => {
	it('pulses red in front of LIVE on the status row', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} /></div>);
		cy.get('.as-top .as-status .as-live-dot').should('have.class', 'is-live').and('have.css', 'animation-name', 'as-live-pulse');
		cy.get('.as-top .as-status').should('have.text', 'LIVE').and('have.css', 'text-transform', 'uppercase').and('have.css', 'color', 'rgb(163, 56, 10)');
	});

	it('turns pink past regulation, with the sport\'s own word and a pink ring', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, period: 5 }} power={40} /></div>);
		cy.get('.as-live-dot').should('have.class', 'is-overtime').and('have.css', 'background-color', 'rgb(217, 3, 104)');
		cy.get('.as-status').should('have.text', 'OT');
		cy.get('.as-row').should('have.class', 'is-overtime').and('have.css', 'box-shadow').and('contain', 'rgb(217, 3, 104)');
		cy.mount(<div style={frame}><GameRow game={{ ...baseball, period: 10 }} power={40} /></div>);
		cy.get('.as-status').should('have.text', 'Extras');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, league: 'mls', sportType: 'soccer', period: 3 }} power={40} /></div>);
		cy.get('.as-status').should('have.text', 'Extra time');
	});

	it('pauses in yellow for a delay, with both rails given over to it', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, delayed: true, delayDescription: 'Rain Delay' }} power={40} /></div>);
		cy.get('.as-live-dot').should('have.class', 'bi-pause-fill').and('have.class', 'is-delay');
		cy.get('.as-clock').should('have.class', 'is-delayed').and('contain.text', 'Rain Delay');
		cy.get('.as-status').should('have.text', 'Delay');
		cy.get('.as-row').should($row => {
			const style = getComputedStyle($row[0]!);
			expect(style.borderLeftColor).to.equal('rgb(241, 196, 15)');
			expect(style.borderRightColor).to.equal('rgb(241, 196, 15)');
		});
	});
});

describe('the stage', () => {
	it('draws v2\'s 64px crests, and a PowerScore bar in the colour of the score', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, period: 2, clockSeconds: 5, awayTeam: { ...baseGame.awayTeam, score: 42 }, homeTeam: { ...baseGame.homeTeam, score: 45 } }} power={93} /></div>);
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect().width).to.equal(64);
		});
		cy.get('.as-stage .as-power-figure').should('have.text', '93 / 100');
		cy.get('.as-stage .progress.as-heat').should('have.attr', 'aria-hidden', 'true');
		// Retried: the fill grows in from empty when it first appears.
		cy.get('.as-stage .progress-bar').should($bar => {
			expect($bar[0]!.style.width).to.equal('93%');
			expect($bar[0]!.getBoundingClientRect().width / $bar[0]!.parentElement!.getBoundingClientRect().width).to.be.closeTo(0.93, 0.01);
			expect(getComputedStyle($bar[0]!).backgroundColor, 'v2 orange at 93').to.equal('rgb(239, 96, 14)');
		});
	});

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

	it('puts LIVE on the left of the status row and the round on the right', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, postseasonLabel: 'NLWC · Game 2' }} /></div>);
		cy.get('.as-top > *').then($parts => {
			expect([...$parts].map(part => part.textContent)).to.deep.equal(['LIVE', 'NLWC, Game 2']);
		});
	});

	it('names the teams by nickname with records when asked to, the star under the name', () => {
		cy.mount(<div style={frame}><GameStage game={baseGame} names='name' records={{ away: '44-27', home: '52-19' }} onToggleFavorite={() => {}} favorites={{ away: false, home: false }} /></div>);
		cy.get('.as-match-team.is-away').should('contain.text', 'Bucks').and('contain.text', '44-27').then($team => {
			const name = $team[0]!.querySelector('b')!.getBoundingClientRect();
			const star = $team[0]!.querySelector('.as-star')!.getBoundingClientRect();
			expect(star.top, 'star under the name').to.be.at.least(name.bottom - 1);
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

	it('draws the full count under the inning, where v2 had it', () => {
		cy.mount(<div style={frame}><GameStage game={baseball} /></div>);
		cy.get('.as-centre .bso-indicator .bso-dot.is-empty').should('have.length', 3);
		cy.get('.as-centre .bso-indicator .bso-dot').not('.is-empty').should('have.length', 4);
		cy.mount(<div style={frame}><GameStage game={baseGame} /></div>);
		cy.get('.bso-indicator').should('not.exist');
	});

	it('writes timeouts as a number when a sport allows more than fit as dots', () => {
		cy.mount(<div style={frame}><GameStage game={{ ...baseGame, homeTeam: { ...baseGame.homeTeam, timeouts: 6 } }} favorites={{ away: false, home: true }} /></div>);
		cy.get('.as-match-team.is-home .timeout-dots-numeric').should('contain.text', '6');
		cy.get('.as-match-team.is-home').then($team => {
			expect(inside($team[0]!, $team[0]!.closest('.as-stage')!), 'timeouts and the star stay in the stage').to.equal(true);
		});
	});
});

describe('the stage meta', () => {
	const note = (game: Game, betting = false) => (
		<div style={frame}><GameStage game={game} note={stageNote(game, { bettingEnabled: betting }, i18n.t)} /></div>
	);

	it('leads with the venue and says where to watch, as v2 did', () => {
		cy.mount(note({ ...baseGame, venueName: 'Rocket Arena', broadcasts: ['ESPN', 'NBCSN', 'Peacock'] }));
		cy.get('.as-meta-venue').should('have.text', 'Rocket Arena');
		cy.get('.as-meta-watch').should('have.text', 'Watch: ESPN • NBCSN');
		cy.get('.as-meta-watch b').should('have.text', 'Watch:');
	});

	it('leaves the down and distance to the middle of the matchup', () => {
		cy.mount(note({ ...football, venueName: 'Lincoln Financial Field' }));
		cy.get('.as-stage-note').should('not.contain.text', '3rd & 5');
	});

	it('keeps the longest venue name inside the stage', () => {
		cy.mount(note({ ...baseGame, venueName: 'Mercedes-Benz Superdome at the Caesars Superdome Complex', broadcasts: ['ESPN'] }));
		cy.get('.as-stage-note').then($note => {
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
		cy.get('.as-meta-provider').click();
		cy.wrap(opened).should('have.length', 0);
		cy.get('.as-stage').click('left');
		cy.wrap(opened).should('deep.equal', ['g1']);
	});

	it('adds the line, with its provider, only when betting is on', () => {
		const odds = { ...baseGame, odds: { details: 'CLE -1.5', overUnder: 224.5, provider: { name: 'Draft Kings' } } };
		cy.mount(note(odds, true));
		cy.get('.as-meta-odds').should('contain.text', 'CLE -1.5 • O/U 224.5').and('contain.text', 'Draft Kings');
		// Bootstrap arrives on a lazily imported chunk and moves the title aside once it owns the element.
		cy.get('.as-meta-provider').should('have.attr', 'data-bs-original-title').and('contain', 'Draft Kings');
		cy.get('.as-meta-provider').should('match', 'button').trigger('mouseover');
		cy.get('.tooltip.show').should('be.visible').and('contain.text', 'Odds provided by: Draft Kings');
		cy.get('.as-meta-provider').trigger('mouseout');
		cy.get('.as-meta-provider').focus();
		cy.get('.tooltip.show').should('be.visible');
		cy.get('.as-meta-provider').should($provider => {
			expect(getComputedStyle($provider[0]!).cursor, 'help cursor').to.equal('help');
		});
		cy.mount(note(odds, false));
		cy.get('.as-meta-odds').should('not.exist');
	});
});

describe('a tile', () => {
	it('shows LIVE, both teams, the clock, v2\'s PowerScore line and the picker', () => {
		cy.mount(<div style={tileFrame}><GameTile game={baseGame} power={88} trend={4} tab={<span>Tab 1</span>} /></div>);
		cy.get('.as-top .as-status').should('have.text', 'LIVE');
		cy.get('.as-centre .as-clock').should('have.text', '0:38');
		cy.get('.as-match-team').should('have.length', 2);
		cy.get('.as-power-label').should('have.text', 'PowerScore');
		cy.get('.as-power-figure').should('have.text', '88 / 100');
		cy.get('.as-trend').should('have.class', 'is-up').and('contain.text', '4');
		cy.get('.as-plate-tab').should('have.text', 'Tab 1');
	});

	it('says Steady for no movement and nothing before there is a reading to compare', () => {
		cy.mount(<div style={tileFrame}><GameTile game={baseGame} power={88} trend={0} /></div>);
		cy.get('.as-trend').should('have.text', 'Steady');
		cy.mount(<div style={tileFrame}><GameTile game={baseGame} power={88} trend={null} /></div>);
		cy.get('.as-trend').should('not.exist');
	});

	// Each half stacks its crest, its score and its name, so no score is too wide for it.
	it('keeps ranked five-letter schools with three-digit scores whole inside a half-width tile', () => {
		const wide = { ...baseGame, awayTeam: { ...baseGame.awayTeam, abbreviation: 'UCONN', rank: 12, score: 107 }, homeTeam: { ...baseGame.homeTeam, abbreviation: 'TENN', rank: 15, score: 118 } };
		cy.mount(<div style={tileFrame}><GameTile game={wide} power={88} trend={-12} tab={<span>Watching, Tab 2</span>} /></div>);
		cy.get('.as-tile').then($tile => {
			expect($tile[0]!.scrollWidth, 'nothing runs off the side').to.be.at.most($tile[0]!.clientWidth);
			for (const node of $tile[0]!.querySelectorAll('.as-top > *, .as-match > *, .as-power-line > *')) {
				expect(inside(node, $tile[0]!), node.className).to.equal(true);
			}
		});
		cy.get('.as-match-name b').each($name => {
			expect($name[0]!.dataset.nameFit, $name.text()).to.equal(undefined);
		});
	});

	it('rings the game being watched', () => {
		cy.mount(<div style={tileFrame}><GameTile game={baseGame} power={88} watched /></div>);
		cy.get('.as-tile').should('have.class', 'is-watched');
	});

	it('draws 32px crests over the scores, with the clock under them', () => {
		cy.mount(<div style={tileFrame}><GameTile game={{ ...baseGame, awayTeam: { ...baseGame.awayTeam, score: 42 }, homeTeam: { ...baseGame.homeTeam, score: 45 } }} power={88} trend={3} /></div>);
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 32, height: 32 });
		});
		cy.get('.as-match').then($match => {
			const match = $match[0]!;
			const crest = match.querySelector('.as-crest-box')!.getBoundingClientRect();
			const score = match.querySelector('.as-match-score')!;
			expect(score.getBoundingClientRect().top, 'score under the crest').to.be.at.least(crest.bottom);
			expect(centreOf(score), 'centred under it').to.be.closeTo(crest.left + crest.width / 2, 1);
			expect(match.querySelector('.as-centre')!.getBoundingClientRect().top, 'clock under the names').to.be.at.least(match.querySelector('.as-match-name')!.getBoundingClientRect().bottom);
		});
	});

	// No room for a star beside a tile's name, so it sits on the crest, and an empty one waits for you.
	it('keeps a favourite starred on its crest, and offers the other star once the tile has focus', () => {
		const toggle = cy.stub().as('toggle');
		cy.mount(
			<div style={tileFrame}>
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
	it('leaves out the status row when there is nothing to put on it', () => {
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z' }} /></div>);
		cy.get('.as-top').should('not.exist');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'pre', startTime: '2026-09-28T23:20:00Z', postseasonLabel: 'Rose Bowl' }} /></div>);
		cy.get('.as-top-context').should('have.text', 'Rose Bowl');
	});

	it('sets each 28px crest beside its tricode, at the outer edges', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} /></div>);
		cy.get('.as-match-team .as-crest-box').each($box => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 28, height: 28 });
		});
		cy.get('.as-match').then($match => {
			const crest = (side: string) => $match[0]!.querySelector(`.as-match-team.is-${side} .as-crest-box`)!.getBoundingClientRect();
			const name = (side: string) => $match[0]!.querySelector(`.as-match-team.is-${side} b`)!.getBoundingClientRect();
			expect(name('away').left, 'away name after its crest').to.be.at.least(crest('away').right);
			expect(name('home').right, 'home name before its crest').to.be.at.most(crest('home').left);
			expect(middleOf($match[0]!.querySelector('b')!), 'beside it').to.be.closeTo(middleOf($match[0]!.querySelector('.as-crest-box')!), 2);
		});
	});

	it('carries v2\'s PowerScore line when there is a score, and none when there isn\'t', () => {
		cy.mount(<div style={frame}><GameRow game={baseGame} power={40} trend={2} /></div>);
		cy.get('.as-power-line .progress.as-heat').should('have.length', 1);
		cy.get('.as-power-figure').should('have.text', '40 / 100');
		cy.mount(<div style={frame}><GameRow game={{ ...baseGame, status: 'post' }} /></div>);
		cy.get('.as-heat').should('not.exist');
	});

	it('uses the whole width, with no name cut short by a long status', () => {
		const long = { ...baseGame, status: 'pre' as const, startTime: '2026-09-28T23:20:00Z', postseasonLabel: 'ALWC · Game 2', broadcasts: ['Peacock'], awayTeam: { ...baseGame.awayTeam, abbreviation: 'CHW' }, homeTeam: { ...baseGame.homeTeam, abbreviation: 'HOU' } };
		cy.mount(<div style={frame}><GameRow game={long} /></div>);
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
