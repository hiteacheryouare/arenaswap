import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

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
		cy.document().its('fonts.ready');
		cy.get('.game-card').then($card => { withoutLabel = $card[0]!.getBoundingClientRect().height; });
		cy.then(() => {
			mountLive({ ...baseGame, isPostseason: true, postseasonRound: 0, postseasonLabel: 'NBA Finals · Game 7' });
			cy.document().its('fonts.ready');
			cy.get('.game-card').then($card => {
				expect($card[0]!.getBoundingClientRect().height).to.equal(withoutLabel);
			});
		});
	});

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
		cy.get('.game-postseason-label').then($label => {
			expect($label[0]!.innerText).to.equal('Cheez-It Citrus Bowl');
		});
	});

	it('applies no truncation to the label at all', () => {
		mountLive({ ...baseGame, isPostseason: true, postseasonLabel: 'NBA Finals · Game 7' });
		cy.get('.game-postseason-label')
			.should('have.css', 'text-overflow', 'clip')
			.and('have.css', 'overflow-x', 'visible')
			.and('have.css', 'overflow-y', 'visible');
	});

	it('stays quieter than the LIVE marker beside it', () => {
		mountLive({ ...baseGame, isPostseason: true, postseasonLabel: 'NBA Finals · Game 7' });
		cy.get('.live-status-label').then($live => {
			const live = getComputedStyle($live[0]!);
			cy.get('.game-postseason-label').should($label => {
				const label = getComputedStyle($label[0]!);
				expect(Number(label.fontWeight)).to.be.lessThan(Number(live.fontWeight));
				expect(label.textTransform).to.equal('none');
				expect(live.textTransform).to.equal('uppercase');
			});
		});
	});

	it('renders nothing for a game with no round to name', () => {
		mountLive(baseGame);
		cy.get('.game-postseason-label').should('not.exist');
		cy.get('.game-card-status-row').should('exist');
	});

	it('wraps a too-wide label onto its own line instead of truncating it', () => {
		const longest = 'Quarterfinal · Rose Bowl Presented by Prudential';
		mountLive({ ...baseGame, league: 'ncaaf', isPostseason: true, postseasonRound: 2, postseasonLabel: longest });
		cy.get('.game-postseason-label').should('have.text', longest);
		cy.get('.live-status-label').then($status => {
			cy.get('.game-postseason-label').then($label => {
				const status = $status[0]!.getBoundingClientRect();
				const el = $label[0]!;
				const label = el.getBoundingClientRect();
				expect(label.top).to.be.greaterThan(status.bottom - 1);
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

describe('the preseason label', () => {
	const mountFinal = (game: Game) =>
		cy.mount(
			<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
				<FinalGameCard {...defaultProps} excitementResult={undefined} game={game} />
			</div>,
		);

	it('names a preseason game on the live card\'s status row', () => {
		mountLive({ ...baseGame, isPreseason: true });
		cy.get('.game-postseason-label').should('have.text', 'Preseason');
		cy.get('.live-status-label').then($live => {
			cy.get('.game-postseason-label').then($label => {
				expect(Math.abs($live[0]!.getBoundingClientRect().top - $label[0]!.getBoundingClientRect().top)).to.be.lessThan(2);
			});
		});
	});

	it('calls baseball\'s spring training by its name', () => {
		mountFinal({ ...baseGame, league: 'mlb', sportType: 'baseball', status: 'post', period: 9, isPreseason: true });
		cy.get('.game-postseason-label').should('have.text', 'Spring Training');
	});

	it('says nothing on a regular-season game', () => {
		mountFinal({ ...baseGame, status: 'post', isPreseason: false });
		cy.get('.game-postseason-label').should('not.exist');
	});

	it('brings its own row to a scheduled preseason card', () => {
		cy.mount(
			<div style={{ width: popupWidth, padding: '0.75rem', background: '#0d1117' }}>
				<PreGameCard {...defaultProps} excitementResult={undefined} game={{ ...baseGame, league: 'nhl', sportType: 'hockey', status: 'pre', startTime: '2026-10-04T23:00Z', isPreseason: true }} />
			</div>,
		);
		cy.get('.game-card-status-row').should('exist');
		cy.get('.game-postseason-label').should('have.text', 'Preseason');
	});
});
