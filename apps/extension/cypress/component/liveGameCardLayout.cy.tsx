// Layout-only, which is why this spec loads the real stylesheets; the sibling liveGameCard spec
// asserts on content and mounts unstyled.
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
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
