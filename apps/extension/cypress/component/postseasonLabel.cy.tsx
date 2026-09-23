import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

// The shipping popup width, so every measurement below is taken against the box the label will
// really render in rather than against a viewport that flatters it.
const popupWidth = 320;

const baseGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 4,
	clockSeconds: 72,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 98 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 98 },
};

const baseResult: PowerScoreResult = {
	gameId: 'g1',
	total: 94,
	closeness: 34,
	lateGame: 31,
	momentum: 18,
	leadChanges: 9,
	comeback: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'Close game',
};

const defaultProps = {
	game: baseGame,
	excitementResult: baseResult,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

const mountLive = (game: Game) =>
	cy.mount(
		<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
			<LiveGameCard {...defaultProps} game={game} />
		</div>,
	);

describe('the postseason label on a card', () => {
	it('shares the status row with LIVE rather than taking a line of its own', () => {
		mountLive({ ...baseGame, isPostseason: true, postseasonRound: 0, postseasonLabel: 'NBA Finals · Game 7' });
		cy.get('.game-postseason-label').should('have.text', 'NBA Finals · Game 7');
		// Same line: the two boxes share a top edge to within a pixel of rounding.
		cy.get('.live-status-label').then($status => {
			cy.get('.game-postseason-label').then($label => {
				const status = $status[0]!.getBoundingClientRect();
				const label = $label[0]!.getBoundingClientRect();
				expect(Math.abs(status.top - label.top)).to.be.lessThan(2);
				expect(label.left).to.be.greaterThan(status.right);
			});
		});
	});

	it('costs the card no height at all', () => {
		let withoutLabel = 0;
		mountLive(baseGame);
		cy.get('.game-card').then($card => { withoutLabel = $card[0]!.getBoundingClientRect().height; });
		cy.then(() => {
			mountLive({ ...baseGame, isPostseason: true, postseasonRound: 0, postseasonLabel: 'NBA Finals · Game 7' });
			cy.get('.game-card').then($card => {
				expect($card[0]!.getBoundingClientRect().height).to.equal(withoutLabel);
			});
		});
	});

	// `text-transform` inherits, so the rule on the label is a guard against an ancestor turning
	// the popup uppercase rather than decoration. Mounted inside exactly that ancestor, because
	// without one the rule is inert and the assertion passes whether it exists or not — which is
	// what a first pass at this test did.
	it('keeps ESPN\'s own casing even inside an uppercased ancestor', () => {
		cy.mount(
			<div className='text-uppercase' style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
				<LiveGameCard
					{...defaultProps}
					game={{ ...baseGame, league: 'ncaaf', isPostseason: true, postseasonLabel: 'Cheez-It Citrus Bowl' }}
				/>
			</div>,
		);
		cy.get('.game-postseason-label').should('have.css', 'text-transform', 'none');
		cy.get('.live-status-label').should('have.css', 'text-transform', 'uppercase');
		// innerText is the text as painted, so this is what actually catches a shouted sponsor.
		cy.get('.game-postseason-label').then($label => {
			expect($label[0]!.innerText).to.equal('Cheez-It Citrus Bowl');
		});
	});

	// Asserted directly rather than inferred from a width comparison. While the row still wraps,
	// an ellipsis rule is inert and every geometric assertion keeps passing — so a future change
	// could add one and only be caught once something else also removed the wrap.
	it('applies no truncation to the label at all', () => {
		mountLive({ ...baseGame, isPostseason: true, postseasonLabel: 'NBA Finals · Game 7' });
		cy.get('.game-postseason-label')
			.should('have.css', 'text-overflow', 'clip')
			.and('have.css', 'overflow-x', 'visible')
			.and('have.css', 'overflow-y', 'visible');
	});

	// Muted grey rather than the accent the breakdown's postseason row uses: two coloured items on
	// one row makes the reader choose between them, and LIVE should win that outright.
	it('stays muted so the LIVE marker is the only loud thing on the row', () => {
		mountLive({ ...baseGame, isPostseason: true, postseasonLabel: 'NBA Finals · Game 7' });
		cy.get('.game-postseason-label').should('have.css', 'color', 'rgb(108, 117, 125)');
		cy.get('.live-status-label').then($live => {
			const live = getComputedStyle($live[0]!).color;
			cy.get('.game-postseason-label').should($label => {
				expect(getComputedStyle($label[0]!).color).to.not.equal(live);
			});
		});
	});

	it('renders nothing for a game with no round to name', () => {
		mountLive(baseGame);
		cy.get('.game-postseason-label').should('not.exist');
		cy.get('.game-card-status-row').should('exist');
	});

	// Two of the 389 real ESPN round names are too wide to share the row. They must wrap to a line
	// of their own rather than being cut, because cutting one loses a sponsor mid-word.
	it('wraps a too-wide label onto its own line instead of truncating it', () => {
		const longest = 'Quarterfinal · Rose Bowl Presented by Prudential';
		mountLive({ ...baseGame, league: 'ncaaf', isPostseason: true, postseasonRound: 2, postseasonLabel: longest });
		cy.get('.game-postseason-label').should('have.text', longest);
		cy.get('.live-status-label').then($status => {
			cy.get('.game-postseason-label').then($label => {
				const status = $status[0]!.getBoundingClientRect();
				const el = $label[0]!;
				const label = el.getBoundingClientRect();
				// It dropped to a second line...
				expect(label.top).to.be.greaterThan(status.bottom - 1);
				// ...and once there it is whole: one line box, nothing clipped, no ellipsis.
				expect(el.getClientRects()).to.have.length(1);
				expect(el.scrollWidth).to.be.at.most(Math.ceil(label.width));
				expect(el.innerText).to.equal(longest);
			});
		});
	});

	it('never overflows the card, at either width', () => {
		for (const label of ['NBA Finals · Game 7', 'Quarterfinal · Rose Bowl Presented by Prudential']) {
			mountLive({ ...baseGame, isPostseason: true, postseasonLabel: label });
			cy.get('.game-card').then($card => {
				const card = $card[0]!.getBoundingClientRect();
				cy.get('.game-postseason-label').then($label => {
					const el = $label[0]!.getBoundingClientRect();
					expect(el.right).to.be.at.most(card.right + 0.5);
					expect(el.left).to.be.at.least(card.left - 0.5);
				});
			});
		}
	});

	it('names a non-playoff bowl even though the game scores nothing', () => {
		mountLive({ ...baseGame, league: 'ncaaf', isPostseason: true, postseasonRound: undefined, postseasonLabel: "Bush's Boca Raton Bowl" });
		cy.get('.game-postseason-label').should('have.text', "Bush's Boca Raton Bowl");
	});
});

describe('the postseason label on the other two card states', () => {
	it('shares the finished card\'s status row', () => {
		cy.mount(
			<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
				<FinalGameCard
					{...defaultProps}
					excitementResult={undefined}
					game={{ ...baseGame, status: 'post', isPostseason: true, postseasonRound: 1, postseasonLabel: 'ALCS · Game 6' }}
				/>
			</div>,
		);
		cy.get('.final-status-label').then($status => {
			cy.get('.game-postseason-label').then($label => {
				expect(Math.abs($status[0]!.getBoundingClientRect().top - $label[0]!.getBoundingClientRect().top)).to.be.lessThan(2);
			});
		});
	});

	// A scheduled card has no status row of its own, so the label brings one — and only when
	// there is something to put in it.
	it('brings its own row to a scheduled card, and only when there is a round', () => {
		const scheduled: Game = { ...baseGame, status: 'pre', startTime: '2026-10-28T23:08Z' };
		cy.mount(
			<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
				<PreGameCard {...defaultProps} excitementResult={undefined} game={scheduled} />
			</div>,
		);
		cy.get('.game-card-status-row').should('not.exist');

		cy.then(() => {
			cy.mount(
				<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
					<PreGameCard
						{...defaultProps}
						excitementResult={undefined}
						game={{ ...scheduled, isPostseason: true, postseasonRound: 0, postseasonLabel: 'World Series · Game 7' }}
					/>
				</div>,
			);
			cy.get('.game-card-status-row').should('exist');
			cy.get('.game-postseason-label').should('have.text', 'World Series · Game 7');
		});
	});
});
