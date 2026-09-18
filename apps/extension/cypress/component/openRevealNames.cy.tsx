import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import { revealOpenBeatMs, revealFullRate, type revealMode } from '../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

// A light mark on navy and a dark mark on gold, so both fields take their team's colour rather than
// the crest component's plate — and gold is the case that decides whether the naming is legible by
// luck or by construction.
const svg = (body: string) => `data:image/svg+xml;base64,${btoa(
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${body}</svg>`,
)}`;
const lightMark = svg(`<circle cx='32' cy='32' r='25' fill='#F2F4F7'/><path d='M32 12 L32 52' stroke='#41B6E6' stroke-width='6'/>`);
const darkMark = svg(`<circle cx='32' cy='32' r='26' fill='#111111'/><circle cx='32' cy='32' r='13' fill='none' stroke='#FFB81C' stroke-width='3'/>`);

const game = (awayName: string, homeName: string) => ({
	id: 'g1',
	status: 'in',
	league: 'mlb',
	sportType: 'baseball',
	period: 5,
	topOfInning: true,
	awayTeam: { id: 'a', name: awayName, abbreviation: 'AWY', score: 3, color: '#0C2340', logo: lightMark },
	homeTeam: { id: 'h', name: homeName, abbreviation: 'HOM', score: 1, color: '#FFB81C', logo: darkMark },
}) as unknown as Game;

const Harness = ({ mode = 'full', awayName = 'Miami Marlins', homeName = 'Washington Commanders' }: {
	mode?: revealMode;
	awayName?: string;
	homeName?: string;
}) => {
	const subject = game(awayName, homeName);
	const shared = {
		game: subject,
		excitementResult: undefined,
		favoriteTeamIds: new Set<string>(),
		onToggleFavoriteTeam: () => {},
		onOpenGameDetail: () => {},
		bettingPrefs: { bettingEnabled: false },
	};
	return (
		<div className='popup-container d-flex flex-column'>
			<div className='mt-2'>
				<div>
					<GameCardReveal game={subject} mode={mode} index={0} skipping={false}>
						<LiveGameCard {...shared} />
					</GameCardReveal>
				</div>
			</div>
		</div>
	);
};

const scrubTo = (ms: number) => {
	cy.get('.game-card-reveal').should('exist');
	return cy.document().then(doc => {
		doc.getAnimations().forEach(animation => {
			animation.pause();
			animation.currentTime = ms;
		});
	});
};

const openMs = (ms: number) => ms * revealFullRate;
const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());
const awaitCrests = () => cy.get('.game-card-reveal-opening-logo[data-crest-state="loaded"]')
	.should('have.length', 2);

// The run of glyphs rather than the box they sit in, which is the half of the card and says nothing
// about where the type actually reaches.
const inkOf = (selector: string) => cy.get(selector).then($el => {
	const range = $el[0].ownerDocument.createRange();
	range.selectNodeContents($el[0]);
	return range.getBoundingClientRect();
});

describe('the clubs named over the opening beat', () => {
	beforeEach(() => cy.viewport(320, 560));

	// ESPN's `displayName`, printed whole. Not assembled and not abbreviated: the poster after this
	// carries the tricodes, and this beat is the one place the graphic says who is playing.
	it('names both clubs in full', () => {
		cy.mount(<Harness />);
		cy.get('.game-card-reveal-opening-name.is-away .game-card-reveal-opening-name-text')
			.should('have.text', 'Miami Marlins');
		cy.get('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-text')
			.should('have.text', 'Washington Commanders');
	});

	// Only on the first open of the day, like the rest of this beat. Every later open is the poster on
	// its own and has to stay exactly the graphic it has always been, which is the invariant three
	// passes on this animation have now been measured against.
	it('names nobody on the versions that have no opening beat', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-opening-name').should('have.length', 2);

		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal').should('exist');
		cy.get('.game-card-reveal-opening-name').should('not.exist');

		cy.mount(<Harness mode='none' />);
		cy.get('.game-card').should('exist');
		cy.get('.game-card-reveal-opening-name').should('not.exist');
	});

	// The names sit on whatever colour the field came out as — the team's own on most cards and the
	// crest component's near-white plate on the rest — and nothing here gets to know which. The scrim
	// is what makes white read on both, so it is the thing worth pinning rather than the ink.
	it('lays a scrim under the type rather than trusting the colour behind it', () => {
		cy.mount(<Harness />);
		cy.get('.game-card-reveal-opening-name').should($names => {
			[...$names].forEach(name => {
				const image = getComputedStyle(name).backgroundImage;
				expect(image, 'a wash under the type').to.contain('linear-gradient');
				expect(image, 'darkening towards the bottom').to.contain('rgba(0, 0, 0, 0)');
			});
		});
		cy.get('.game-card-reveal-opening-name-text').first()
			.should('have.css', 'color', 'rgb(255, 255, 255)');
	});

	// A long club name is cut by the seam rather than crossing it, and the padding is what keeps it
	// from actually being cut. The pair that decides this is the longest in the product: thirteen
	// characters in one word, against a half-card that is about 119px wide at the bottom.
	it('keeps the longest names inside their own half of the card', () => {
		cy.mount(<Harness awayName='Portland Trail Blazers' homeName='Massachusetts Minutemen' />);
		awaitCrests();
		scrubTo(openMs(revealOpenBeatMs));
		rectOf('.game-card').then(card => {
			inkOf('.game-card-reveal-opening-name.is-away .game-card-reveal-opening-name-text').then(away => {
				inkOf('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-text').then(home => {
					// Neither reaches the other, so neither has crossed the seam between them.
					expect(away.right, 'away clear of home').to.be.lessThan(home.left);
					// And both are on the card, which is what the shared seam clip is there to guarantee.
					expect(away.left).to.be.at.least(card.left);
					expect(home.right).to.be.at.most(card.right);
					expect(away.bottom).to.be.at.most(card.bottom);
					expect(home.bottom).to.be.at.most(card.bottom);
				});
			});
		});
	});

	// After the crests rather than with them. A graphic where everything arrives at once reads as one
	// lump, and this is the offset that stops it — 18% of the beat's window before it starts moving.
	it('brings the names in behind the crests', () => {
		cy.mount(<Harness />);
		awaitCrests();
		scrubTo(openMs(revealOpenBeatMs * 0.1));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');
		scrubTo(openMs(revealOpenBeatMs));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '1');
	});
});
