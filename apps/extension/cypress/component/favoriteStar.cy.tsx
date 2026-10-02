import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game } from '@arenaswap/core/types';

const game = (status: Game['status']): Game => ({
	id: 'g1',
	status,
	league: 'nba',
	sportType: 'basketball',
	period: status === 'post' ? 4 : 2,
	clockSeconds: 300,
	homeTeam: { id: 'h', name: 'Boston Celtics', abbreviation: 'BOS', score: 50, color: '#007A33' },
	awayTeam: { id: 'a', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 48, color: '#006BB6' },
});

const mount = (Card: typeof LiveGameCard, status: Game['status'], onToggle = () => {}) => {
	cy.viewport(320, 400);
	cy.mount(
		<div style={{ width: '320px' }}>
			<Card
				game={game(status)}
				excitementResult={undefined}
				favoriteTeamIds={new Set()}
				onToggleFavoriteTeam={onToggle}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
			/>
		</div>,
	);
	cy.document().its('fonts.ready');
};

// The star glyph is 12px across, which is a hard target to land on a moving list.
describe('favorite star target', () => {
	for (const [label, Card, status] of [['live', LiveGameCard, 'in'], ['final', FinalGameCard, 'post']] as const) {
		it(`answers a click 10px off the glyph on a ${label} card`, () => {
			const onToggle = cy.stub().as('toggle');
			mount(Card as typeof LiveGameCard, status, onToggle);
			cy.get('[data-team-star]').first().then($star => {
				const box = $star[0]!.getBoundingClientRect();
				const x = box.left + (box.width / 2) + 10;
				const y = box.top + (box.height / 2);
				expect(document.elementFromPoint(x, y)?.closest('[data-team-star]')).to.equal($star[0]);
				cy.wrap($star).click((box.width / 2) + 10, box.height / 2);
			});
			cy.get('@toggle').should('have.been.calledOnce');
		});
	}

	it('keeps the card layout it had before the larger target', () => {
		mount(LiveGameCard, 'in');
		cy.get('[data-team-star]').first().should($star => {
			const box = $star[0]!.getBoundingClientRect();
			expect(box.height).to.be.lessThan(16);
		});
	});

	it('eases its colour and opacity rather than snapping', () => {
		mount(FinalGameCard, 'post');
		cy.get('[data-team-star]').first().should($star => {
			const style = getComputedStyle($star[0]!);
			expect(style.transitionProperty).to.contain('color');
			expect(style.transitionProperty).to.contain('opacity');
		});
	});
});
