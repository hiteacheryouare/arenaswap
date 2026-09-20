// Layout-only, which is why this spec loads the real stylesheets; the sibling liveGameCard spec
// asserts on content and mounts unstyled.
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const popupWidth = 320;

const nflGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nfl',
	sportType: 'football',
	period: 3,
	clockSeconds: 421,
	homeTeam: { id: 'h', name: 'Arizona Cardinals', abbreviation: 'ARI', score: 24 },
	awayTeam: { id: 'a', name: 'Carolina Panthers', abbreviation: 'CAR', score: 21 },
	downDistance: '2nd & 11',
	fieldPosition: 'ARI 34',
};

const result: PowerScoreResult = {
	gameId: 'g1', total: 42, closeness: 10, lateGame: 8, momentum: 6,
	leadChanges: 4, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0,
	stalled: false, reason: 'Close game',
};

const defaultProps = {
	excitementResult: result,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

const mountAtPopupWidth = (game: Game) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${popupWidth}px` }}>
			<LiveGameCard {...defaultProps} game={game} />
		</div>,
	);
	// Lekton is monospace at 0.5em per character, so every width here depends on the webfont
	// having landed — the fallback reports different numbers.
	cy.document().its('fonts.ready');
};

// The field position takes the line from 8 characters to as many as 20, so it is measured
// against the real popup rather than assumed to fit inside the 128.75px score row.
describe('liveGameCard down & distance width', () => {
	const cases: [string, string, string][] = [
		['typical', '2nd & 11', 'ARI 34'],
		['goal to go', '3rd & Goal', 'ARI 4'],
		['longest abbreviation and yard line', '3rd & Goal', 'WSH 50'],
		['widest ordinary down', '1st & 10', 'WSH 50'],
	];

	cases.forEach(([label, downDistance, fieldPosition]) => {
		it(`fits the popup without widening the card (${label})`, () => {
			mountAtPopupWidth({ ...nflGame, downDistance, fieldPosition });

			cy.get('.game-card').should($card => {
				expect($card[0].getBoundingClientRect().width, 'card width').to.equal(popupWidth);
			});

			cy.get('.game-card-center').should($center => {
				const el = $center[0];
				expect(el.scrollWidth, 'centre column does not overflow').to.be.at.most(el.clientWidth);

				const lines = el.querySelectorAll<HTMLElement>('.game-period');
				const line = lines[lines.length - 1]!;
				const scoreRow = el.querySelector<HTMLElement>('.game-score-row')!;
				expect(line.textContent).to.equal(`${downDistance} at ${fieldPosition}`);
				expect(
					line.getBoundingClientRect().width,
					'the line stays within the score row above it, so it never sets the column width',
				).to.be.at.most(scoreRow.getBoundingClientRect().width);
			});
		});
	});
});

// A rank widens the team column, which is the one column on the card with no slack: it is sized by
// the 64px crest and capped by what the centre column leaves over. The widest pair the real slate
// produces is a two-digit rank against a four-letter tricode on both sides — "#15 TENN" — so that
// is what gets measured rather than the typical "#2 ALA".
describe('liveGameCard team rank width', () => {
	const rankedGame: Game = {
		...nflGame,
		league: 'ncaaf',
		homeTeam: { id: 'h', name: 'Tennessee Volunteers', abbreviation: 'TENN', score: 24, rank: 15 },
		awayTeam: { id: 'a', name: 'Michigan Wolverines', abbreviation: 'MICH', score: 21, rank: 19 },
	};

	it('keeps the widest ranked matchup inside the card', () => {
		mountAtPopupWidth(rankedGame);

		cy.get('.game-card').should($card => {
			expect($card[0].getBoundingClientRect().width, 'card width').to.equal(popupWidth);
		});

		cy.get('.game-card-matchup').should($row => {
			const el = $row[0];
			expect(el.scrollWidth, 'matchup row does not overflow').to.be.at.most(el.clientWidth);
		});

		cy.get('.team-abbreviation').should($labels => {
			expect($labels).to.have.length(2);
			$labels.each((_, el) => {
				expect(el.scrollWidth, 'the tricode and its rank are not clipped').to.be.at.most(el.clientWidth);
			});
		});

		cy.get('.team-rank').should('have.length', 2).first().should('have.text', '#19');
	});

	it('leaves the column untouched when neither side is ranked', () => {
		mountAtPopupWidth(nflGame);
		cy.get('.team-rank').should('not.exist');
	});
});

// The dots are a fourth row in a column that had three, so the question is whether the star below
// them is still on the card.
describe('liveGameCard timeout dots', () => {
	const withTimeouts: Game = {
		...nflGame,
		homeTeam: { ...nflGame.homeTeam, timeouts: 2 },
		awayTeam: { ...nflGame.awayTeam, timeouts: 0 },
	};

	it('draws the allotment without pushing the favourite star out of the card', () => {
		mountAtPopupWidth(withTimeouts);

		cy.get('.timeout-dots').should('have.length', 2);
		cy.get('.timeout-dots').first().find('.timeout-dot').should('have.length', 3);
		cy.get('.timeout-dots').first().find('.timeout-dot:not(.is-empty)').should('have.length', 0);
		cy.get('.timeout-dots').last().find('.timeout-dot:not(.is-empty)').should('have.length', 2);

		cy.get('.game-card').then($card => {
			const card = $card[0].getBoundingClientRect();
			cy.get('[data-team-star="true"]').each($star => {
				const star = $star[0].getBoundingClientRect();
				expect(star.bottom, 'star stays inside the card').to.be.at.most(card.bottom);
			});
		});
	});

	it('draws nothing for a sport that sends no timeouts', () => {
		mountAtPopupWidth(nflGame);
		cy.get('.timeout-dots').should('not.exist');
	});
});

// These fixture teams carry no logo, which is the case a real card hits whenever ESPN omits one.
describe('liveGameCard crest placeholder', () => {
	it('fills the logo slot rather than leaving a hole in the column', () => {
		mountAtPopupWidth(nflGame);

		cy.get('.team-crest').should('have.length', 2).each($crest => {
			expect($crest.attr('data-crest-state')).to.equal('missing');
			const box = $crest[0].getBoundingClientRect();
			expect(box.width, 'crest width').to.equal(64);
			expect(box.height, 'crest height').to.equal(64);

			const fallback = $crest[0].querySelector<HTMLElement>('.crest-fallback')!;
			expect(fallback.getBoundingClientRect()).to.deep.include({ width: 64, height: 64 });
		});
		cy.get('.team-crest').first().should('have.text', 'CAR');
	});
});
