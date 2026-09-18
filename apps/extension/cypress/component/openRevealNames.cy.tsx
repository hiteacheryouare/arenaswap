import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import { revealNameBeatMs, revealOpenBeatMs, revealFullRate, type revealMode } from '../../entrypoints/popup/cardReveal';
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

// Absolute, in the choreography's own units: the crests hold the field to `revealOpenBeatMs`, the
// naming has it from there, and the poster starts when the two of them are done.
const sceneMs = (ms: number) => ms * revealFullRate;
const crestScene = revealOpenBeatMs;
const nameScene = revealOpenBeatMs + revealNameBeatMs;
const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());

const fieldColour = () => cy.get('.game-card-reveal-opening-field.is-home')
	.then($field => getComputedStyle($field[0]).backgroundColor);
const awaitCrests = () => cy.get('.game-card-reveal-opening-logo[data-crest-state="loaded"]')
	.should('have.length', 2);

describe('the clubs named over the opening beat', () => {
	beforeEach(() => cy.viewport(320, 560));

	// ESPN's `displayName`, printed whole, a line per word. Not assembled and not abbreviated: the
	// poster after this carries the tricodes, and this beat is the one place the graphic says who is
	// playing.
	it('names both clubs in full', () => {
		cy.mount(<Harness />);
		cy.get('.game-card-reveal-opening-name.is-away .game-card-reveal-opening-name-edge')
			.then($lines => expect([...$lines].map(l => l.textContent).join(' ')).to.equal('Miami Marlins'));
		cy.get('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-edge')
			.then($lines => expect([...$lines].map(l => l.textContent).join(' ')).to.equal('Washington Commanders'));
	});

	// Only on the first open of the day, like the rest of this beat. Every later open is the poster on
	// its own and has to stay exactly the graphic it has always been, which is the invariant four
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

	// Set as big as the tricodes and in the same two copies, for the same reason: a stroke follows
	// every contour the font draws including the ones a filled glyph hides, so an outline has to be
	// the back copy showing around the front one rather than a stroke on live text.
	it('sets the names as outlined type, the way the tricodes are', () => {
		cy.mount(<Harness />);
		cy.get('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-edge').first()
			.should('have.css', 'color', 'rgb(255, 255, 255)')
			.and('have.css', '-webkit-text-stroke-color', 'rgb(255, 255, 255)');
		// The front copy is the colour of the field behind it, which is this side's own team colour.
		cy.get('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-face').first()
			.should('have.css', 'color', 'rgb(255, 184, 28)');
		// And the two are laid exactly over one another, or the outline is a drop shadow.
		rectOf('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-edge').then(edge => {
			cy.get('.game-card-reveal-opening-name.is-home .game-card-reveal-opening-name-face').first()
				.should($face => {
					const box = $face[0].getBoundingClientRect();
					expect(box.left).to.be.closeTo(edge.left, 0.1);
					expect(box.top).to.be.closeTo(edge.top, 0.1);
				});
		});
	});

	// Dead centre of its own half, which is where the tricode it precedes sits — the crest slots at 25%
	// and 75%, on the centre line. That placement is what makes this read as the naming rather than as
	// a label on the scene before it, and it was a corner caption twice before somebody had to say so.
	it('centres each name on the slot the tricode uses', () => {
		cy.mount(<Harness />);
		// Pinned to the naming's own frame: the entry drifts in from its outer side, so read unscrubbed
		// this measures a name still 20px short of the slot it is arriving at.
		scrubTo(sceneMs(nameScene));
		rectOf('.game-card').then(card => {
			([['away', 0.25], ['home', 0.75]] as const).forEach(([side, slot]) => {
				rectOf(`.game-card-reveal-opening-name.is-${side} .game-card-reveal-opening-name-type`).then(type => {
					expect((type.left + type.right) / 2, `${side} on its slot`)
						.to.be.closeTo(card.left + card.width * slot, 1);
					expect((type.top + type.bottom) / 2, `${side} on the centre line`)
						.to.be.closeTo(card.top + card.height / 2, 1);
				});
			});
		});
	});

	// The fit, which several attempts at this got wrong. Two reasons, and both are in the assertion
	// now: an advance is a property of the letters and not of their number, so a count-based size
	// clipped "COMMANDERS" while "MARLINS" had room to spare; and the seam leans, so a box-width check
	// passes lines that visibly cross it. Measured against the seam at each line's own height.
	([
		['Miami Marlins', 'Boston Celtics'],
		['Washington Commanders', 'Los Angeles Chargers'],
		['Portland Trail Blazers', 'Massachusetts Minutemen'],
		['Minnesota Timberwolves', 'Milwaukee Bucks'],
		['Barcelona', 'Juventus'],
	] as const).forEach(([awayName, homeName]) => {
		it(`keeps every line clear of the seam: ${awayName} v ${homeName}`, () => {
			cy.mount(<Harness awayName={awayName} homeName={homeName} />);
			awaitCrests();
			scrubTo(sceneMs(nameScene));
			cy.get('.game-card-reveal-opening-name').should($boxes => {
				[...$boxes].forEach(box => {
					const away = box.classList.contains('is-away');
					const rect = box.getBoundingClientRect();
					const lean = parseFloat(getComputedStyle(box.closest('.game-card-reveal')!)
						.getPropertyValue('--reveal-lean'));
					[...box.querySelectorAll('.game-card-reveal-opening-name-edge')].forEach(line => {
						const ink = line.getBoundingClientRect();
						const mid = ink.top + ink.height / 2 - rect.top;
						// Where the seam crosses this box at this line's own height. Against a half it
						// leaves the box by a lean at the top and comes back inside it by a lean at the
						// bottom, so a lower line has less room than a higher one.
						const seam = (away ? rect.width + lean : lean) - (2 * lean * mid) / rect.height;
						const past = away ? ink.right - rect.left - seam : seam - (ink.left - rect.left);
						expect(past, `${line.textContent} clear of the seam`).to.be.lessThan(0);
					});
				});
			});
		});
	});

	// Its own scene rather than a caption on the one before it, which is the whole point of the beat:
	// the crests hold the colour on their own, and then they leave it and the naming takes it. What
	// this pins is that the two are never up together at either end — an overlap in the middle is the
	// handover and is meant to be there, but a name on the crests' own frame would be the old design
	// back, and a crest on the naming's frame would make it a caption again.
	it('gives the naming a scene of its own, after the crests have left the field', () => {
		cy.mount(<Harness />);
		awaitCrests();

		// The crests' own frame: they hold the colour, and nothing is named yet.
		scrubTo(sceneMs(crestScene));
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '1');
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');

		// The naming's own frame: the field is theirs and the crests have gone.
		scrubTo(sceneMs(nameScene));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '1');
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '0');
	});

	// And the colour underneath does not change between them — the fields are the background both
	// scenes are built on, which is what lets the handover happen without a cut.
	it('holds the same colour field across both scenes', () => {
		cy.mount(<Harness />);
		awaitCrests();

		scrubTo(sceneMs(crestScene));
		fieldColour().then(during => {
			scrubTo(sceneMs(nameScene));
			fieldColour().should('equal', during);
		});
	});
});
