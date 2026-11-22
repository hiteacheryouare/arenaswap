import FootballFieldStrip from '@arenaswap/ui/src/components/footballFieldStrip';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import { numberRowsY, stripHeight } from '@arenaswap/ui/src/components/footballField';
import type { Game, PowerScoreResult, TeamMonoMarks } from '@arenaswap/core/types';

const popupWidth = 320;

const logoUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%23C0C0C0"/></svg>';
const invisibleOnTurfUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%2322683B"/></svg>';
const whiteMarkUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="%23ffffff"/></svg>';

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
	reason: 'Close game',
};

const stripWidth = 289;

const collegeGame: Game = {
	...nflGame,
	league: 'ncaaf',
	conference: { id: '5', shortName: 'Big Ten', crestSlug: 'big_ten' },
};

const stubConferenceCrest = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#888"/></svg>';

const serveConferenceCrests = () => {
	cy.intercept('GET', 'https://a.espncdn.com/i/teamlogos/ncaa_conf/**', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' }, body: stubConferenceCrest });
};

const mountStrip = (game: Game, monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null }) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${stripWidth}px`, background: '#fff' }}>
			<FootballFieldStrip game={game} monoMarks={monoMarks} />
		</div>,
	);
	cy.document().its('fonts.ready');
};

const yardsFromLeftEdge = (rect: DOMRect, fieldRect: DOMRect): number => (
	((rect.left + rect.width / 2 - fieldRect.left) / fieldRect.width) * 120
);

describe('football field', () => {
	it('fills its container at the proportions of a squashed field', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').should($svg => {
			const rect = $svg[0].getBoundingClientRect();
			expect(rect.width, 'fills its container').to.be.closeTo(stripWidth, 1);
			expect(rect.width / rect.height, 'aspect ratio').to.be.closeTo(3.75, 0.05);
			expect(rect.height, 'height in a 560px popup').to.be.closeTo(77, 2);
		});
	});

	it('puts the ball on the yard line ESPN named', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
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

	it('letters the nickname in caps without shouting it into the DOM', () => {
		mountStrip(nflGame);
		cy.get('.ff-endzone-home .ff-endzone-name')
			.should('have.text', 'Eagles')
			.and('have.css', 'text-transform', 'uppercase');
	});

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
			expect(yardsAt(drive.left), 'near end on the ball').to.be.closeTo(80, 0.5);
			expect(yardsAt(drive.right), 'far end on the drive start').to.be.closeTo(85, 0.5);
		});
	});

	it('runs the drive bar along the ball\'s line, inside the hash rows', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const drive = $svg[0].querySelector('.ff-drive')!.getBoundingClientRect();
			const ball = $svg[0].querySelector('.ff-ball')!.getBoundingClientRect();
			expect(drive.top + drive.height / 2, 'shares the ball\'s centre line')
				.to.be.closeTo(ball.top + ball.height / 2, 1.5);

			const hashes = $svg[0].querySelector('.ff-hashes')!.getBoundingClientRect();
			expect(drive.top).to.be.greaterThan(hashes.top);
			expect(drive.bottom).to.be.lessThan(hashes.bottom);
		});
	});

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
			expect(yardsFromLeftEdge(line, fieldRect)).to.be.closeTo(75, 0.3);
			expect(line.left, 'ahead of the ball').to.be.lessThan(ball.left);
		});
	});

	it('keeps the line of scrimmage blue rather than taking the offense\'s colour', () => {
		mountStrip(nflGame);
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const scrimmage = $svg[0].querySelector('.ff-scrimmage')!;
			expect(getComputedStyle(scrimmage).fill).to.equal('rgb(46, 134, 255)');
			expect(yardsFromLeftEdge(scrimmage.getBoundingClientRect(), fieldRect), 'under the ball').to.be.closeTo(80, 0.4);
		});
	});

	it('recolours the goal line on goal to go', () => {
		mountStrip({ ...nflGame, downDistance: '3rd & Goal', fieldPosition: 'DAL 5', distance: 5, yardLine: 95 });
		cy.get('.ff-field').then($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const line = $svg[0].querySelector('.ff-first-down')!.getBoundingClientRect();
			expect(yardsFromLeftEdge(line, fieldRect), 'sits on the away goal line').to.be.closeTo(10, 0.3);
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
			expect((logo.width / fieldRect.width) * 120).to.be.at.most(13);

			const across = (row: number) => fieldRect.top + (row / stripHeight) * fieldRect.height;
			expect(logo.top, 'clear of the top row').to.be.at.least(across(numberRowsY[0]));
			expect(logo.bottom, 'clear of the bottom row').to.be.at.most(across(numberRowsY[1]));
		});
	});

	it('takes the white mark for a midfield crest the grass swallows', () => {
		mountStrip(
			{ ...nflGame, homeTeam: { ...nflGame.homeTeam, logo: invisibleOnTurfUri } },
			{ home: { white: whiteMarkUri } },
		);
		cy.get('.ff-logo .crest > img').should('have.attr', 'src', whiteMarkUri);
	});

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

	it('paints the conference crest on both 25s, high on one half and low on the other', () => {
		serveConferenceCrests();
		mountStrip(collegeGame);
		cy.get('.ff-field').should($svg => {
			const fieldRect = $svg[0].getBoundingClientRect();
			const crests = [...$svg[0].querySelectorAll('.ff-conference')].map(crest => crest.getBoundingClientRect());
			expect(crests).to.have.length(2);
			expect(yardsFromLeftEdge(crests[0]!, fieldRect), 'away 25').to.be.closeTo(35, 0.3);
			expect(yardsFromLeftEdge(crests[1]!, fieldRect), 'home 25').to.be.closeTo(85, 0.3);
			const centreY = (rect: DOMRect) => rect.top + rect.height / 2 - fieldRect.top;
			expect(centreY(crests[0]!), 'away crest above the ball\'s line').to.be.lessThan(fieldRect.height / 2);
			expect(centreY(crests[0]!) + centreY(crests[1]!), 'mirrored about the middle').to.be.closeTo(fieldRect.height, 1);
		});
	});

	it('keeps the conference crests under the ball and the two live lines', () => {
		serveConferenceCrests();
		mountStrip(collegeGame);
		cy.get('.ff-field').should($svg => {
			const marks = [...$svg[0].querySelectorAll('*')];
			const crest = marks.indexOf($svg[0].querySelector('.ff-conference')!);
			expect(crest, 'under the ball').to.be.lessThan(marks.indexOf($svg[0].querySelector('.ff-marker')!));
			expect(crest, 'under the line to gain').to.be.lessThan(marks.indexOf($svg[0].querySelector('.ff-first-down')!));
		});
	});

	it('leaves a conference crest drawn for dark ground bare on the turf', () => {
		serveConferenceCrests();
		mountStrip(collegeGame);
		cy.get('.ff-conference-shell').should('have.length', 2).and('not.have.class', 'is-panel');
		cy.get('.ff-conference .crest > img').should('have.attr', 'src').and('match', /ncaa_conf\/500-dark\/5\.png$/);
	});

	it('puts a crest drawn only for light ground on a white panel', () => {
		serveConferenceCrests();
		mountStrip({ ...collegeGame, conference: { id: '22', shortName: 'Ivy', crestSlug: 'ivy' } });
		cy.get('.ff-conference-shell').should('have.length', 2).and('have.class', 'is-panel');
		cy.get('.ff-conference .crest > img').should('have.attr', 'src').and('match', /ncaa_conf\/500\/22\.png$/);
	});

	it('moves to the light crest on a panel when the dark one will not load', () => {
		serveConferenceCrests();
		cy.intercept('GET', '**/ncaa_conf/500-dark/**', { statusCode: 404 });
		mountStrip({ ...collegeGame, conference: { id: '1', shortName: 'ACC', crestSlug: 'acc' } });
		cy.get('.ff-conference-shell').should('have.length', 2).and('have.class', 'is-panel');
		cy.get('.ff-conference .crest > img').should('have.attr', 'src').and('match', /ncaa_conf\/500\/acc\.png$/);
	});

	it('paints the conference on its own title game', () => {
		serveConferenceCrests();
		mountStrip({ ...collegeGame, postseasonLabel: 'Big Ten Championship' });
		cy.get('.ff-conference').should('have.length', 2);
	});

	it('paints no conference on a game that is not a conference game', () => {
		mountStrip({ ...collegeGame, conference: undefined });
		cy.get('.ff-field').should('exist');
		cy.get('.ff-conference').should('not.exist');
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
