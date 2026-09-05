// Layout and paint, so this spec loads the real stylesheets. The geometry itself is unit-tested in
// packages/ui/tests/footballField.test.ts; what can only be checked here is that 120 yards of
// viewBox land where the yard numbers painted on them say they do.
import FootballFieldStrip from '@arenaswap/ui/src/components/footballFieldStrip';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const popupWidth = 320;

// A silver disc rather than a real crest, so the spec needs no network and the logo's own box is
// the only thing being measured.
const logoUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%23C0C0C0"/></svg>';

// Philadelphia at home, Dallas away: yardLine 0 is the Eagles' own goal line and 100 the Cowboys'.
// The two primaries are far enough apart that resolveTeamColorPair keeps both, which is what lets
// the end zones below be asserted against the teams' real hexes.
const nflGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nfl',
	sportType: 'football',
	period: 4,
	clockSeconds: 480,
	homeTeam: { id: 'phi', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, color: '#004C54', logo: logoUri },
	awayTeam: { id: 'dal', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, color: '#003594' },
	downDistance: '3rd & 5',
	fieldPosition: 'PHI 30',
	down: 3,
	distance: 5,
	yardLine: 30,
	possessionTeamId: 'phi',
	driveStartYardLine: 25,
};

const result: PowerScoreResult = {
	gameId: 'g1', total: 78, closeness: 20, lateGame: 18, momentum: 12,
	leadChanges: 8, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0,
	stalled: false, reason: 'Close game',
};

// The card's own inner width: the popup less its padding, less the card's.
const stripWidth = 289;

const mountStrip = (game: Game) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${stripWidth}px`, background: '#fff' }}>
			<FootballFieldStrip game={game} />
		</div>,
	);
	cy.document().its('fonts.ready');
};

// The SVG is 120 yards wide, so a yard is a fixed fraction of the rendered box and every marker's
// screen position can be checked against the yard marker ESPN named.
const yardsFromLeftEdge = (rect: DOMRect, fieldRect: DOMRect): number => (
	((rect.left + rect.width / 2 - fieldRect.left) / fieldRect.width) * 120
);

describe('football field', () => {
	it('fills its container at the proportions of a squashed field', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').should($svg => {
			const rect = $svg[0].getBoundingClientRect();
			expect(rect.width, 'fills its container').to.be.closeTo(stripWidth, 1);
			// 120 yards by 32, so the box the browser derives from the viewBox is 3.75:1. A real
			// field is 2.25:1; the difference is the cross-field squash that keeps it under 80px.
			expect(rect.width / rect.height, 'aspect ratio').to.be.closeTo(3.75, 0.05);
			expect(rect.height, 'height in a 560px popup').to.be.closeTo(77, 2);
		});
	});

	it('puts the ball on the yard line ESPN named', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
			// "PHI 30" is 30 yards from the home goal line, which is the right-hand one, so it sits
			// 80 yards in from the left edge: 10 of end zone plus 70 of field.
			expect(yardsFromLeftEdge(ball, fieldRect)).to.be.closeTo(80, 1.2);
		});
	});

	it('lines the painted numbers up with the yard lines they label, in two mirrored rows', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const numbers = [...$svg[0].querySelectorAll<SVGTextElement>('.ff-number')];
			expect(numbers, 'nine numbers, twice').to.have.length(18);

			const lines = [...$svg[0].querySelectorAll('.ff-yard-line')];
			expect(lines).to.have.length(9);
			numbers.forEach(number => {
				const numberYards = yardsFromLeftEdge(number.getBoundingClientRect(), fieldRect);
				const nearest = lines
					.map(line => yardsFromLeftEdge(line.getBoundingClientRect(), fieldRect))
					.reduce((best, x) => Math.abs(x - numberYards) < Math.abs(best - numberYards) ? x : best);
				expect(numberYards, `number ${number.textContent} sits on a line`).to.be.closeTo(nearest, 0.6);
			});

			// Mirrored about the centre line, which is the only way both rows can be upright and
			// still look painted on.
			const rows = [...new Set(numbers.map(n => Math.round(n.getBoundingClientRect().top)))];
			expect(rows, 'exactly two rows').to.have.length(2);
			const centres = rows.map(top => top + numbers[0]!.getBoundingClientRect().height / 2 - fieldRect.top);
			expect(centres[0]! + centres[1]!).to.be.closeTo(fieldRect.height, 3);
		});
	});

	it('paints each end zone in its team\'s own colour, unaltered', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone').should($zones => {
			expect($zones).to.have.length(2);
			// Away first: yardLine 100 is the Cowboys' goal line and the field draws it on the left.
			expect($zones[0]!.getAttribute('fill')).to.equal('#003594');
			expect($zones[1]!.getAttribute('fill')).to.equal('#004C54');
		});
	});

	it('names both end zones for the team that defends it', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-label').should($labels => {
			expect([...$labels].map(label => label.textContent)).to.deep.equal(['DAL', 'PHI']);
		});
	});

	it('washes the ground the drive has covered, back to where it started', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const drive = $svg[0].querySelector('.ff-drive')!.getBoundingClientRect();
			// The Eagles' own 25 to their own 30 is five yards, and it sits behind the ball.
			expect((drive.width / fieldRect.width) * 120, 'five yards of drive').to.be.closeTo(5, 0.3);
			expect(drive.height, 'full depth of the field').to.be.closeTo(fieldRect.height, 1);
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
			expect(drive.right, 'the wash trails the ball rather than leading it').to.be.greaterThan(ball.left);
		});
	});

	it('puts the line to gain ahead of the ball, on the side the offense is moving toward', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
			const line = $svg[0].querySelector('.ff-first-down')!.getBoundingClientRect();
			// 3rd & 5 with the Eagles at home, so the line to gain is five yards to the left.
			expect(yardsFromLeftEdge(line, fieldRect)).to.be.closeTo(75, 0.3);
			expect(line.left, 'ahead of the ball').to.be.lessThan(ball.left);
		});
	});

	// Sportvision's 1998 convention: yellow is the line to gain and blue is the line of scrimmage.
	it('keeps the line of scrimmage blue rather than taking the offense\'s colour', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const scrimmage = $svg[0].querySelector('.ff-scrimmage')!;
			expect(getComputedStyle(scrimmage).fill).to.equal('rgb(46, 134, 255)');
			expect(yardsFromLeftEdge(scrimmage.getBoundingClientRect(), fieldRect), 'under the ball').to.be.closeTo(80, 0.4);
		});
	});

	// The line to gain and the goal line land on the same column of pixels here, so what this
	// checks is that the yellow paints over the white rather than being clipped away outside it.
	it('recolours the goal line on goal to go', () => {
		mountStrip({ ...nflGame, downDistance: '3rd & Goal', fieldPosition: 'DAL 5', distance: 5, yardLine: 95 });
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const line = $svg[0].querySelector('.ff-first-down')!.getBoundingClientRect();
			expect(yardsFromLeftEdge(line, fieldRect), 'sits on the away goal line').to.be.closeTo(10, 0.3);
			// Drawn after the goal lines, so it is the colour that survives the overlap.
			const marks = [...$svg[0].querySelectorAll('*')];
			expect(marks.indexOf($svg[0].querySelector('.ff-first-down')!))
				.to.be.greaterThan(marks.indexOf($svg[0].querySelectorAll('.ff-goal-line')[1]!));
		});
	});

	it('sets the college hash rows wider apart than the professional ones', () => {
		mountStrip(nflGame);
		cy.get('.ff-hashes').then($path => {
			const pro = $path[0].getBoundingClientRect().height;
			cy.wrap(pro).as('proRows');
		});
		mountStrip({ ...nflGame, league: 'ncaaf' });
		cy.get('.ff-hashes').then($path => {
			const college = $path[0].getBoundingClientRect().height;
			cy.get('@proRows').then(pro => {
				// 40 feet apart against 18'6", so college clears double even after the squash.
				expect(college).to.be.greaterThan(Number(pro) * 2);
			});
		});
	});

	it('paints the home crest on the 50, between the two rows of numbers', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const logo = $svg[0].querySelector('.ff-logo')!.getBoundingClientRect();
			expect(yardsFromLeftEdge(logo, fieldRect), 'centred on midfield').to.be.closeTo(60, 0.3);
			expect(logo.top + logo.height / 2 - fieldRect.top).to.be.closeTo(fieldRect.height / 2, 1);
			// The rule caps a midfield logo at 1200 square feet, about 13 yards across.
			expect((logo.width / fieldRect.width) * 120).to.be.at.most(13);

			const numbers = [...$svg[0].querySelectorAll('.ff-number')].map(n => n.getBoundingClientRect());
			const topRow = Math.max(...numbers.filter(n => n.top < fieldRect.top + fieldRect.height / 2).map(n => n.bottom));
			expect(logo.top, 'clear of the top row').to.be.at.least(topRow);
		});
	});

	it('leaves out a crest the API never sent', () => {
		mountStrip({ ...nflGame, homeTeam: { ...nflGame.homeTeam, logo: undefined } });
		cy.get('.ff-field').should('exist');
		cy.get('.ff-logo').should('not.exist');
	});

	it('draws nothing at all without a live football situation', () => {
		mountStrip({ ...nflGame, status: 'pre' });
		cy.get('.ff-field').should('not.exist');
		mountStrip({ ...nflGame, yardLine: undefined });
		cy.get('.ff-field').should('not.exist');
	});

	it('names the team with the ball for a screen reader without printing a number', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').should('have.attr', 'aria-label', 'Philadelphia Eagles has the ball');
	});
});

describe('football field on a list card', () => {
	// A card answers "should I switch to this", and where the ball is on the field is not part of
	// that answer — it is what you want once the game is already open.
	it('stays off the card entirely', () => {
		cy.viewport(popupWidth, 600);
		cy.mount(
			<div style={{ width: `${popupWidth}px` }}>
				<LiveGameCard
					game={nflGame}
					excitementResult={result}
					favoriteTeamIds={new Set<string>()}
					onToggleFavoriteTeam={() => {}}
					onOpenGameDetail={() => {}}
					bettingPrefs={{ bettingEnabled: false }}
				/>
			</div>,
		);
		cy.get('.game-card').should('exist');
		cy.get('.ff-field').should('not.exist');
	});
});
