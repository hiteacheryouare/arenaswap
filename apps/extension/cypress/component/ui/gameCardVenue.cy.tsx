import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const popupWidth = 320;

const liveGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nfl',
	sportType: 'football',
	period: 3,
	clockSeconds: 421,
	homeTeam: { id: 'h', name: 'Los Angeles Rams', abbreviation: 'LAR', score: 24 },
	awayTeam: { id: 'a', name: 'Seattle Seahawks', abbreviation: 'SEA', score: 21 },
	venueName: 'SoFi Stadium',
	venueLocation: 'Inglewood, California',
	broadcasts: ['CBS', 'Paramount+', 'Westwood One'],
	odds: { details: 'LAR -3.5', overUnder: 47.5, provider: { name: 'ESPN BET' } },
};

const result: PowerScoreResult = {
	gameId: 'g1', total: 42, closeness: 10, lateGame: 8, momentum: 6,
	leadChanges: 4, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0,
	reason: 'Close game',
};

const cardProps = {
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: true },
};

const mountLive = (game: Game) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${popupWidth}px` }}>
			<LiveGameCard {...cardProps} game={game} excitementResult={result} />
		</div>,
	);
	cy.document().its('fonts.ready');
};

const mountPreGame = (game: Game) => {
	cy.viewport(popupWidth, 600);
	cy.mount(
		<div style={{ width: `${popupWidth}px` }}>
			<PreGameCard
				{...cardProps}
				excitementResult={undefined}
				game={{ ...game, status: 'pre', startTime: '2026-10-05T00:00:00.000Z' }}
			/>
		</div>,
	);
	cy.document().its('fonts.ready');
};

describe('card venue line', () => {
	const mounts: [string, (game: Game) => void][] = [
		['live card', mountLive],
		['pre-game card', mountPreGame],
	];

	mounts.forEach(([label, mount]) => {
		it(`names the building and nothing else (${label})`, () => {
			mount(liveGame);
			cy.get('.game-meta-venue').should('have.text', 'SoFi Stadium');
			cy.get('.game-meta').should('not.contain.text', 'Inglewood');
		});

		it(`leaves the venue at the weight of the meta around it (${label})`, () => {
			mount(liveGame);
			cy.get('.game-meta-venue').should($venue => {
				expect(Number(getComputedStyle($venue[0]).fontWeight), 'venue weight').to.equal(400);
			});
		});
	});

	it('keeps the longest venue name inside the popup', () => {
		mountLive({ ...liveGame, venueName: 'Mercedes-Benz Superdome' });

		cy.get('.game-card').should($card => {
			expect($card[0].getBoundingClientRect().width, 'card width').to.equal(popupWidth);
		});

		cy.get('.game-meta-venue').should($venue => {
			const el = $venue[0];
			expect(el.scrollWidth, 'venue line does not overflow its column').to.be.at.most(el.clientWidth);
			expect(el.getBoundingClientRect().height, 'venue occupies a single line').to.be.lessThan(16);
		});
	});
});

describe('neutral-site venue line', () => {
	const madrid: Game = { ...liveGame, venueName: 'Santiago Bernabéu', venueLocation: 'Madrid, Spain', neutralSite: true };

	it('adds the city when the game is at neither team\'s stadium', () => {
		mountPreGame(madrid);
		cy.get('.game-meta-venue').should('have.text', 'Santiago Bernabéu · Madrid, Spain');
	});

	it('keeps a long venue and its city inside the card', () => {
		mountLive({ ...madrid, venueName: 'Tottenham Hotspur Stadium', venueLocation: 'London, England' });
		cy.get('.game-meta-venue').should($venue => {
			const el = $venue[0];
			expect(el.scrollWidth, 'venue line does not overflow its column').to.be.at.most(el.clientWidth);
		});
	});
});

describe('odds attribution', () => {
	it('rides the end of the odds line rather than taking one of its own', () => {
		mountLive(liveGame);
		cy.get('.game-meta-odds').should('contain.text', 'LAR -3.5');
		cy.get('.game-meta-odds').find('.game-meta-attribution').should('contain.text', 'ESPN BET');
	});

	it('advertises itself as hoverable', () => {
		mountLive(liveGame);
		cy.get('.game-meta-attribution').should($attribution => {
			const style = getComputedStyle($attribution[0]);
			expect(style.cursor, 'help cursor').to.equal('help');
			expect(style.borderBottomStyle, 'dotted rule under it').to.equal('dotted');
		});
	});

	it('opens a real tooltip on hover, not just a native title', () => {
		mountLive(liveGame);
		// Bootstrap moves the title out of the way once it has taken ownership of the element.
		cy.get('.game-meta-attribution').should('have.attr', 'data-bs-original-title').and('match', /Odds provided by/);
		// Bootstrap's EventHandler remaps mouseenter onto mouseover, so that is the event the
		// listener is actually bound to.
		cy.get('.game-meta-attribution').trigger('mouseover');
		cy.get('.tooltip.show').should('be.visible').and('contain.text', 'Odds provided by').and('contain.text', 'ESPN BET');
		cy.get('.game-meta-attribution').trigger('mouseout');
	});

	it('opens on keyboard focus too', () => {
		mountLive(liveGame);
		cy.get('.game-meta-attribution').should('have.attr', 'data-bs-original-title');
		cy.get('.game-meta-attribution').should('match', 'button').focus();
		cy.get('.tooltip.show').should('be.visible');
	});

	it('leaves the meta column at three lines on a live card', () => {
		mountLive(liveGame);
		cy.get('.game-meta').should(([meta]: JQuery<HTMLElement>) => {
			expect(meta.children.length, 'venue, broadcasts and odds').to.equal(3);
		});
	});

	it('does not open the detail view when clicked', () => {
		const onOpenGameDetail = cy.stub().as('openDetail');
		cy.viewport(popupWidth, 600);
		cy.mount(
			<div style={{ width: `${popupWidth}px` }}>
				<LiveGameCard {...cardProps} onOpenGameDetail={onOpenGameDetail} game={liveGame} excitementResult={result} />
			</div>,
		);
		cy.get('.game-meta-attribution').click();
		cy.get('@openDetail').should('not.have.been.called');
	});

	it('drops out entirely when betting display is off', () => {
		cy.viewport(popupWidth, 600);
		cy.mount(
			<div style={{ width: `${popupWidth}px` }}>
				<LiveGameCard {...cardProps} bettingPrefs={{ bettingEnabled: false }} game={liveGame} excitementResult={result} />
			</div>,
		);
		cy.get('.game-meta-attribution').should('not.exist');
		cy.get('.game-meta-odds').should('not.exist');
	});
});
