// Layout and paint, so this spec loads the real stylesheets. The geometry itself is unit-tested in
// packages/ui/tests/footballField.test.ts; what can only be checked here is that 120 yards of
// viewBox land where the yard numbers painted on them say they do.
import FootballFieldStrip from '@arenaswap/ui/src/components/footballFieldStrip';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import { numberRowsY, stripHeight } from '@arenaswap/ui/src/components/footballField';
import type { Game, PowerScoreResult, TeamMonoMarks } from '@arenaswap/core/types';

const popupWidth = 320;

// A silver disc rather than a real crest, so the spec needs no network and the logo's own box is
// the only thing being measured. Silver reads on everything the field paints, which is what keeps
// it out of the way of the legibility treatment below.
const logoUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%23C0C0C0"/></svg>';
// The turf's own green, so not one pixel of it clears 4.5:1 against the grass it is painted on.
const invisibleOnTurfUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%2322683B"/></svg>';
const whiteMarkUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%23ffffff"/></svg>';

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
	homeTeam: { id: 'phi', name: 'Philadelphia Eagles', nickname: 'Eagles', abbreviation: 'PHI', score: 17, color: '#004C54', logo: logoUri },
	awayTeam: { id: 'dal', name: 'Dallas Cowboys', nickname: 'Cowboys', abbreviation: 'DAL', score: 14, color: '#003594', logo: logoUri },
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

const mountStrip = (game: Game, monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null }) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${stripWidth}px`, background: '#fff' }}>
			<FootballFieldStrip game={game} monoMarks={monoMarks} />
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

	it('letters each end zone with the crest and nickname of the team that defends it', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-name').should($names => {
			expect([...$names].map(name => name.textContent)).to.deep.equal(['Cowboys', 'Eagles']);
		});
		cy.get('.ff-endzone-mark .crest').should('have.length', 2);
	});

	// The mark has to land on the paint rather than beside it, which is the one thing an HTML
	// overlay over an SVG can get wrong: the two derive their geometry from different boxes.
	it('keeps each end zone mark inside the ten yards it is painted on', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const zones = [...$svg[0].querySelectorAll('.ff-endzone')].map(z => z.getBoundingClientRect());
			cy.get('.ff-endzone-mark').should($marks => {
				[...$marks].forEach((mark, index) => {
					const rect = mark.getBoundingClientRect();
					expect(rect.left, 'left edge on the end zone').to.be.closeTo(zones[index]!.left, 0.6);
					expect(rect.width, 'ten yards wide').to.be.closeTo(fieldRect.width / 12, 0.6);
					expect(rect.height, 'the full depth of the field').to.be.closeTo(fieldRect.height, 0.6);
				});
			});
		});
	});

	// Each side reads upright to somebody standing behind it, which is how a field is lettered, and
	// the crest lies down with it rather than standing up out of the paint.
	it('mirrors both end zone marks about midfield, crest and lettering together', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-away .ff-endzone-name').should($name => {
			expect(getComputedStyle($name[0]!).rotate).to.equal('180deg');
		});
		cy.get('.ff-endzone-home .ff-endzone-name').should($name => {
			expect(getComputedStyle($name[0]!).rotate).to.equal('none');
		});
		cy.get('.ff-endzone-away .ff-endzone-crest').should('have.css', 'rotate', '-90deg');
		cy.get('.ff-endzone-home .ff-endzone-crest').should('have.css', 'rotate', '90deg');
	});

	// Painted lettering, so it is set in caps whatever case ESPN sends — and the DOM keeps ESPN's
	// own casing, which is what a screen reader and a test both want.
	it('letters the nickname in caps without shouting it into the DOM', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-home .ff-endzone-name')
			.should('have.text', 'Eagles')
			.and('have.css', 'text-transform', 'uppercase');
	});

	// The one thing the end zone cannot do is silently drop half a team's name. Everything the NFL
	// has and the long college names short of fifteen letters fit; past that it truncates.
	it('fits the longest nicknames either league puts on a field', () => {
		const withNicknames = (away: string, home: string): Game => ({
			...nflGame,
			awayTeam: { ...nflGame.awayTeam, nickname: away },
			homeTeam: { ...nflGame.homeTeam, nickname: home },
		});
		mountStrip(withNicknames('Commanders', 'Mountaineers'));
		cy.get('.ff-endzone-name').should($names => {
			[...$names].forEach(name => {
				expect(name.scrollHeight, `${name.textContent} fits`)
					.to.be.at.most(Math.round(name.getBoundingClientRect().height));
			});
		});
	});

	// The crest comes first in the reading direction on both sides, which on the away end zone means
	// physically lowest: its text runs bottom to top.
	it('puts the crest ahead of the nickname on both sides', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-away').should($mark => {
			const crest = $mark[0]!.querySelector('.crest')!.getBoundingClientRect();
			const name = $mark[0]!.querySelector('.ff-endzone-name')!.getBoundingClientRect();
			expect(crest.top, 'crest below the nickname').to.be.greaterThan(name.bottom - 1);
		});
		cy.get('.ff-endzone-home').should($mark => {
			const crest = $mark[0]!.querySelector('.crest')!.getBoundingClientRect();
			const name = $mark[0]!.querySelector('.ff-endzone-name')!.getBoundingClientRect();
			expect(crest.bottom, 'crest above the nickname').to.be.lessThan(name.top + 1);
		});
	});

	it('falls back to the abbreviation for a team ESPN sent no nickname for', () => {
		mountStrip({ ...nflGame, awayTeam: { ...nflGame.awayTeam, nickname: undefined } });
		cy.get('.ff-endzone-away .ff-endzone-name').should('have.text', 'DAL');
	});

	it('runs the drive bar back from the ball to where the drive started', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const drive = $svg[0].querySelector('.ff-drive')!.getBoundingClientRect();
			const yardsAt = (edge: number) => ((edge - fieldRect.left) / fieldRect.width) * 120;
			// The Eagles are at home and therefore driving right to left, so the bar reaches back
			// from their own 30 to their own 25 — the ball at its near end, the drive start at its far.
			expect(yardsAt(drive.left), 'near end on the ball').to.be.closeTo(80, 0.5);
			expect(yardsAt(drive.right), 'far end on the drive start').to.be.closeTo(85, 0.5);
		});
	});

	// It rides the ball's own line rather than sitting somewhere else on the field, which is what
	// makes it read as ground that ball has covered instead of as a separate gauge.
	it('runs the drive bar along the ball\'s line, inside the hash rows', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const drive = $svg[0].querySelector('.ff-drive')!.getBoundingClientRect();
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
			expect(drive.top + drive.height / 2, 'shares the ball\'s centre line')
				.to.be.closeTo(ball.top + ball.height / 2, 1.5);

			// The hash rows are the closest pair of markings it has to fit between.
			const hashes = $svg[0].querySelector('.ff-hashes')!.getBoundingClientRect();
			expect(drive.top).to.be.greaterThan(hashes.top);
			expect(drive.bottom).to.be.lessThan(hashes.bottom);
		});
	});

	// It still terminates on the line of scrimmage, which is what keeps it legible as ball
	// movement from the bottom of the field: that line runs the full depth.
	it('meets the line of scrimmage', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const drive = $svg[0].querySelector('.ff-drive')!.getBoundingClientRect();
			const scrimmage = $svg[0].querySelector('.ff-scrimmage')!.getBoundingClientRect();
			expect(drive.left).to.be.closeTo(scrimmage.left + scrimmage.width / 2, 2);
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

			// Against the lines the numerals are anchored to rather than their rendered boxes: a
			// `<text>` rect is the em box, which for digits reaches about two yards past the last
			// painted pixel, and holding the stencil off that empty space would cap it at 11 yards.
			const across = (row: number) => fieldRect.top + (row / stripHeight) * fieldRect.height;
			expect(logo.top, 'clear of the top row').to.be.at.least(across(numberRowsY[0]));
			expect(logo.bottom, 'clear of the bottom row').to.be.at.most(across(numberRowsY[1]));
		});
	});

	// It is judged against the grass the same way the end zone crests are judged against paint, and
	// a crest that cannot be read there gives up its colours for ESPN's white mark.
	it('takes the white mark for a midfield crest the grass swallows', () => {
		mountStrip(
			{ ...nflGame, homeTeam: { ...nflGame.homeTeam, logo: invisibleOnTurfUri } },
			{ home: { white: whiteMarkUri } },
		);
		cy.get('.ff-logo .crest > img').should('have.attr', 'src', whiteMarkUri);
	});

	// Last rung of the same ladder: no mark to fall back to, so the crest keeps its colours and gets
	// a disc to stand on instead.
	it('gives a midfield crest a disc when there is no mark to fall back to', () => {
		mountStrip({ ...nflGame, homeTeam: { ...nflGame.homeTeam, logo: invisibleOnTurfUri } });
		cy.get('.ff-logo-shell').should('not.have.class', 'is-bare');
		cy.get('.ff-logo .crest > img').should('have.attr', 'src', invisibleOnTurfUri);
	});

	it('leaves a readable midfield crest bare, in its own colours', () => {
		mountStrip(nflGame);
		cy.get('.ff-logo-shell').should('have.class', 'is-bare');
		cy.get('.ff-logo .crest > img').should('have.attr', 'src', logoUri);
	});

	// The whole reason it stays inside the SVG rather than joining the end zone marks on top of it:
	// the ball and both live lines cross the 50 and belong over the paint, not under it.
	it('keeps the midfield crest under the ball and the two live lines', () => {
		mountStrip({ ...nflGame, yardLine: 50, fieldPosition: 'PHI 50' });
		cy.get('.ff-field').should($svg => {
			const marks = [...$svg[0].querySelectorAll('*')];
			const logo = marks.indexOf($svg[0].querySelector('.ff-logo')!);
			expect(logo, 'under the ball').to.be.lessThan(marks.indexOf($svg[0].querySelector('.ff-marker')!));
			expect(logo, 'under the line to gain').to.be.lessThan(marks.indexOf($svg[0].querySelector('.ff-first-down')!));
			expect(logo, 'over the yard lines').to.be.greaterThan(marks.indexOf($svg[0].querySelector('.ff-yard-line')!));
		});
	});

	it('leaves out a crest the API never sent, on the 50 and in the end zone alike', () => {
		mountStrip({ ...nflGame, homeTeam: { ...nflGame.homeTeam, logo: undefined } });
		cy.get('.ff-field').should('exist');
		cy.get('.ff-logo').should('not.exist');
		cy.get('.ff-endzone-home .crest').should('not.exist');
		cy.get('.ff-endzone-home .ff-endzone-name').should('have.text', 'Eagles');
		cy.get('.ff-endzone-away .crest').should('exist');
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
